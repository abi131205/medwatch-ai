import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import { signalsTable } from "@workspace/db";
import { gte } from "drizzle-orm";

const router = Router();

router.get("/timeseries", async (req: Request, res: Response) => {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const signals = await db.select().from(signalsTable).where(gte(signalsTable.created_at, twentyFourHoursAgo));
    const hourMap = new Map<string, { total: number; critical: number; high: number; medium: number; low: number }>();
    for (let i = 23; i >= 0; i--) {
      const d = new Date(); d.setMinutes(0, 0, 0); d.setHours(d.getHours() - i);
      hourMap.set(d.toISOString().slice(0, 13) + ":00", { total: 0, critical: 0, high: 0, medium: 0, low: 0 });
    }
    for (const signal of signals) {
      const d = new Date(signal.created_at); d.setMinutes(0, 0, 0);
      const key = d.toISOString().slice(0, 13) + ":00";
      if (hourMap.has(key)) {
        const entry = hourMap.get(key)!;
        entry.total++;
        const risk = signal.risk_level as keyof typeof entry;
        if (risk && risk in entry) entry[risk]++;
      }
    }
    res.json(Array.from(hourMap.entries()).map(([hour, counts]) => ({ hour, ...counts })));
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Failed" }); }
});

router.get("/drugs", async (req: Request, res: Response) => {
  try {
    const signals = await db.select({ drug_name: signalsTable.drug_name }).from(signalsTable);
    const counts = new Map<string, number>();
    for (const s of signals) { if (s.drug_name) counts.set(s.drug_name, (counts.get(s.drug_name) || 0) + 1); }
    res.json(Array.from(counts.entries()).map(([drug_name, count]) => ({ drug_name, count })).sort((a, b) => b.count - a.count).slice(0, 10));
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Failed" }); }
});

router.get("/hospitals", async (req: Request, res: Response) => {
  try {
    const signals = await db.select({ hospital_name: signalsTable.hospital_name }).from(signalsTable);
    const counts = new Map<string, number>();
    for (const s of signals) { if (s.hospital_name) counts.set(s.hospital_name, (counts.get(s.hospital_name) || 0) + 1); }
    res.json(Array.from(counts.entries()).map(([hospital_name, count]) => ({ hospital_name, count })).sort((a, b) => b.count - a.count).slice(0, 10));
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Failed" }); }
});

router.get("/districts", async (req: Request, res: Response) => {
  try {
    const signals = await db.select().from(signalsTable);
    type DistrictData = { total: number; critical: number; high: number; medium: number; low: number; location_type: string | null; categories: Record<string, number>; drugs: Record<string, number> };
    const districtMap = new Map<string, DistrictData>();
    for (const s of signals) {
      const district = s.location_district || "Unknown";
      if (!districtMap.has(district)) districtMap.set(district, { total: 0, critical: 0, high: 0, medium: 0, low: 0, location_type: s.location_type, categories: {}, drugs: {} });
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
      if (isUrban) { urbanTotal += data.total; urbanCritical += data.critical; }
      else { ruralTotal += data.total; ruralCritical += data.critical; }
      return { district, location_type: data.location_type, total: data.total, critical: data.critical, high: data.high, medium: data.medium, low: data.low, top_category: topCategory, top_drug: topDrug };
    }).sort((a, b) => b.total - a.total);
    res.json({ districts, urban_total: urbanTotal, rural_total: ruralTotal, urban_critical: urbanCritical, rural_critical: ruralCritical });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Failed" }); }
});

router.get("/sentiment", async (req: Request, res: Response) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const all = await db.select().from(signalsTable).where(gte(signalsTable.created_at, sevenDaysAgo));
    const signals = all.length > 0 ? all : await db.select().from(signalsTable);

    const neg = signals.filter(s => s.sentiment === "negative").length;
    const neu = signals.filter(s => s.sentiment === "neutral").length;
    const pos = signals.filter(s => s.sentiment === "positive").length;
    const total = signals.length || 1;
    const avgScore = signals.reduce((sum, s) => sum + (s.sentiment_score || 0), 0) / total;

    const bySource = new Map<string, { count: number; scores: number[]; negCount: number }>();
    for (const s of signals) {
      const src = s.source_type || "unknown";
      if (!bySource.has(src)) bySource.set(src, { count: 0, scores: [], negCount: 0 });
      const entry = bySource.get(src)!;
      entry.count++;
      entry.scores.push(s.sentiment_score || 0);
      if (s.sentiment === "negative") entry.negCount++;
    }

    const bySourceArr = Array.from(bySource.entries()).map(([source, data]) => {
      const avgSrc = data.scores.reduce((a, b) => a + b, 0) / (data.scores.length || 1);
      const trend = avgSrc < -0.6 ? "↑ worsening" : avgSrc < -0.3 ? "→ stable" : "↓ improving";
      return { source, count: data.count, avg_score: Math.round(avgSrc * 100) / 100, sentiment: avgSrc < -0.3 ? "Negative" : avgSrc > 0.1 ? "Positive" : "Neutral", trend };
    }).sort((a, b) => b.count - a.count);

    res.json({ overall: { negative: neg, neutral: neu, positive: pos, avg_score: Math.round(avgScore * 100) / 100, total }, by_source: bySourceArr });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Failed" }); }
});

router.get("/source-trends", async (req: Request, res: Response) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const signals = await db.select().from(signalsTable).where(gte(signalsTable.created_at, sevenDaysAgo));

    const SOURCES = ["social_media", "whatsapp", "hospital_form", "field_worker"];
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); days.push(d.toISOString().split("T")[0]);
    }

    const matrix: Record<string, Record<string, number>> = {};
    for (const day of days) { matrix[day] = {}; for (const src of SOURCES) matrix[day][src] = 0; }
    for (const s of signals) {
      const day = new Date(s.created_at).toISOString().split("T")[0];
      const src = s.source_type || "unknown";
      if (matrix[day] && src in matrix[day]) matrix[day][src]++;
    }

    const chartData = days.map(day => ({ date: day, ...matrix[day] }));

    const summary: Record<string, { total: number; negCount: number; scores: number[]; keywords: string[] }> = {};
    for (const src of SOURCES) { summary[src] = { total: 0, negCount: 0, scores: [], keywords: [] }; }
    for (const s of signals) {
      const src = s.source_type || "unknown";
      if (src in summary) {
        summary[src].total++;
        if (s.sentiment === "negative") summary[src].negCount++;
        summary[src].scores.push(s.confidence_score || 0.75);
        if (s.drug_name) summary[src].keywords.push(s.drug_name);
      }
    }

    const sourceTable = SOURCES.map(src => {
      const d = summary[src];
      const topKeyword = d.keywords.length > 0 ? Object.entries(d.keywords.reduce<Record<string, number>>((acc, k) => { acc[k] = (acc[k] || 0) + 1; return acc; }, {})).sort((a, b) => b[1] - a[1])[0]?.[0] || "—" : "—";
      const avgConf = d.scores.length > 0 ? Math.round(d.scores.reduce((a, b) => a + b, 0) / d.scores.length * 100) / 100 : 0;
      const negPct = d.total > 0 ? Math.round((d.negCount / d.total) * 100) : 0;
      return { source: src, total: d.total, negative_pct: negPct, top_keyword: topKeyword, avg_confidence: avgConf };
    }).sort((a, b) => b.total - a.total);

    const mostActive = sourceTable[0]?.source || "—";
    res.json({ chart_data: chartData, source_table: sourceTable, most_active_source: mostActive });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Failed" }); }
});

export default router;
