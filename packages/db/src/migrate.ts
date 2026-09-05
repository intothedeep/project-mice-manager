import fs from "fs";
import path from "path";
import crypto from "crypto";
import { Client, Pool } from "pg";
import { databaseUrl, maintenanceUrl, safeDbName } from "./config";

const MIGRATIONS_DIR = path.resolve(__dirname, "../migrations");
const FILENAME_RE = /^\d{4}_.+\.sql$/;

function sha256(content: string): string {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}

async function ensureDatabase(): Promise<void> {
  const dbName = safeDbName(databaseUrl);
  const maint = new Client({ connectionString: maintenanceUrl(databaseUrl) });
  await maint.connect();
  try {
    const { rows } = await maint.query<{ datname: string }>(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName]
    );
    if (rows.length === 0) {
      // CREATE DATABASE cannot run inside a transaction.
      await maint.query(`CREATE DATABASE "${dbName}"`);
      console.log(`[migrate] created database "${dbName}"`);
    }
  } finally {
    await maint.end();
  }
}

async function ensureMigrationsTable(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   TEXT PRIMARY KEY,
      checksum   TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

async function loadApplied(pool: Pool): Promise<Map<string, string>> {
  const { rows } = await pool.query<{ filename: string; checksum: string }>(
    "SELECT filename, checksum FROM schema_migrations ORDER BY filename"
  );
  return new Map(rows.map((r) => [r.filename, r.checksum]));
}

async function lastAppliedFilename(pool: Pool): Promise<string | null> {
  const { rows } = await pool.query<{ filename: string }>(
    "SELECT filename FROM schema_migrations ORDER BY filename DESC LIMIT 1"
  );
  return rows[0]?.filename ?? null;
}

async function applyFile(
  pool: Pool,
  filename: string,
  content: string,
  checksum: string
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(content);
    await client.query(
      "INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2)",
      [filename, checksum]
    );
    await client.query("COMMIT");
    console.log(`[migrate] applied: ${filename}`);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function main(): Promise<void> {
  await ensureDatabase();

  // Import pool after DB guaranteed to exist.
  const { pool, closePool } = await import("./pool");

  try {
    await ensureMigrationsTable(pool);

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => FILENAME_RE.test(f))
      .sort();

    const applied = await loadApplied(pool);
    const lastApplied = await lastAppliedFilename(pool);

    for (const filename of files) {
      const content = fs.readFileSync(
        path.join(MIGRATIONS_DIR, filename),
        "utf8"
      );
      const checksum = sha256(content);

      if (applied.has(filename)) {
        if (applied.get(filename) !== checksum) {
          throw new Error(
            `[migrate] CHECKSUM MISMATCH: "${filename}" was already applied but its content changed.\n` +
              `Write a NEW migration instead of editing an applied one.`
          );
        }
        // Already applied and checksum matches — skip.
        continue;
      }

      // Unapplied file: guard against out-of-order insertion.
      if (lastApplied !== null && filename < lastApplied) {
        throw new Error(
          `[migrate] OUT OF ORDER: "${filename}" sorts before the last applied migration "${lastApplied}".\n` +
            `Insert a new migration with a higher sequence number.`
        );
      }

      await applyFile(pool, filename, content, checksum);
    }

    console.log("[migrate] done");
  } finally {
    await closePool();
  }
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
