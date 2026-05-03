import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const projectsTable = pgTable("projects", {
  id: serial("id").primaryKey(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  name: text("name").notNull(),
  description: text("description"),
  keywords: text("keywords").notNull().default("[]"),
  sources: text("sources").notNull().default("[]"),
  latency: text("latency").notNull().default("{}"),
  status: text("status").default("active"),
  signal_count: integer("signal_count").default(0),
  last_crawled: timestamp("last_crawled"),
});

export type Project = typeof projectsTable.$inferSelect;
export type InsertProject = typeof projectsTable.$inferInsert;
