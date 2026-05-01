import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import { signalsTable, alertsTable } from "@workspace/db";
import { eq, and, gte, lte, ilike, sql, desc } from "drizzle-orm";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const router = Router();

const SYSTEM_PROMPT = `You are a pharmacovigilance AI assistant for India's patient safety monitoring system. 
Analyze the given patient safety report and respond ONLY with a valid JSON object (no markdown, no explanation) with this exact structure:
{
  "risk_level": "critical|high|medium|low",
  "category": "adr|hospital_issue|outbreak_signal|treatment_complication",
  "extracted_entities": {
    "drugs": ["list of drug names mentioned"],
    "symptoms": ["list of symptoms mentioned"],
    "hospitals": ["list of hospital/clinic names mentioned"],
    "locations": ["list of locations mentioned"]
  },
  "nlp_summary": "2-sentence plain English summary of the safety concern",
  "recommended_action": "1-2 sentence recommended response action for health officials"
}
Risk classification rules:
- critical: life-threatening ADR, death reported, outbreak with 3+ cases
- high: serious ADR requiring hospitalization, systemic hospital failure
- medium: moderate ADR, repeated hospital complaints, 2 linked cases
- low: mild ADR, single complaint, general feedback`;

// GET /api/signals
router.get("/", async (req: Request, res: Response) => {
  try {
    const { risk_level, category, source_type, location_district, location_type, from_date, to_date, search, limit = "100", offset = "0" } = req.query as Record<string, string>;

    let query = db.select().from(signalsTable).$dynamic();

    const conditions = [];
    if (risk_level) conditions.push(eq(signalsTable.risk_level, risk_level));
    if (category) conditions.push(eq(signalsTable.category, category));
    if (source_type) conditions.push(eq(signalsTable.source_type, source_type));
    if (location_district) conditions.push(eq(signalsTable.location_district, location_district));
    if (location_type) conditions.push(eq(signalsTable.location_type, location_type));
    if (from_date) conditions.push(gte(signalsTable.created_at, new Date(from_date)));
    if (to_date) conditions.push(lte(signalsTable.created_at, new Date(to_date)));
    if (search) conditions.push(ilike(signalsTable.raw_text, `%${search}%`));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    query = query.orderBy(desc(signalsTable.created_at)) as typeof query;

    const allSignals = await query;
    const total = allSignals.length;

    const lim = parseInt(limit, 10);
    const off = parseInt(offset, 10);
    const signals = allSignals.slice(off, off + lim);

    res.json({ signals, total });
  } catch (err) {
    req.log.error(err, "Error fetching signals");
    res.status(500).json({ error: "Failed to fetch signals" });
  }
});

// GET /api/signals/stats/summary
router.get("/stats/summary", async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const [allSignals, todaySignals, lastHourSignals] = await Promise.all([
      db.select().from(signalsTable),
      db.select().from(signalsTable).where(gte(signalsTable.created_at, todayStart)),
      db.select().from(signalsTable).where(gte(signalsTable.created_at, oneHourAgo)),
    ]);

    const byRisk = { critical: 0, high: 0, medium: 0, low: 0 };
    const byCategory = { adr: 0, hospital_issue: 0, outbreak_signal: 0, treatment_complication: 0 };
    const byLocationType = { urban: 0, rural: 0 };
    const districts = new Set<string>();

    for (const s of allSignals) {
      if (s.risk_level && s.risk_level in byRisk) byRisk[s.risk_level as keyof typeof byRisk]++;
      if (s.category && s.category in byCategory) byCategory[s.category as keyof typeof byCategory]++;
      if (s.location_type === "urban") byLocationType.urban++;
      if (s.location_type === "rural") byLocationType.rural++;
      if (s.location_district) districts.add(s.location_district);
    }

    const criticalCount = allSignals.filter(s => s.risk_level === "critical").length;

    res.json({
      total_today: todaySignals.length,
      critical_count: criticalCount,
      districts_affected: districts.size,
      signals_last_hour: lastHourSignals.length,
      by_risk: byRisk,
      by_category: byCategory,
      by_location_type: byLocationType,
    });
  } catch (err) {
    req.log.error(err, "Error fetching summary");
    res.status(500).json({ error: "Failed to fetch summary" });
  }
});

// POST /api/signals/analyze
router.post("/analyze", async (req: Request, res: Response) => {
  try {
    const { raw_text, source_type, location_district, location_type, reporter_type, drug_name, hospital_name, incident_date } = req.body;

    if (!raw_text || raw_text.length < 10) {
      return res.status(400).json({ error: "raw_text is required and must be at least 10 characters" });
    }

    let nlpResult = {
      risk_level: "medium",
      category: "adr",
      extracted_entities: { drugs: drug_name ? [drug_name] : [], symptoms: [], hospitals: hospital_name ? [hospital_name] : [], locations: location_district ? [location_district] : [] },
      nlp_summary: "Patient safety report received. Manual review recommended.",
      recommended_action: "Review the report and follow standard pharmacovigilance protocols.",
    };

    try {
      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: raw_text }],
      });

      const content = message.content[0];
      if (content.type === "text") {
        const parsed = JSON.parse(content.text);
        nlpResult = parsed;
      }
    } catch (aiErr) {
      req.log.warn(aiErr, "AI analysis failed, using fallback");
    }

    const [saved] = await db.insert(signalsTable).values({
      raw_text,
      source_type: source_type || "direct_report",
      location_district: location_district || null,
      location_type: location_type || null,
      reporter_type: reporter_type || null,
      drug_name: drug_name || nlpResult.extracted_entities?.drugs?.[0] || null,
      hospital_name: hospital_name || nlpResult.extracted_entities?.hospitals?.[0] || null,
      incident_date: incident_date || null,
      risk_level: nlpResult.risk_level,
      category: nlpResult.category,
      extracted_entities: JSON.stringify(nlpResult.extracted_entities),
      nlp_summary: nlpResult.nlp_summary,
      recommended_action: nlpResult.recommended_action,
      status: "new",
    }).returning();

    res.json(saved);
  } catch (err) {
    req.log.error(err, "Error analyzing signal");
    res.status(500).json({ error: "Failed to analyze signal" });
  }
});

// POST /api/signals/simulate
router.post("/simulate", async (req: Request, res: Response) => {
  try {
    const templates = [
      { raw_text: "Patient reported severe dizziness after taking Metformin 500mg at Raichur PHC. Doctor advised monitoring.", location_district: "Raichur", location_type: "rural", risk_level: "medium", category: "adr", drug_name: "Metformin", source_type: "whatsapp", nlp_summary: "Patient experienced dizziness after Metformin administration. Monitoring advised by physician." },
      { raw_text: "Victoria Hospital Bengaluru - post-surgery infection reported in Ward 3. Two patients affected with similar symptoms.", location_district: "Bengaluru", location_type: "urban", risk_level: "high", category: "hospital_issue", hospital_name: "Victoria Hospital", source_type: "hospital_form", nlp_summary: "Post-surgical infection cluster detected at Victoria Hospital, Bengaluru. Immediate investigation required." },
      { raw_text: "Multiple children reporting rash and fever near Bellary district. Could be outbreak signal. PHC overwhelmed.", location_district: "Bellary", location_type: "rural", risk_level: "critical", category: "outbreak_signal", source_type: "field_worker", nlp_summary: "Potential disease outbreak in Bellary district. Multiple pediatric cases with rash and fever. PHC capacity exceeded." },
      { raw_text: "Azithromycin skin reaction reported at Manipal Hospital Bengaluru. Patient stopped medication.", location_district: "Bengaluru", location_type: "urban", risk_level: "medium", category: "adr", drug_name: "Azithromycin", hospital_name: "Manipal Hospital", source_type: "social_media", nlp_summary: "Adverse drug reaction to Azithromycin. Patient self-discontinued medication after skin reaction." },
      { raw_text: "Paracetamol overdose case at Hubli government hospital. Child given wrong dose by parent.", location_district: "Hubli", location_type: "urban", risk_level: "high", category: "treatment_complication", drug_name: "Paracetamol", hospital_name: "Hubli Government Hospital", source_type: "hospital_form", nlp_summary: "Paracetamol overdose in pediatric patient due to incorrect dosage. Hospital treatment ongoing." },
    ];

    const districts = ["Bengaluru", "Raichur", "Mysuru", "Hubli", "Mangaluru", "Bellary", "Davangere", "Kolar"];
    const sourceTypes = ["social_media", "whatsapp", "hospital_form", "field_worker"];
    const template = templates[Math.floor(Math.random() * templates.length)];
    const district = districts[Math.floor(Math.random() * districts.length)];
    const sourceType = sourceTypes[Math.floor(Math.random() * sourceTypes.length)];

    const [saved] = await db.insert(signalsTable).values({
      raw_text: template.raw_text,
      source_type: template.source_type || sourceType,
      location_district: template.location_district || district,
      location_type: template.location_type || "urban",
      reporter_type: "system",
      drug_name: template.drug_name || null,
      hospital_name: template.hospital_name || null,
      risk_level: template.risk_level,
      category: template.category,
      extracted_entities: JSON.stringify({ drugs: template.drug_name ? [template.drug_name] : [], symptoms: ["fever", "rash"], hospitals: template.hospital_name ? [template.hospital_name] : [], locations: [template.location_district || district] }),
      nlp_summary: template.nlp_summary,
      recommended_action: "Monitor situation closely and escalate to district health officer if condition worsens.",
      status: "new",
    }).returning();

    res.json(saved);
  } catch (err) {
    req.log.error(err, "Error simulating signal");
    res.status(500).json({ error: "Failed to simulate signal" });
  }
});

// GET /api/signals/:id
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const [signal] = await db.select().from(signalsTable).where(eq(signalsTable.id, id));
    if (!signal) return res.status(404).json({ error: "Signal not found" });

    res.json(signal);
  } catch (err) {
    req.log.error(err, "Error fetching signal");
    res.status(500).json({ error: "Failed to fetch signal" });
  }
});

// PATCH /api/signals/:id/status
router.patch("/:id/status", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const { status } = req.body;
    if (!["new", "reviewed", "escalated"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const [updated] = await db.update(signalsTable).set({ status }).where(eq(signalsTable.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "Signal not found" });

    res.json(updated);
  } catch (err) {
    req.log.error(err, "Error updating signal status");
    res.status(500).json({ error: "Failed to update signal status" });
  }
});

export default router;
