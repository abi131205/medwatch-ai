import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import { signalsTable, alertsTable } from "@workspace/db";
import { eq, gte, and, desc } from "drizzle-orm";

const router = Router();

// GET /api/alerts
router.get("/", async (req: Request, res: Response) => {
  try {
    const alerts = await db.select().from(alertsTable).orderBy(desc(alertsTable.created_at));
    res.json(alerts);
  } catch (err) {
    req.log.error(err, "Error fetching alerts");
    res.status(500).json({ error: "Failed to fetch alerts" });
  }
});

// POST /api/alerts/check
router.post("/check", async (req: Request, res: Response) => {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const criticalSignals = await db.select()
      .from(signalsTable)
      .where(and(
        eq(signalsTable.risk_level, "critical"),
        gte(signalsTable.created_at, twentyFourHoursAgo)
      ));

    // Group by district
    const byDistrict = new Map<string, typeof criticalSignals>();
    for (const signal of criticalSignals) {
      const district = signal.location_district || "Unknown";
      if (!byDistrict.has(district)) byDistrict.set(district, []);
      byDistrict.get(district)!.push(signal);
    }

    // Get existing active alerts to avoid duplicates
    const existingAlerts = await db.select().from(alertsTable)
      .where(and(
        eq(alertsTable.status, "active"),
        gte(alertsTable.created_at, twentyFourHoursAgo)
      ));
    const alertedDistricts = new Set(existingAlerts.map(a => a.district));

    const newAlerts = [];
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

    res.json(newAlerts);
  } catch (err) {
    req.log.error(err, "Error checking alerts");
    res.status(500).json({ error: "Failed to check alerts" });
  }
});

// PATCH /api/alerts/:id/status
router.patch("/:id/status", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const { status } = req.body;
    if (!["active", "acknowledged", "escalated"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const [updated] = await db.update(alertsTable).set({ status }).where(eq(alertsTable.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "Alert not found" });

    res.json(updated);
  } catch (err) {
    req.log.error(err, "Error updating alert status");
    res.status(500).json({ error: "Failed to update alert status" });
  }
});

export default router;
