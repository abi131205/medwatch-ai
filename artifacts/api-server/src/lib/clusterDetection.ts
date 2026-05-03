import { db } from "@workspace/db";
import { signalsTable, alertsTable } from "@workspace/db";
import { eq, gte, and } from "drizzle-orm";
import { logger } from "./logger";

export async function runClusterDetection(): Promise<{ new_alerts: unknown[]; count: number }> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const criticalSignals = await db.select()
    .from(signalsTable)
    .where(and(
      eq(signalsTable.risk_level, "critical"),
      gte(signalsTable.created_at, twentyFourHoursAgo)
    ));

  const byDistrict = new Map<string, typeof criticalSignals>();
  for (const signal of criticalSignals) {
    const district = signal.location_district || "Unknown";
    if (!byDistrict.has(district)) byDistrict.set(district, []);
    byDistrict.get(district)!.push(signal);
  }

  const existingAlerts = await db.select().from(alertsTable)
    .where(and(
      eq(alertsTable.status, "active"),
      gte(alertsTable.created_at, twentyFourHoursAgo)
    ));
  const alertedDistricts = new Set(existingAlerts.map(a => a.district));

  const newAlerts: unknown[] = [];
  for (const [district, signals] of byDistrict.entries()) {
    if (signals.length >= 3 && !alertedDistricts.has(district)) {
      const categories = [...new Set(signals.map(s => s.category).filter(Boolean))];
      const drugs = [...new Set(signals.map(s => s.drug_name).filter(Boolean))];
      const summary = `${signals.length} critical signals detected in ${district} within 24 hours. Categories: ${categories.join(", ")}${drugs.length > 0 ? `. Drugs: ${drugs.join(", ")}` : ""}.`;

      const [alert] = await db.insert(alertsTable).values({
        district,
        signal_count: signals.length,
        time_window_hours: 24,
        risk_level: "critical",
        cluster_summary: summary,
        status: "active",
      }).returning();

      newAlerts.push(alert);
    }
  }

  logger.info(`Cluster detection run — ${newAlerts.length} new alerts created`);
  return { new_alerts: newAlerts, count: newAlerts.length };
}
