// Public interface for @repo/db.
// Consumers: apps/colony_server (services layer only for withTransaction).
// packages/domain must NOT import from here — it is pure, no I/O.

export { pool, query, withTransaction, closePool } from "./pool";
