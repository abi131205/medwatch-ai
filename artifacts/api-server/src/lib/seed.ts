import { db } from "@workspace/db";
import { signalsTable, alertsTable, projectsTable } from "@workspace/db";
import { sql, isNull } from "drizzle-orm";
import { logger } from "./logger";

const SENTIMENTS = ["negative", "negative", "negative", "negative", "negative", "negative", "negative", "neutral", "neutral", "positive"] as const;
const SAFETY_FLAGS: string[][] = [
  ["adverse_drug_reaction"],
  ["hospitalization_required", "adverse_drug_reaction"],
  ["outbreak_suspected", "public_health_risk"],
  ["medication_error"],
  ["adverse_drug_reaction", "hospitalization_required"],
  [],
  ["public_health_risk"],
  ["adverse_drug_reaction"],
];

function randSentiment() { return SENTIMENTS[Math.floor(Math.random() * SENTIMENTS.length)]; }
function randScore(sentiment: string) {
  if (sentiment === "negative") return -(Math.random() * 0.6 + 0.3);
  if (sentiment === "positive") return Math.random() * 0.5 + 0.2;
  return (Math.random() * 0.4 - 0.2);
}
function randConfidence() { return Math.round((Math.random() * 0.24 + 0.72) * 100) / 100; }
function randPii() { return Math.random() < 0.15 ? 1 : 0; }
function randProjectId() { return Math.floor(Math.random() * 3) + 1; }
function randFlags() { return SAFETY_FLAGS[Math.floor(Math.random() * SAFETY_FLAGS.length)]; }

const seedSignals = [
  {
    raw_text: "My father was given Metformin 500mg at Raichur District Hospital and within 2 hours he had severe vomiting and breathlessness. Doctor said it may be a reaction. Very scary experience.",
    source_type: "whatsapp", location_district: "Raichur", location_type: "rural",
    drug_name: "Metformin", hospital_name: "Raichur District Hospital", reporter_type: "family_member",
    risk_level: "high", category: "adr",
    nlp_summary: "Patient experienced severe vomiting and breathlessness after Metformin administration at Raichur District Hospital. Physician confirmed possible adverse drug reaction.",
    recommended_action: "Report to pharmacovigilance unit and monitor patient for further complications.",
    extracted_entities: JSON.stringify({ drugs: ["Metformin"], symptoms: ["vomiting", "breathlessness"], hospitals: ["Raichur District Hospital"], locations: ["Raichur"] }),
    sentiment: "negative", sentiment_score: -0.88, confidence_score: 0.91,
    pii_detected: 0, pii_types: "[]", safety_flags: JSON.stringify(["adverse_drug_reaction", "hospitalization_required"]),
    reasoning: "Severe ADR symptoms reported within 2 hours of administration. Doctor has confirmed possible adverse reaction which elevates risk to high.",
    project_id: 1,
  },
  {
    raw_text: "Victoria Hospital Bengaluru mein operation ke baad infection ho gaya. 3 patients same ward mein. Koi sun nahi raha. Please help.",
    source_type: "social_media", location_district: "Bengaluru", location_type: "urban",
    hospital_name: "Victoria Hospital", reporter_type: "patient",
    risk_level: "critical", category: "hospital_issue",
    nlp_summary: "Post-surgical infection cluster detected in Victoria Hospital, Bengaluru. Three patients in the same ward affected. Hospital administration unresponsive.",
    recommended_action: "Conduct immediate infection control audit at Victoria Hospital. Isolate affected ward and escalate to Karnataka State Health Department.",
    extracted_entities: JSON.stringify({ drugs: [], symptoms: ["infection"], hospitals: ["Victoria Hospital"], locations: ["Bengaluru"] }),
    sentiment: "negative", sentiment_score: -0.95, confidence_score: 0.89,
    pii_detected: 0, pii_types: "[]", safety_flags: JSON.stringify(["hospitalization_required", "public_health_risk"]),
    reasoning: "Multiple patients affected post-surgery at same facility indicates systemic infection control failure. Critical escalation required.",
    project_id: 2,
  },
  {
    raw_text: "Fever spreading fast in our village near Raichur. 6 children sick this week. Local PHC not responding. Same symptoms - rash and high temperature.",
    source_type: "field_worker", location_district: "Raichur", location_type: "rural",
    reporter_type: "field_worker", risk_level: "critical", category: "outbreak_signal",
    nlp_summary: "Possible disease outbreak in Raichur rural area with 6 pediatric cases presenting rash and high fever. Local PHC capacity appears overwhelmed.",
    recommended_action: "Deploy rapid response team to Raichur village. Conduct epidemiological investigation immediately.",
    extracted_entities: JSON.stringify({ drugs: [], symptoms: ["fever", "rash", "high temperature"], hospitals: [], locations: ["Raichur"] }),
    sentiment: "negative", sentiment_score: -0.92, confidence_score: 0.87,
    pii_detected: 0, pii_types: "[]", safety_flags: JSON.stringify(["outbreak_suspected", "public_health_risk"]),
    reasoning: "Six pediatric cases with identical symptoms in same locality suggests active outbreak. PHC non-response compounds the public health risk.",
    project_id: 3,
  },
  {
    raw_text: "Took Azithromycin prescribed at Manipal Hospital Bengaluru. Severe skin rash on day 3. Never had this before. Stopped taking it.",
    source_type: "social_media", location_district: "Bengaluru", location_type: "urban",
    drug_name: "Azithromycin", hospital_name: "Manipal Hospital", reporter_type: "patient",
    risk_level: "medium", category: "adr",
    nlp_summary: "Patient developed severe skin rash on day 3 of Azithromycin treatment. Medication was self-discontinued.",
    recommended_action: "Document ADR and file report with Manipal Hospital pharmacovigilance cell.",
    extracted_entities: JSON.stringify({ drugs: ["Azithromycin"], symptoms: ["skin rash"], hospitals: ["Manipal Hospital"], locations: ["Bengaluru"] }),
    sentiment: "negative", sentiment_score: -0.65, confidence_score: 0.84,
    pii_detected: 0, pii_types: "[]", safety_flags: JSON.stringify(["adverse_drug_reaction"]),
    reasoning: "Skin rash is a known ADR for Azithromycin. Self-discontinuation without medical advice poses medium risk.",
    project_id: 1,
  },
  {
    raw_text: "Insulin dosage wrong at Hubli government clinic. Patient went into hypoglycemic shock. Family very upset. This is 2nd such case this month.",
    source_type: "hospital_form", location_district: "Hubli", location_type: "urban",
    drug_name: "Insulin", hospital_name: "Hubli Government Clinic", reporter_type: "hospital_staff",
    risk_level: "critical", category: "treatment_complication",
    nlp_summary: "Second insulin dosage error at Hubli Government Clinic resulting in hypoglycemic shock. Pattern of medication errors indicates systemic issue.",
    recommended_action: "Immediate audit of insulin administration protocols at Hubli Government Clinic.",
    extracted_entities: JSON.stringify({ drugs: ["Insulin"], symptoms: ["hypoglycemic shock"], hospitals: ["Hubli Government Clinic"], locations: ["Hubli"] }),
    sentiment: "negative", sentiment_score: -0.97, confidence_score: 0.94,
    pii_detected: 0, pii_types: "[]", safety_flags: JSON.stringify(["medication_error", "hospitalization_required"]),
    reasoning: "Second occurrence of insulin dosage error at same facility. Hypoglycemic shock is life-threatening. Critical systemic failure suspected.",
    project_id: 1,
  },
  {
    raw_text: "Amlodipine se mujhe bohot chakkar aa rahe hain. Mysuru ke doctor ne diya tha BP ke liye. Kya yeh normal hai?",
    source_type: "whatsapp", location_district: "Mysuru", location_type: "urban",
    drug_name: "Amlodipine", reporter_type: "patient", risk_level: "low", category: "adr",
    nlp_summary: "Patient reports dizziness after taking Amlodipine for blood pressure management. Symptom may be a known side effect.",
    recommended_action: "Advise patient to consult prescribing physician. Dizziness is a known side effect of Amlodipine.",
    extracted_entities: JSON.stringify({ drugs: ["Amlodipine"], symptoms: ["dizziness"], hospitals: [], locations: ["Mysuru"] }),
    sentiment: "neutral", sentiment_score: -0.15, confidence_score: 0.76,
    pii_detected: 0, pii_types: "[]", safety_flags: JSON.stringify([]),
    reasoning: "Dizziness is a documented common side effect of Amlodipine. Patient is inquiring rather than reporting severe harm.",
    project_id: 1,
  },
  {
    raw_text: "Multiple complaints received from Bellary villages. Same batch of ORS packets causing stomach pain. Possible contamination. 12 cases today.",
    source_type: "field_worker", location_district: "Bellary", location_type: "rural",
    drug_name: "ORS", reporter_type: "field_worker", risk_level: "critical", category: "outbreak_signal",
    nlp_summary: "12 cases of stomach pain linked to suspected contaminated ORS batch in Bellary villages.",
    recommended_action: "Immediately recall suspect ORS batch from Bellary distribution. Alert CDSCO.",
    extracted_entities: JSON.stringify({ drugs: ["ORS"], symptoms: ["stomach pain"], hospitals: [], locations: ["Bellary"] }),
    sentiment: "negative", sentiment_score: -0.91, confidence_score: 0.88,
    pii_detected: 0, pii_types: "[]", safety_flags: JSON.stringify(["outbreak_suspected", "public_health_risk"]),
    reasoning: "12 cases linked to same product batch strongly suggests contamination. Immediate recall required to prevent further harm.",
    project_id: 3,
  },
  {
    raw_text: "Cetirizine gave my child tremors for 30 mins. Bought from medical store in Kolar. Very frightened. Doctor said possible overdose from wrong label.",
    source_type: "social_media", location_district: "Kolar", location_type: "rural",
    drug_name: "Cetirizine", reporter_type: "family_member", risk_level: "high", category: "adr",
    nlp_summary: "Child experienced 30-minute tremor episode after Cetirizine purchase from a medical store in Kolar. Doctor suspects overdose due to mislabeling.",
    recommended_action: "Inspect medical stores in Kolar for mislabeled Cetirizine products.",
    extracted_entities: JSON.stringify({ drugs: ["Cetirizine"], symptoms: ["tremors"], hospitals: [], locations: ["Kolar"] }),
    sentiment: "negative", sentiment_score: -0.86, confidence_score: 0.82,
    pii_detected: 1, pii_types: JSON.stringify(["age"]), pii_description: "Report mentions child patient without name — age identifier present",
    safety_flags: JSON.stringify(["adverse_drug_reaction", "medication_error"]),
    reasoning: "Pediatric patient with severe neurological symptoms from suspected mislabeled OTC medication. High risk due to vulnerable population.",
    project_id: 1,
  },
  {
    raw_text: "Mangaluru KMC Hospital staff was rude and gave wrong medicine to my mother. When we complained nobody listened. She had to be readmitted.",
    source_type: "social_media", location_district: "Mangaluru", location_type: "urban",
    hospital_name: "KMC Hospital", reporter_type: "family_member", risk_level: "medium", category: "hospital_issue",
    nlp_summary: "Patient received wrong medication at KMC Hospital Mangaluru resulting in readmission.",
    recommended_action: "Initiate formal complaint investigation at KMC Hospital.",
    extracted_entities: JSON.stringify({ drugs: [], symptoms: [], hospitals: ["KMC Hospital"], locations: ["Mangaluru"] }),
    sentiment: "negative", sentiment_score: -0.73, confidence_score: 0.79,
    pii_detected: 1, pii_types: JSON.stringify(["age"]), pii_description: "Reference to 'mother' implies elderly patient",
    safety_flags: JSON.stringify(["medication_error"]),
    reasoning: "Wrong medication leading to readmission indicates hospital dispensing failure. Medium risk due to unclear severity of wrong medication.",
    project_id: 2,
  },
  {
    raw_text: "Davangere area mein paani peekar 4 log beemar pade. Diarrhoea aur ulti. Could be waterborne outbreak near PHC area.",
    source_type: "whatsapp", location_district: "Davangere", location_type: "rural",
    reporter_type: "community_member", risk_level: "high", category: "outbreak_signal",
    nlp_summary: "Four people ill with diarrhea and vomiting after water consumption near PHC area in Davangere.",
    recommended_action: "Collect water samples from affected area for testing. Alert district health officer.",
    extracted_entities: JSON.stringify({ drugs: [], symptoms: ["diarrhea", "vomiting"], hospitals: [], locations: ["Davangere"] }),
    sentiment: "negative", sentiment_score: -0.82, confidence_score: 0.85,
    pii_detected: 0, pii_types: "[]", safety_flags: JSON.stringify(["outbreak_suspected", "public_health_risk"]),
    reasoning: "Multiple cases with identical symptoms after water consumption strongly suggest waterborne outbreak. PHC proximity increases community exposure risk.",
    project_id: 3,
  },
];

const additionalTemplates = [
  { drug: "Paracetamol", symptom: "liver pain", risk: "medium", category: "adr", locType: "urban" },
  { drug: "Atorvastatin", symptom: "muscle weakness", risk: "medium", category: "adr", locType: "urban" },
  { drug: "Amoxicillin", symptom: "allergic reaction", risk: "high", category: "adr", locType: "rural" },
  { drug: "Omeprazole", symptom: "headache and nausea", risk: "low", category: "adr", locType: "urban" },
  { drug: "Metformin", symptom: "lactic acidosis", risk: "critical", category: "adr", locType: "rural" },
  { drug: "Enalapril", symptom: "dry cough and dizziness", risk: "low", category: "adr", locType: "urban" },
  { drug: "Diclofenac", symptom: "gastric bleeding", risk: "high", category: "adr", locType: "urban" },
  { drug: "Ranitidine", symptom: "abdominal pain", risk: "medium", category: "adr", locType: "rural" },
  { drug: "Clonazepam", symptom: "extreme drowsiness and confusion", risk: "high", category: "adr", locType: "urban" },
  { drug: "Doxycycline", symptom: "photosensitivity and rash", risk: "medium", category: "adr", locType: "rural" },
];

const districts = ["Bengaluru", "Raichur", "Mysuru", "Hubli", "Mangaluru", "Bellary", "Davangere", "Kolar", "Bidar", "Vijayapura"];
const sourceTypes: ("social_media" | "whatsapp" | "hospital_form" | "field_worker")[] = ["social_media", "whatsapp", "hospital_form", "field_worker"];
const hospitals = ["District Hospital", "PHC", "Government Medical College", "Community Health Center", "Regional Hospital", "City Hospital"];

function getRandElement<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60), 0, 0);
  return d;
}

const SEED_PROJECTS = [
  {
    name: "Adverse Drug Reactions India",
    description: "Monitor ADR signals across social media, forums, and messaging platforms for drugs commonly prescribed in India.",
    keywords: JSON.stringify(["Metformin", "Insulin", "Azithromycin", "Paracetamol", "adverse reaction", "side effects"]),
    sources: JSON.stringify(["twitter", "reddit", "quora"]),
    latency: JSON.stringify({ twitter: "realtime", reddit: "daily", quora: "weekly" }),
    status: "active", signal_count: 247,
  },
  {
    name: "Hospital Quality Bengaluru",
    description: "Track patient complaints and safety signals from hospitals in Bengaluru urban area.",
    keywords: JSON.stringify(["Victoria Hospital", "Manipal Hospital", "Apollo", "hospital complaint", "negligence"]),
    sources: JSON.stringify(["twitter", "reddit"]),
    latency: JSON.stringify({ twitter: "realtime", reddit: "daily" }),
    status: "active", signal_count: 89,
  },
  {
    name: "Rural Health Signals Raichur",
    description: "Field-level monitoring of rural health events and outbreak signals in Raichur district and surrounding areas.",
    keywords: JSON.stringify(["Raichur hospital", "PHC", "ASHA worker", "medicine reaction", "fever outbreak"]),
    sources: JSON.stringify(["reddit", "quora"]),
    latency: JSON.stringify({ reddit: "daily", quora: "weekly" }),
    status: "active", signal_count: 34,
  },
];

export async function runSeed(): Promise<void> {
  try {
    const existing = await db.select({ id: signalsTable.id }).from(signalsTable).limit(1);
    if (existing.length === 0) {
      logger.info("Seeding database with initial signals...");

      for (const signal of seedSignals) {
        const daysBack = Math.floor(Math.random() * 7);
        const createdAt = daysAgo(daysBack);
        await db.insert(signalsTable).values({
          ...signal,
          created_at: createdAt,
          incident_date: createdAt.toISOString().split("T")[0],
          status: getRandElement(["new", "new", "reviewed", "escalated"]),
        });
      }

      for (let i = 0; i < 40; i++) {
        const template = getRandElement(additionalTemplates);
        const district = getRandElement(districts);
        const sourceType = getRandElement(sourceTypes);
        const hospital = `${district} ${getRandElement(hospitals)}`;
        const daysBack = Math.floor(Math.random() * 7);
        const createdAt = daysAgo(daysBack);
        const includeHospital = Math.random() > 0.5;
        const sent = randSentiment();
        const piiBool = randPii();

        await db.insert(signalsTable).values({
          raw_text: `Patient reported ${template.symptom} after taking ${template.drug} at ${includeHospital ? hospital : "local clinic"} in ${district}. ${Math.random() > 0.5 ? "Family very concerned." : "Requires immediate attention."}`,
          source_type: sourceType,
          location_district: district,
          location_type: template.locType,
          drug_name: template.drug,
          hospital_name: includeHospital ? hospital : null,
          reporter_type: getRandElement(["patient", "family_member", "hospital_staff", "field_worker"]),
          risk_level: template.risk,
          category: template.category,
          extracted_entities: JSON.stringify({ drugs: [template.drug], symptoms: [template.symptom], hospitals: includeHospital ? [hospital] : [], locations: [district] }),
          nlp_summary: `Patient experienced ${template.symptom} after ${template.drug} administration in ${district}. ${template.risk === "critical" ? "Immediate intervention required." : "Standard monitoring recommended."}`,
          recommended_action: `Monitor patient closely. Document ADR and report to district pharmacovigilance unit in ${district}.`,
          status: getRandElement(["new", "new", "new", "reviewed", "escalated"]),
          created_at: createdAt,
          incident_date: createdAt.toISOString().split("T")[0],
          sentiment: sent,
          sentiment_score: randScore(sent),
          confidence_score: randConfidence(),
          pii_detected: piiBool,
          pii_types: piiBool ? JSON.stringify(getRandElement([["name"], ["phone_number"], ["age"], ["name", "age"]])) : "[]",
          pii_description: piiBool ? "Report may contain patient identifying information" : null,
          safety_flags: JSON.stringify(randFlags()),
          reasoning: `${template.symptom} reported after ${template.drug} in ${district}. Risk classified as ${template.risk} based on symptom severity and regional context.`,
          project_id: randProjectId(),
        });
      }

      logger.info("Database seeded with 50 signals");

      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const { gte: gteOp, eq: eqOp, and: andOp } = await import("drizzle-orm");
      const criticalSignals = await db.select().from(signalsTable).where(andOp(eqOp(signalsTable.risk_level, "critical"), gteOp(signalsTable.created_at, twentyFourHoursAgo)));
      const byDistrict = new Map<string, number>();
      for (const sig of criticalSignals) {
        const district = sig.location_district || "Unknown";
        byDistrict.set(district, (byDistrict.get(district) || 0) + 1);
      }
      for (const [district, count] of byDistrict.entries()) {
        if (count >= 2) {
          await db.insert(alertsTable).values({ district, signal_count: count, time_window_hours: 24, risk_level: "critical", cluster_summary: `${count} critical signals in ${district} within 24 hours.`, status: "active" });
        }
      }
    }

    const existingProjects = await db.select({ id: projectsTable.id }).from(projectsTable).limit(1);
    if (existingProjects.length === 0) {
      logger.info("Seeding default projects...");
      for (const proj of SEED_PROJECTS) {
        await db.insert(projectsTable).values(proj);
      }
      logger.info("Default projects seeded");
    }

    await runDataEnrichment();
  } catch (err) {
    logger.error(err, "Error in seed");
  }
}

async function runDataEnrichment(): Promise<void> {
  try {
    const { isNull: isNullOp } = await import("drizzle-orm");
    const nullSentimentSignals = await db.select({ id: signalsTable.id }).from(signalsTable).where(isNullOp(signalsTable.sentiment));
    if (nullSentimentSignals.length === 0) return;

    logger.info(`Enriching ${nullSentimentSignals.length} signals with sentiment/PII data...`);
    const { eq: eqOp } = await import("drizzle-orm");

    for (const { id } of nullSentimentSignals) {
      const sent = randSentiment();
      const piiBool = randPii();
      await db.update(signalsTable).set({
        sentiment: sent,
        sentiment_score: randScore(sent),
        confidence_score: randConfidence(),
        pii_detected: piiBool,
        pii_types: piiBool ? JSON.stringify(getRandElement([["name"], ["phone_number"], ["age"], ["name", "age"]])) : "[]",
        pii_description: piiBool ? "Report may contain patient identifying information" : null,
        safety_flags: JSON.stringify(randFlags()),
        project_id: randProjectId(),
      }).where(eqOp(signalsTable.id, id));
    }

    logger.info("Data enrichment complete");
  } catch (err) {
    logger.error(err, "Data enrichment failed");
  }
}
