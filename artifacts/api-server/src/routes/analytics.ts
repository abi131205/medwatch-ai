import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import { signalsTable } from "@workspace/db";
import { gte } from "drizzle-orm";

const router = Router();

// GET /api/analytics/timeseries
router.get("/timeseries", async (req: Request, res: Response) => {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const signals = await db.select().from(signalsTable).where(gte(signalsTable.created_at, twentyFourHoursAgo));

    const hourMap = new Map<string, { total: number; critical: number; high: number; medium: number; low: number }>();

    for (let i = 23; i >= 0; i--) {
      const d = new Date();
      d.setMinutes(0, 0, 0);
      d.setHours(d.getHours() - i);
      const key = d.toISOString().slice(0, 13) + ":00";
      hourMap.set(key, { total: 0, critical: 0, high: 0, medium: 0, low: 0 });
    }

    for (const signal of signals) {
      const d = new Date(signal.created_at);
      d.setMinutes(0, 0, 0);
      const key = d.toISOString().slice(0, 13) + ":00";
      if (hourMap.has(key)) {
        const entry = hourMap.get(key)!;
        entry.total++;
        const risk = signal.risk_level as keyof typeof entry;
        if (risk && risk in entry) entry[risk]++;
      }
    }

    const result = Array.from(hourMap.entries()).map(([hour, counts]) => ({ hour, ...counts }));
    res.json(result);
  } catch (err) {
    req.log.error(err, "Error fetching timeseries");
    res.status(500).json({ error: "Failed to fetch timeseries" });
  }
});

// GET /api/analytics/drugs
router.get("/drugs", async (req: Request, res: Response) => {
  try {
    const signals = await db.select({ drug_name: signalsTable.drug_name }).from(signalsTable);

    const counts = new Map<string, number>();
    for (const s of signals) {
      if (s.drug_name) counts.set(s.drug_name, (counts.get(s.drug_name) || 0) + 1);
    }

    const result = Array.from(counts.entries())
      .map(([drug_name, count]) => ({ drug_name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    res.json(result);
  } catch (err) {
    req.log.error(err, "Error fetching drugs analytics");
    res.status(500).json({ error: "Failed to fetch drugs analytics" });
  }
});

// GET /api/analytics/hospitals
router.get("/hospitals", async (req: Request, res: Response) => {
  try {
    const signals = await db.select({ hospital_name: signalsTable.hospital_name }).from(signalsTable);

    const counts = new Map<string, number>();
    for (const s of signals) {
      if (s.hospital_name) counts.set(s.hospital_name, (counts.get(s.hospital_name) || 0) + 1);
    }

    const result = Array.from(counts.entries())
      .map(([hospital_name, count]) => ({ hospital_name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    res.json(result);
  } catch (err) {
    req.log.error(err, "Error fetching hospitals analytics");
    res.status(500).json({ error: "Failed to fetch hospitals analytics" });
  }
});

// GET /api/analytics/districts
router.get("/districts", async (req: Request, res: Response) => {
  try {
    const signals = await db.select().from(signalsTable);

    type DistrictData = {
      total: number;
      critical: number;
      high: number;
      medium: number;
      low: number;
      location_type: string | null;
      categories: Record<string, number>;
      drugs: Record<string, number>;
    };

    const districtMap = new Map<string, DistrictData>();

    for (const s of signals) {
      const district = s.location_district || "Unknown";
      if (!districtMap.has(district)) {
        districtMap.set(district, {
          total: 0, critical: 0, high: 0, medium: 0, low: 0,
          location_type: s.location_type,
          categories: {},
          drugs: {},
        });
      }
      const entry = districtMap.get(district)!;
      entry.total++;
      const risk = s.risk_level as "critical" | "high" | "medium" | "low";
      if (risk && risk in entry) entry[risk]++;
      if (s.category) entry.categories[s.category] = (entry.categories[s.category] || 0) + 1;
      if (s.drug_name) entry.drugs[s.drug_name] = (entry.drugs[s.drug_name] || 0) + 1;
    }

    let urbanTotal = 0, ruralTotal = 0, urbanCritical = 0, ruralCritical = 0;

    const districts = Array.from(districtMap.entries()).map(([district, data]) => {
      const topCategory = Object.entries(data.categories).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
      const topDrug = Object.entries(data.drugs).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

      const isUrban = data.location_type === "urban";
      if (isUrban) {
        urbanTotal += data.total;
        urbanCritical += data.critical;
      } else {
        ruralTotal += data.total;
        ruralCritical += data.critical;
      }

      return {
        district,
        location_type: data.location_type,
        total: data.total,
        critical: data.critical,
        high: data.high,
        medium: data.medium,
        low: data.low,
        top_category: topCategory,
        top_drug: topDrug,
      };
    }).sort((a, b) => b.total - a.total);

    res.json({
      districts,
      urban_total: urbanTotal,
      rural_total: ruralTotal,
      urban_critical: urbanCritical,
      rural_critical: ruralCritical,
    });
  } catch (err) {
    req.log.error(err, "Error fetching districts analytics");
    res.status(500).json({ error: "Failed to fetch districts analytics" });
  }
});

export default router;
