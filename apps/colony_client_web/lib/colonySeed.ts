// Pure seed-scan helpers — no side effects, no state.
// Extracted from mockColonyStore.ts (A2) to keep that file within the 400-line
// hard review limit. These remain pure functions of a ColonyGrid; the store
// passes `state` to them at write time (not `SEED_COLONY`) so they always
// reflect the live colony tree.

import type { ColonyGrid } from '@repo/types';
import { parseLitterCode } from '@/lib/litterCode';

/** Highest metaId currently in the grid — new-mouse counter seeds above it. */
export function maxMetaId(grid: ColonyGrid): number {
    let max = 0;
    for (const l of grid.lines)
        for (const c of l.cages)
            for (const s of c.slots)
                for (const m of s.mice) if (m.metaId > max) max = m.metaId;
    return max;
}

/** Highest punchId currently in the grid — new-punch counter seeds above it. */
export function maxPunchId(grid: ColonyGrid): number {
    let max = 0;
    for (const l of grid.lines)
        for (const c of l.cages)
            for (const s of c.slots)
                for (const m of s.mice)
                    for (const p of m.punches)
                        if (p.punchId > max) max = p.punchId;
    return max;
}

/** Highest slotId currently in the grid — new-slot counter seeds above it. */
export function maxSlotId(grid: ColonyGrid): number {
    let max = 0;
    for (const l of grid.lines)
        for (const c of l.cages)
            for (const s of c.slots) if (s.slotId > max) max = s.slotId;
    return max;
}

/** Highest cageId currently in the grid — new-cage counter seeds above it. */
export function maxCageId(grid: ColonyGrid): number {
    let max = 0;
    for (const l of grid.lines)
        for (const c of l.cages) if (c.cageId > max) max = c.cageId;
    return max;
}

/** Highest lineId currently in the grid — new-line counter seeds above it. */
export function maxLineId(grid: ColonyGrid): number {
    let max = 0;
    for (const l of grid.lines) if (l.lineId > max) max = l.lineId;
    return max;
}

/**
 * Every slot label currently in the grid (slots.label is GLOBALLY unique —
 * not scoped by cage). Used to reject a duplicate new-slot label at add time.
 * Called with live `state`, not SEED_COLONY.
 */
export function slotLabelSet(grid: ColonyGrid): Set<string> {
    const set = new Set<string>();
    for (const l of grid.lines)
        for (const c of l.cages)
            for (const s of c.slots) set.add(s.label.toLowerCase());
    return set;
}

/**
 * Every cage number currently in the grid (cage_number is GLOBALLY unique).
 * Used to reject a duplicate new-cage number at add time.
 * Called with live `state`, not SEED_COLONY.
 */
export function cageNumberSet(grid: ColonyGrid): Set<string> {
    const set = new Set<string>();
    for (const l of grid.lines) for (const c of l.cages) set.add(c.cageNumber);
    return set;
}

/**
 * Scan every mouse's litterCode field in the grid and return the ordinal of
 * the maximum code found. litterCode is a first-class MouseCell field — read
 * it directly, never parsed back out of the rendered label.
 * WHY: the first generated code is nextLitterOrd+1, so seeding from the max
 * avoids re-issuing a code that already exists in data.
 */
export function maxSeedLitterOrdinal(grid: ColonyGrid): number {
    let max = 0;
    for (const l of grid.lines)
        for (const c of l.cages)
            for (const s of c.slots)
                for (const m of s.mice) {
                    const ord = parseLitterCode(m.litterCode);
                    if (ord !== null && ord > max) max = ord;
                }
    return max;
}
