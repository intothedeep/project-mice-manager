// Punch HISTORY surface — separate from the grid's live view (grid.ts
// PunchRef / MouseCell.punches, which is ACTIVE ROWS ONLY, plan §4).
//
// A removed punch is tombstoned here (deletedAt set), never in the grid DTO —
// mirrors how the drawer already gets case history via useTaskLog(). This is
// the ONLY place `deletedAt` reaches the client (packages/db/migrations/0026
// `punches.deleted_at`; rules/core.md: never hard-DELETE, mask at read).
//
// step 6a (P0.7-b) defines this shape; step 7 seeds it from SEED_COLONY and
// exposes usePunchLog(metaId) — this file does not seed or select, it only
// declares the entry shape.
import type { PunchLocation } from './grid';

export interface PunchHistoryEntry {
    punchId: number;
    metaId: number; // which mouse this row belongs to (grid.ts PunchRef omits it — implicit via MouseCell.punches)
    location: PunchLocation;
    effectiveAt: string; // ISO date — WHEN the punch physically happened
    note?: string;
    // Soft-delete tombstone. null/undefined = still active. ISO date,
    // injected by the caller (the mutation layer is pure, no Date access).
    deletedAt?: string;
}
