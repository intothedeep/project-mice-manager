import { Pool, PoolClient } from "pg";
import { databaseUrl } from "./config";

// Module-level singleton — created once per process lifetime, never per request.
const pool = new Pool({
  connectionString: databaseUrl,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

// A dropped idle backend must not crash the process.
pool.on("error", (err) => {
  console.error("[db] idle client error:", err.message);
});

/** One-shot query. Use for reads and fire-and-forget writes outside a tx. */
async function query<T extends object = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<{ rows: T[] }> {
  return pool.query<T>(sql, params);
}

/**
 * Runs `fn` inside a BEGIN/COMMIT transaction.
 * Called by the SERVICE layer only — never call from repositories directly.
 */
async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/** Graceful shutdown — drains connections; call before process.exit(). */
async function closePool(): Promise<void> {
  await pool.end();
}

export { pool, query, withTransaction, closePool };
