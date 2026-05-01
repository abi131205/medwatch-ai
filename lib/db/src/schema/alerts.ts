import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const alertsTable = pgTable("alerts", {
  id: serial("id").primaryKey(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  district: text("district"),
  signal_count: integer("signal_count"),
  time_window_hours: integer("time_window_hours"),
  risk_level: text("risk_level"),
  cluster_summary: text("cluster_summary"),
  status: text("status").default("active"),
});

export type Alert = typeof alertsTable.$inferSelect;
export type InsertAlert = typeof alertsTable.$inferInsert;
