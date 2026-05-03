import { pool } from "@workspace/db";
import { logger } from "./logger";

export async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        keywords TEXT NOT NULL DEFAULT '[]',
        sources TEXT NOT NULL DEFAULT '[]',
        latency TEXT NOT NULL DEFAULT '{}',
        status TEXT DEFAULT 'active',
        signal_count INTEGER DEFAULT 0,
        last_crawled TIMESTAMP
      )
    `);

    const newCols = [
      "ALTER TABLE signals ADD COLUMN IF NOT EXISTS sentiment TEXT",
      "ALTER TABLE signals ADD COLUMN IF NOT EXISTS sentiment_score REAL DEFAULT 0",
      "ALTER TABLE signals ADD COLUMN IF NOT EXISTS confidence_score REAL DEFAULT 0.75",
      "ALTER TABLE signals ADD COLUMN IF NOT EXISTS pii_detected INTEGER DEFAULT 0",
      "ALTER TABLE signals ADD COLUMN IF NOT EXISTS pii_types TEXT DEFAULT '[]'",
      "ALTER TABLE signals ADD COLUMN IF NOT EXISTS pii_description TEXT",
      "ALTER TABLE signals ADD COLUMN IF NOT EXISTS safety_flags TEXT DEFAULT '[]'",
      "ALTER TABLE signals ADD COLUMN IF NOT EXISTS reasoning TEXT",
      "ALTER TABLE signals ADD COLUMN IF NOT EXISTS project_id INTEGER",
    ];

    for (const col of newCols) {
      await client.query(col);
    }

    logger.info("Migrations completed successfully");
  } catch (err) {
    logger.error(err, "Migration failed");
    throw err;
  } finally {
    client.release();
  }
}
