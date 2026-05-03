import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import { projectsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const projects = await db.select().from(projectsTable).orderBy(desc(projectsTable.created_at));
    res.json(projects);
  } catch (err) {
    req.log.error(err, "Error fetching projects");
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const { name, description, keywords, sources, latency } = req.body;
    if (!name) return res.status(400).json({ error: "name is required" });
    const [project] = await db.insert(projectsTable).values({
      name,
      description: description || null,
      keywords: JSON.stringify(Array.isArray(keywords) ? keywords : []),
      sources: JSON.stringify(Array.isArray(sources) ? sources : []),
      latency: JSON.stringify(typeof latency === "object" ? latency : {}),
    }).returning();
    res.json(project);
  } catch (err) {
    req.log.error(err, "Error creating project");
    res.status(500).json({ error: "Failed to create project" });
  }
});

router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    const updates: Record<string, unknown> = {};
    if (req.body.status !== undefined) updates.status = req.body.status;
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.description !== undefined) updates.description = req.body.description;
    if (req.body.keywords !== undefined) updates.keywords = JSON.stringify(req.body.keywords);
    if (req.body.sources !== undefined) updates.sources = JSON.stringify(req.body.sources);
    if (req.body.latency !== undefined) updates.latency = JSON.stringify(req.body.latency);
    const [updated] = await db.update(projectsTable).set(updates).where(eq(projectsTable.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "Project not found" });
    res.json(updated);
  } catch (err) {
    req.log.error(err, "Error updating project");
    res.status(500).json({ error: "Failed to update project" });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    await db.delete(projectsTable).where(eq(projectsTable.id, id));
    res.json({ success: true });
  } catch (err) {
    req.log.error(err, "Error deleting project");
    res.status(500).json({ error: "Failed to delete project" });
  }
});

router.get("/:id/signals", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    const { signalsTable } = await import("@workspace/db");
    const signals = await db.select().from(signalsTable).where(eq(signalsTable.project_id, id));
    res.json(signals);
  } catch (err) {
    req.log.error(err, "Error fetching project signals");
    res.status(500).json({ error: "Failed to fetch project signals" });
  }
});

export default router;
