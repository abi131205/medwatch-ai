import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import { signalsTable } from "@workspace/db";
import { eq, and, gte, lte, ilike, inArray, sql, desc } from "drizzle-orm";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { runClusterDetection } from "../lib/clusterDetection";

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
    const {
      risk_level, category, source_type, location_district, location_type,
      from_date, to_date, search,
      limit = "100", offset = "0"
    } = req.query as Record<string, string>;

    let query = db.select().from(signalsTable).$dynamic();

    const conditions = [];

    // Support comma-separated risk levels (e.g. "critical,high")
    if (risk_level) {
      const levels = risk_level.split(",").map(s => s.trim()).filter(Boolean);
      if (levels.length === 1) {
        conditions.push(eq(signalsTable.risk_level, levels[0]));
      } else if (levels.length > 1) {
        conditions.push(inArray(signalsTable.risk_level, levels));
      }
    }

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
      { raw_text: "Patient reported severe dizziness after taking Metformin 500mg at Raichur PHC. Doctor advised monitoring.", location_district: "Raichur", location_type: "rural", risk_level: "medium", category: "adr", drug_name: "Metformin", source_type: "whatsapp", nlp_summary: "Patient experienced dizziness after Metformin administration. Monitoring advised." },
      { raw_text: "Victoria Hospital Bengaluru - post-surgery infection in Ward 3. Two patients with similar symptoms.", location_district: "Bengaluru", location_type: "urban", risk_level: "high", category: "hospital_issue", hospital_name: "Victoria Hospital", source_type: "hospital_form", nlp_summary: "Post-surgical infection cluster at Victoria Hospital. Immediate investigation needed." },
      { raw_text: "Multiple children fever and rash near Bellary. PHC overwhelmed. Possible outbreak.", location_district: "Bellary", location_type: "rural", risk_level: "critical", category: "outbreak_signal", source_type: "field_worker", nlp_summary: "Potential outbreak in Bellary. Multiple pediatric cases. PHC capacity exceeded." },
      { raw_text: "Azithromycin skin reaction at Manipal Hospital Bengaluru. Patient stopped medication.", location_district: "Bengaluru", location_type: "urban", risk_level: "medium", category: "adr", drug_name: "Azithromycin", hospital_name: "Manipal Hospital", source_type: "social_media", nlp_summary: "ADR to Azithromycin. Skin reaction on day 3. Medication discontinued." },
      { raw_text: "Paracetamol overdose at Hubli government hospital. Child given wrong dose.", location_district: "Hubli", location_type: "urban", risk_level: "high", category: "treatment_complication", drug_name: "Paracetamol", hospital_name: "Hubli Government Hospital", source_type: "hospital_form", nlp_summary: "Paracetamol overdose in pediatric patient. Incorrect dosage. Hospital treatment ongoing." },
      { raw_text: "Insulin shock case at Raichur District Hospital. Third incident this week. Systemic failure suspected.", location_district: "Raichur", location_type: "rural", risk_level: "critical", category: "treatment_complication", drug_name: "Insulin", hospital_name: "Raichur District Hospital", source_type: "field_worker", nlp_summary: "Third insulin shock at Raichur District Hospital this week. Systemic medication error pattern." },
      { raw_text: "Waterborne illness cluster in Davangere. 8 villagers hospitalized. Diarrhoea and vomiting.", location_district: "Davangere", location_type: "rural", risk_level: "critical", category: "outbreak_signal", source_type: "field_worker", nlp_summary: "Waterborne outbreak in Davangere. 8 hospitalizations. Urgent sanitation intervention needed." },
      { raw_text: "Diclofenac gastric bleeding case at Mysuru City Hospital. Patient in ICU.", location_district: "Mysuru", location_type: "urban", risk_level: "critical", category: "adr", drug_name: "Diclofenac", hospital_name: "Mysuru City Hospital", source_type: "hospital_form", nlp_summary: "Severe gastric bleeding after Diclofenac. ICU admission. Critical ADR event." },
      { raw_text: "Amoxicillin allergic reaction at Kolar PHC. Anaphylaxis suspected. Emergency treatment given.", location_district: "Kolar", location_type: "rural", risk_level: "high", category: "adr", drug_name: "Amoxicillin", source_type: "field_worker", nlp_summary: "Anaphylaxis suspected after Amoxicillin at Kolar PHC. Emergency treatment provided." },
      { raw_text: "Wrong blood group transfusion at Mangaluru KMC. Patient critical. Family filing complaint.", location_district: "Mangaluru", location_type: "urban", risk_level: "critical", category: "hospital_issue", hospital_name: "KMC Hospital", source_type: "social_media", nlp_summary: "Wrong blood group transfusion at KMC Mangaluru. Patient critical. Serious hospital error." },
    ];

    const template = templates[Math.floor(Math.random() * templates.length)];

    const [saved] = await db.insert(signalsTable).values({
      raw_text: template.raw_text,
      source_type: template.source_type,
      location_district: template.location_district,
      location_type: template.location_type,
      reporter_type: "system",
      drug_name: ("drug_name" in template ? template.drug_name : null) || null,
      hospital_name: ("hospital_name" in template ? template.hospital_name : null) || null,
      risk_level: template.risk_level,
      category: template.category,
      extracted_entities: JSON.stringify({
        drugs: ("drug_name" in template && template.drug_name) ? [template.drug_name] : [],
        symptoms: ["adverse event"],
        hospitals: ("hospital_name" in template && template.hospital_name) ? [template.hospital_name] : [],
        locations: [template.location_district],
      }),
      nlp_summary: template.nlp_summary,
      recommended_action: "Monitor situation and escalate to district health officer if condition worsens.",
      status: "new",
    }).returning();

    res.json(saved);
  } catch (err) {
    req.log.error(err, "Error simulating signal");
    res.status(500).json({ error: "Failed to simulate signal" });
  }
});

// POST /api/signals/bulk-simulate
router.post("/bulk-simulate", async (req: Request, res: Response) => {
  try {
    const { source_type = "whatsapp", district = "Bengaluru", count = 5 } = req.body;
    const numCount = Math.min(Math.max(1, parseInt(String(count), 10)), 10);

    const KARNATAKA_DISTRICTS = [
      "Bengaluru", "Raichur", "Mysuru", "Hubli", "Mangaluru",
      "Bellary", "Davangere", "Kolar", "Bidar", "Vijayapura",
      "Belagavi", "Dharwad", "Tumkur", "Hassan", "Shimoga",
    ];

    const templatesByDistrict: Record<string, { text: string; drug?: string; hospital?: string; risk: string; category: string }[]> = {
      default: [
        { text: `Patient critically ill after {drug} administered at {district} hospital. Family reports no prior allergies.`, drug: "Metformin", risk: "critical", category: "adr" },
        { text: `Outbreak of fever in {district}. Multiple children affected. PHC overwhelmed with cases.`, risk: "critical", category: "outbreak_signal" },
        { text: `Wrong medication given at {district} government hospital. Patient in serious condition.`, hospital: `${district} Government Hospital`, risk: "high", category: "hospital_issue" },
        { text: `{drug} causing severe reaction in {district}. Three cases in last 24 hours. Doctor alerted.`, drug: "Amoxicillin", risk: "high", category: "adr" },
        { text: `Contaminated medicine batch distributed in {district}. Multiple patients reporting symptoms.`, risk: "critical", category: "outbreak_signal" },
        { text: `Post-surgical infection cluster at {district} regional hospital. Infection control team called.`, hospital: `${district} Regional Hospital`, risk: "critical", category: "hospital_issue" },
        { text: `{drug} overdose suspected at {district} PHC. Child patient. Doctors attending.`, drug: "Paracetamol", risk: "high", category: "treatment_complication" },
        { text: `Diarrhea and vomiting spreading rapidly in {district} village. Waterborne illness suspected.`, risk: "high", category: "outbreak_signal" },
      ],
    };

    const drugs = ["Metformin", "Paracetamol", "Amoxicillin", "Diclofenac", "Insulin", "Cetirizine", "Azithromycin", "Omeprazole"];
    const riskWeighted = ["critical", "critical", "critical", "high", "high", "high", "medium", "low"];

    const inserted = [];
    const targetDistrict = KARNATAKA_DISTRICTS.includes(district) ? district : "Bengaluru";
    const templates = templatesByDistrict[targetDistrict] || templatesByDistrict.default;

    for (let i = 0; i < numCount; i++) {
      const tmpl = templates[i % templates.length];
      const drug = tmpl.drug || drugs[Math.floor(Math.random() * drugs.length)];
      const risk = riskWeighted[Math.floor(Math.random() * riskWeighted.length)];
      const rawText = tmpl.text
        .replace(/{drug}/g, drug)
        .replace(/{district}/g, targetDistrict);

      const [saved] = await db.insert(signalsTable).values({
        raw_text: rawText,
        source_type: source_type || "whatsapp",
        location_district: targetDistrict,
        location_type: ["Bengaluru", "Mysuru", "Hubli", "Mangaluru"].includes(targetDistrict) ? "urban" : "rural",
        reporter_type: source_type === "field_worker" ? "field_worker" : "system",
        drug_name: drug || null,
        hospital_name: tmpl.hospital || null,
        risk_level: risk,
        category: tmpl.category,
        extracted_entities: JSON.stringify({
          drugs: drug ? [drug] : [],
          symptoms: ["adverse event", "reaction"],
          hospitals: tmpl.hospital ? [tmpl.hospital] : [],
          locations: [targetDistrict],
        }),
        nlp_summary: `Signal from ${source_type} in ${targetDistrict}. Risk: ${risk}. Immediate review recommended.`,
        recommended_action: `Escalate to ${targetDistrict} district health officer. Monitor for cluster formation.`,
        status: "new",
      }).returning();

      inserted.push(saved);
    }

    // Run cluster detection after bulk insert
    const alertResult = await runClusterDetection();

    res.json({
      inserted: inserted.length,
      alerts_triggered: alertResult.count,
      signals: inserted,
    });
  } catch (err) {
    req.log.error(err, "Error bulk simulating signals");
    res.status(500).json({ error: "Failed to bulk simulate signals" });
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
