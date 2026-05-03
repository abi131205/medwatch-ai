import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import { signalsTable } from "@workspace/db";
import { eq, and, gte, lte, ilike, inArray, desc } from "drizzle-orm";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { runClusterDetection } from "../lib/clusterDetection";

const router = Router();

const SYSTEM_PROMPT = `You are a pharmacovigilance AI assistant for India's patient safety monitoring system.
Analyze the given patient safety report and respond ONLY with a valid JSON object (no markdown) with this exact structure:
{
  "risk_level": "critical|high|medium|low",
  "category": "adr|hospital_issue|outbreak_signal|treatment_complication",
  "sentiment": "negative|neutral|positive",
  "sentiment_score": -0.95,
  "confidence_score": 0.87,
  "extracted_entities": {
    "drugs": ["list of drug names"],
    "symptoms": ["list of symptoms"],
    "hospitals": ["list of hospitals"],
    "locations": ["list of locations"]
  },
  "pii_detected": true,
  "pii_types": ["name","phone_number","email","age","address"],
  "pii_description": "Brief description of what PII was found",
  "safety_flags": ["adverse_drug_reaction","hospitalization_required","outbreak_suspected","public_health_risk","medication_error"],
  "reasoning": "2-sentence explanation of why this risk level was assigned",
  "nlp_summary": "2-sentence plain English summary of the safety concern",
  "recommended_action": "1-2 sentence recommended response action for health officials"
}
Risk rules: critical=life-threatening/death/outbreak 3+ cases; high=serious ADR/hospitalization; medium=moderate ADR/2 linked cases; low=mild ADR/single complaint.
Sentiment: negative if complaint/harm, neutral if inquiry, positive if resolved/good outcome.
PII: check for patient names, phone numbers, addresses, emails, specific ages in the report.`;

router.get("/", async (req: Request, res: Response) => {
  try {
    const { risk_level, category, source_type, location_district, location_type, from_date, to_date, search, pii_only, limit = "100", offset = "0" } = req.query as Record<string, string>;
    let query = db.select().from(signalsTable).$dynamic();
    const conditions = [];
    if (risk_level) {
      const levels = risk_level.split(",").map(s => s.trim()).filter(Boolean);
      if (levels.length === 1) conditions.push(eq(signalsTable.risk_level, levels[0]));
      else if (levels.length > 1) conditions.push(inArray(signalsTable.risk_level, levels));
    }
    if (category) conditions.push(eq(signalsTable.category, category));
    if (source_type) conditions.push(eq(signalsTable.source_type, source_type));
    if (location_district) conditions.push(eq(signalsTable.location_district, location_district));
    if (location_type) conditions.push(eq(signalsTable.location_type, location_type));
    if (from_date) conditions.push(gte(signalsTable.created_at, new Date(from_date)));
    if (to_date) conditions.push(lte(signalsTable.created_at, new Date(to_date)));
    if (search) conditions.push(ilike(signalsTable.raw_text, `%${search}%`));
    if (pii_only === "1") conditions.push(eq(signalsTable.pii_detected, 1));
    if (conditions.length > 0) query = query.where(and(...conditions)) as typeof query;
    query = query.orderBy(desc(signalsTable.created_at)) as typeof query;
    const allSignals = await query;
    const total = allSignals.length;
    const lim = parseInt(limit, 10);
    const off = parseInt(offset, 10);
    res.json({ signals: allSignals.slice(off, off + lim), total });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Failed" }); }
});

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
    res.json({ total_today: todaySignals.length, critical_count: allSignals.filter(s => s.risk_level === "critical").length, districts_affected: districts.size, signals_last_hour: lastHourSignals.length, by_risk: byRisk, by_category: byCategory, by_location_type: byLocationType });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Failed" }); }
});

router.get("/timeline", async (req: Request, res: Response) => {
  try {
    const { from, to, source, risk } = req.query as Record<string, string>;
    const conditions = [];
    if (from) conditions.push(gte(signalsTable.created_at, new Date(from)));
    if (to) conditions.push(lte(signalsTable.created_at, new Date(to)));
    if (source) conditions.push(eq(signalsTable.source_type, source));
    if (risk) conditions.push(eq(signalsTable.risk_level, risk));
    let query = db.select().from(signalsTable).$dynamic();
    if (conditions.length > 0) query = query.where(and(...conditions)) as typeof query;
    query = query.orderBy(desc(signalsTable.created_at)) as typeof query;
    const signals = await query;

    const grouped: Record<string, typeof signals> = {};
    for (const s of signals) {
      const day = new Date(s.created_at).toISOString().split("T")[0];
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push(s);
    }

    const days = Object.keys(grouped).sort((a, b) => b.localeCompare(a)).map(date => ({
      date,
      count: grouped[date].length,
      signals: grouped[date],
    }));

    res.json({ days, total: signals.length });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Failed" }); }
});

router.post("/analyze", async (req: Request, res: Response) => {
  try {
    const { raw_text, source_type, location_district, location_type, reporter_type, drug_name, hospital_name, incident_date } = req.body;
    if (!raw_text || raw_text.length < 10) return res.status(400).json({ error: "raw_text too short" });

    let nlpResult: any = {
      risk_level: "medium", category: "adr", sentiment: "negative", sentiment_score: -0.5, confidence_score: 0.75,
      extracted_entities: { drugs: drug_name ? [drug_name] : [], symptoms: [], hospitals: hospital_name ? [hospital_name] : [], locations: location_district ? [location_district] : [] },
      pii_detected: false, pii_types: [], pii_description: null, safety_flags: ["adverse_drug_reaction"],
      reasoning: "Patient safety report received. Manual review recommended.",
      nlp_summary: "Patient safety report received. Manual review recommended.",
      recommended_action: "Review the report and follow standard pharmacovigilance protocols.",
    };

    try {
      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: raw_text }],
      });
      const content = message.content[0];
      if (content.type === "text") nlpResult = JSON.parse(content.text);
    } catch (aiErr) { req.log.warn(aiErr, "AI analysis failed, using fallback"); }

    const [saved] = await db.insert(signalsTable).values({
      raw_text, source_type: source_type || "direct_report",
      location_district: location_district || null, location_type: location_type || null,
      reporter_type: reporter_type || null,
      drug_name: drug_name || nlpResult.extracted_entities?.drugs?.[0] || null,
      hospital_name: hospital_name || nlpResult.extracted_entities?.hospitals?.[0] || null,
      incident_date: incident_date || null,
      risk_level: nlpResult.risk_level, category: nlpResult.category,
      extracted_entities: JSON.stringify(nlpResult.extracted_entities),
      nlp_summary: nlpResult.nlp_summary, recommended_action: nlpResult.recommended_action,
      status: "new",
      sentiment: nlpResult.sentiment || "negative",
      sentiment_score: typeof nlpResult.sentiment_score === "number" ? nlpResult.sentiment_score : -0.5,
      confidence_score: typeof nlpResult.confidence_score === "number" ? nlpResult.confidence_score : 0.75,
      pii_detected: nlpResult.pii_detected ? 1 : 0,
      pii_types: JSON.stringify(nlpResult.pii_types || []),
      pii_description: nlpResult.pii_description || null,
      safety_flags: JSON.stringify(nlpResult.safety_flags || []),
      reasoning: nlpResult.reasoning || null,
    }).returning();
    res.json(saved);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Failed to analyze signal" }); }
});

router.post("/simulate", async (req: Request, res: Response) => {
  try {
    const templates = [
      { raw_text: "Patient reported severe dizziness after taking Metformin 500mg at Raichur PHC. Doctor advised monitoring.", location_district: "Raichur", location_type: "rural", risk_level: "medium", category: "adr", drug_name: "Metformin", source_type: "whatsapp", sentiment: "negative", sentiment_score: -0.65, confidence_score: 0.82 },
      { raw_text: "Victoria Hospital Bengaluru - post-surgery infection in Ward 3. Two patients with similar symptoms.", location_district: "Bengaluru", location_type: "urban", risk_level: "high", category: "hospital_issue", hospital_name: "Victoria Hospital", source_type: "hospital_form", sentiment: "negative", sentiment_score: -0.88, confidence_score: 0.91 },
      { raw_text: "Multiple children fever and rash near Bellary. PHC overwhelmed. Possible outbreak.", location_district: "Bellary", location_type: "rural", risk_level: "critical", category: "outbreak_signal", source_type: "field_worker", sentiment: "negative", sentiment_score: -0.95, confidence_score: 0.89 },
      { raw_text: "Azithromycin skin reaction at Manipal Hospital Bengaluru. Patient stopped medication.", location_district: "Bengaluru", location_type: "urban", risk_level: "medium", category: "adr", drug_name: "Azithromycin", hospital_name: "Manipal Hospital", source_type: "social_media", sentiment: "negative", sentiment_score: -0.62, confidence_score: 0.78 },
      { raw_text: "Paracetamol overdose at Hubli government hospital. Child given wrong dose.", location_district: "Hubli", location_type: "urban", risk_level: "high", category: "treatment_complication", drug_name: "Paracetamol", hospital_name: "Hubli Government Hospital", source_type: "hospital_form", sentiment: "negative", sentiment_score: -0.91, confidence_score: 0.93 },
      { raw_text: "Insulin shock case at Raichur District Hospital. Third incident this week.", location_district: "Raichur", location_type: "rural", risk_level: "critical", category: "treatment_complication", drug_name: "Insulin", hospital_name: "Raichur District Hospital", source_type: "field_worker", sentiment: "negative", sentiment_score: -0.97, confidence_score: 0.94 },
      { raw_text: "Waterborne illness cluster in Davangere. 8 villagers hospitalized. Diarrhoea and vomiting.", location_district: "Davangere", location_type: "rural", risk_level: "critical", category: "outbreak_signal", source_type: "field_worker", sentiment: "negative", sentiment_score: -0.93, confidence_score: 0.88 },
      { raw_text: "Diclofenac gastric bleeding case at Mysuru City Hospital. Patient in ICU.", location_district: "Mysuru", location_type: "urban", risk_level: "critical", category: "adr", drug_name: "Diclofenac", hospital_name: "Mysuru City Hospital", source_type: "hospital_form", sentiment: "negative", sentiment_score: -0.96, confidence_score: 0.92 },
      { raw_text: "Amoxicillin allergic reaction at Kolar PHC. Anaphylaxis suspected.", location_district: "Kolar", location_type: "rural", risk_level: "high", category: "adr", drug_name: "Amoxicillin", source_type: "field_worker", sentiment: "negative", sentiment_score: -0.84, confidence_score: 0.86 },
      { raw_text: "Wrong blood group transfusion at Mangaluru KMC. Patient critical. Family filing complaint.", location_district: "Mangaluru", location_type: "urban", risk_level: "critical", category: "hospital_issue", hospital_name: "KMC Hospital", source_type: "social_media", sentiment: "negative", sentiment_score: -0.98, confidence_score: 0.95 },
    ];
    const t = templates[Math.floor(Math.random() * templates.length)];
    const flags = t.risk_level === "critical" ? ["adverse_drug_reaction", "hospitalization_required"] : ["adverse_drug_reaction"];
    const [saved] = await db.insert(signalsTable).values({
      raw_text: t.raw_text, source_type: t.source_type,
      location_district: t.location_district, location_type: t.location_type,
      reporter_type: "system",
      drug_name: ("drug_name" in t ? (t as any).drug_name : null) || null,
      hospital_name: ("hospital_name" in t ? (t as any).hospital_name : null) || null,
      risk_level: t.risk_level, category: t.category,
      extracted_entities: JSON.stringify({ drugs: ("drug_name" in t ? [(t as any).drug_name] : []).filter(Boolean), symptoms: ["adverse event"], hospitals: ("hospital_name" in t ? [(t as any).hospital_name] : []).filter(Boolean), locations: [t.location_district] }),
      nlp_summary: `Signal from ${t.source_type} in ${t.location_district}. Risk: ${t.risk_level}.`,
      recommended_action: "Monitor situation and escalate to district health officer if condition worsens.",
      status: "new",
      sentiment: t.sentiment, sentiment_score: t.sentiment_score, confidence_score: t.confidence_score,
      pii_detected: 0, pii_types: "[]", safety_flags: JSON.stringify(flags),
      reasoning: `${t.risk_level === "critical" ? "Critical" : "High"} risk signal from ${t.location_district}. Immediate review required.`,
      project_id: Math.floor(Math.random() * 3) + 1,
    }).returning();
    res.json(saved);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Failed" }); }
});

router.post("/bulk-simulate", async (req: Request, res: Response) => {
  try {
    const { source_type = "whatsapp", district = "Bengaluru", count = 5 } = req.body;
    const numCount = Math.min(Math.max(1, parseInt(String(count), 10)), 10);
    const KARNATAKA_DISTRICTS = ["Bengaluru", "Raichur", "Mysuru", "Hubli", "Mangaluru", "Bellary", "Davangere", "Kolar", "Bidar", "Vijayapura", "Belagavi", "Dharwad", "Tumkur", "Hassan", "Shimoga"];
    const drugs = ["Metformin", "Paracetamol", "Amoxicillin", "Diclofenac", "Insulin", "Cetirizine", "Azithromycin", "Omeprazole"];
    const riskWeighted = ["critical", "critical", "critical", "high", "high", "high", "medium", "low"];
    const targetDistrict = KARNATAKA_DISTRICTS.includes(district) ? district : "Bengaluru";
    const templates = [
      { text: `Patient critically ill after {drug} administered at {district} hospital.`, risk: "critical", category: "adr", flags: ["adverse_drug_reaction", "hospitalization_required"] },
      { text: `Outbreak of fever in {district}. Multiple children affected.`, risk: "critical", category: "outbreak_signal", flags: ["outbreak_suspected", "public_health_risk"] },
      { text: `Wrong medication given at {district} government hospital.`, risk: "high", category: "hospital_issue", flags: ["medication_error"] },
      { text: `{drug} causing severe reaction in {district}. Three cases in 24 hours.`, risk: "high", category: "adr", flags: ["adverse_drug_reaction"] },
      { text: `Contaminated medicine batch in {district}. Multiple patients reporting symptoms.`, risk: "critical", category: "outbreak_signal", flags: ["public_health_risk"] },
    ];
    const inserted = [];
    for (let i = 0; i < numCount; i++) {
      const tmpl = templates[i % templates.length];
      const drug = drugs[Math.floor(Math.random() * drugs.length)];
      const rawText = tmpl.text.replace(/{drug}/g, drug).replace(/{district}/g, targetDistrict);
      const risk = riskWeighted[Math.floor(Math.random() * riskWeighted.length)];
      const [saved] = await db.insert(signalsTable).values({
        raw_text: rawText, source_type: source_type || "whatsapp",
        location_district: targetDistrict,
        location_type: ["Bengaluru", "Mysuru", "Hubli", "Mangaluru"].includes(targetDistrict) ? "urban" : "rural",
        reporter_type: "system", drug_name: drug, risk_level: risk, category: tmpl.category,
        extracted_entities: JSON.stringify({ drugs: [drug], symptoms: ["adverse event"], hospitals: [], locations: [targetDistrict] }),
        nlp_summary: `Bulk signal from ${source_type} in ${targetDistrict}. Risk: ${risk}.`,
        recommended_action: `Escalate to ${targetDistrict} district health officer.`,
        status: "new",
        sentiment: "negative", sentiment_score: -(Math.random() * 0.5 + 0.4), confidence_score: Math.round((Math.random() * 0.2 + 0.75) * 100) / 100,
        pii_detected: 0, pii_types: "[]", safety_flags: JSON.stringify(tmpl.flags),
        reasoning: `Bulk-simulated ${risk} signal for demo cluster detection testing.`,
        project_id: Math.floor(Math.random() * 3) + 1,
      }).returning();
      inserted.push(saved);
    }
    const alertResult = await runClusterDetection();
    res.json({ inserted: inserted.length, alerts_triggered: alertResult.count, signals: inserted });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Failed" }); }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    const [signal] = await db.select().from(signalsTable).where(eq(signalsTable.id, id));
    if (!signal) return res.status(404).json({ error: "Signal not found" });
    res.json(signal);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Failed" }); }
});

router.patch("/:id/status", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    const { status } = req.body;
    if (!["new", "reviewed", "escalated"].includes(status)) return res.status(400).json({ error: "Invalid status" });
    const [updated] = await db.update(signalsTable).set({ status }).where(eq(signalsTable.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "Signal not found" });
    res.json(updated);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Failed" }); }
});

export default router;
