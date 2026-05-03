import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import { alertsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { runClusterDetection } from "../lib/clusterDetection";

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
    const result = await runClusterDetection();
    res.json(result.new_alerts);
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
