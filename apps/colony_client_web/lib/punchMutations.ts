// Pure mutation functions: (state, counters, input) → { state, counters, result }
// No side effects — callers (mockColonyStore.ts, step 7) reassign cells and
// emit. No Date access: effectiveAt/deletedAt are INJECTED by the caller,
// exactly as addMouse's punchEffectiveAt is (colonyMutationHelpers.ts
// MouseSpec).
//
// Step 6a (owner option B): `state` is { grid, punchLog } — the grid's
// MouseCell.punches stays ACTIVE ROWS ONLY (plan §4); a removed punch is
// tombstoned (deletedAt set) in the separate append-only punchLog instead
// (rules/core.md: never hard-DELETE, mask at read — splicing the row out of
// the grid VIEW is exactly what "mask at read" means here; the RECORD in the
// log is never hard-deleted).
//
// NEW module (not folded into colonyMutations.ts — see that file's header
// and P0.7-b task 6/8b).

import type {
    ColonyGrid,
    MouseCell,
    PunchHistoryEntry,
    PunchLocation,
    PunchRef,
} from '@repo/types';
import type {
    AddMouseResult,
    ColonyState,
    Counters,
} from '@/lib/colonyMutationHelpers';

export interface AddPunchInput {
    metaId: number;
    location: PunchLocation;
    effectiveAt: string; // ISO date — WHEN the punch physically happened
    note?: string;
}

export interface RemovePunchInput {
    punchId: number; // globally unique (Counters.nextPunchId) — identifies the mouse implicitly
    deletedAt: string; // ISO date/timestamp — injected by the caller (pure layer, no Date)
}

function findMouse(grid: ColonyGrid, metaId: number): MouseCell | undefined {
    for (const l of grid.lines)
        for (const c of l.cages)
            for (const s of c.slots)
                for (const m of s.mice) if (m.metaId === metaId) return m;
    return undefined;
}

// Under the active-only contract, PRESENCE in a mouse's punches IS active —
// there is no deletedAt to filter on the grid side any more (6a).
function findMouseByPunch(
    grid: ColonyGrid,
    punchId: number
): MouseCell | undefined {
    for (const l of grid.lines)
        for (const c of l.cages)
            for (const s of c.slots)
                for (const m of s.mice)
                    if (m.punches.some((p) => p.punchId === punchId)) return m;
    return undefined;
}

// Appends a new PunchRef to one mouse's punches AND a matching
// PunchHistoryEntry to punchLog, in one pure call, so the view and the log
// cannot diverge.
export function addPunch(
    state: ColonyState,
    counters: Counters,
    input: AddPunchInput
): { state: ColonyState; counters: Counters; result: AddMouseResult } {
    if (!findMouse(state.grid, input.metaId)) {
        return {
            state,
            counters,
            result: { ok: false, error: `Mouse ${input.metaId} not found.` },
        };
    }

    const punchId = counters.nextPunchId;
    const newPunch: PunchRef = {
        punchId,
        location: input.location,
        effectiveAt: input.effectiveAt,
        ...(input.note !== undefined ? { note: input.note } : {}),
    };
    const logEntry: PunchHistoryEntry = {
        punchId,
        metaId: input.metaId,
        location: input.location,
        effectiveAt: input.effectiveAt,
        ...(input.note !== undefined ? { note: input.note } : {}),
    };

    const newGrid: ColonyGrid = {
        ...state.grid,
        lines: state.grid.lines.map((l) => ({
            ...l,
            cages: l.cages.map((c) => ({
                ...c,
                slots: c.slots.map((s) => ({
                    ...s,
                    mice: s.mice.map((m) =>
                        m.metaId === input.metaId
                            ? { ...m, punches: [...m.punches, newPunch] }
                            : m
                    ),
                })),
            })),
        })),
    };

    return {
        state: { grid: newGrid, punchLog: [...state.punchLog, logEntry] },
        counters: { ...counters, nextPunchId: punchId + 1 },
        result: { ok: true },
    };
}

// Splices the row out of the grid VIEW (MouseCell.punches — mask at read) and
// tombstones the RECORD in punchLog (deletedAt set, never hard-deleted): if a
// log entry for this punchId already exists it is updated in place, else a
// tombstoned copy is appended (the log may not hold the row yet, e.g. before
// step 7 seeds it from SEED_COLONY). punchId is globally unique, so the
// target mouse is found BY the punch, not passed in. An unknown or
// already-removed punch id is a no-op returning the input unchanged — under
// the active-only contract "already removed" means "no longer present in any
// mouse's punches", so both cases are the same lookup miss.
export function removePunch(
    state: ColonyState,
    counters: Counters,
    input: RemovePunchInput
): { state: ColonyState; counters: Counters; result: AddMouseResult } {
    const target = findMouseByPunch(state.grid, input.punchId);
    if (!target) {
        return { state, counters, result: { ok: true } };
    }
    const removedPunch = target.punches.find(
        (p) => p.punchId === input.punchId
    )!;

    const newGrid: ColonyGrid = {
        ...state.grid,
        lines: state.grid.lines.map((l) => ({
            ...l,
            cages: l.cages.map((c) => ({
                ...c,
                slots: c.slots.map((s) => ({
                    ...s,
                    mice: s.mice.map((m) =>
                        m.metaId === target.metaId
                            ? {
                                  ...m,
                                  punches: m.punches.filter(
                                      (p) => p.punchId !== input.punchId
                                  ),
                              }
                            : m
                    ),
                })),
            })),
        })),
    };

    const hasLogEntry = state.punchLog.some((e) => e.punchId === input.punchId);
    const newLog: PunchHistoryEntry[] = hasLogEntry
        ? state.punchLog.map((e) =>
              e.punchId === input.punchId
                  ? { ...e, deletedAt: input.deletedAt }
                  : e
          )
        : [
              ...state.punchLog,
              {
                  punchId: removedPunch.punchId,
                  metaId: target.metaId,
                  location: removedPunch.location,
                  effectiveAt: removedPunch.effectiveAt,
                  ...(removedPunch.note !== undefined
                      ? { note: removedPunch.note }
                      : {}),
                  deletedAt: input.deletedAt,
              },
          ];

    return {
        state: { grid: newGrid, punchLog: newLog },
        counters,
        result: { ok: true },
    };
}
