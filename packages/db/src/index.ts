// Public interface for @repo/db.
// Consumers: apps/colony_server (services layer only for withTransaction).
// packages/domain must NOT import from here — it is pure, no I/O.
//
// The raw Pool is deliberately NOT exported: exposing it would let a controller
// call pool.query directly and bypass the repository layer entirely.

import type { Pool, PoolClient } from "pg";

/**
 * What every repository function accepts as its first argument, so the same
 * function composes inside a transaction or standalone. Exported from here so
 * repositories do not each re-derive it from `pg` and drift apart.
 */
export type Executor = Pool | PoolClient;

export { query, withTransaction, closePool } from "./pool";
