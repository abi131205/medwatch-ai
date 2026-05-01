import { pgTable, serial, text, integer, timestamp, date } from "drizzle-orm/pg-core";

export const signalsTable = pgTable("signals", {
  id: serial("id").primaryKey(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  incident_date: date("incident_date"),
  source_type: text("source_type"),
  location_district: text("location_district"),
  location_type: text("location_type"),
  raw_text: text("raw_text"),
  reporter_type: text("reporter_type"),
  drug_name: text("drug_name"),
  hospital_name: text("hospital_name"),
  risk_level: text("risk_level"),
  category: text("category"),
  extracted_entities: text("extracted_entities"),
  recommended_action: text("recommended_action"),
  status: text("status").default("new"),
  nlp_summary: text("nlp_summary"),
});

export type Signal = typeof signalsTable.$inferSelect;
export type InsertSignal = typeof signalsTable.$inferInsert;
