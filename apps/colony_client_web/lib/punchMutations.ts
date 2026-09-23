// Pure mutation functions: (state, counters, input) → { state, counters, result }
// No side effects — callers (mockColonyStore.ts, step 7) reassign cells and
// emit. No Date access: effectiveAt/deletedAt are INJECTED by the caller,
// exactly as addMouse's punchEffectiveAt is (colonyMutationHelpers.ts
// MouseSpec).
//
// `punchLog` is the SINGLE SOURCE for every punch (colonyMutationHelpers.ts
// header) — mintPunch is the only append, projectPunches is the only place
// the grid's MouseCell.punches (active rows only, plan §4) is derived. A
// removed punch is tombstoned (deletedAt set) in punchLog, never spliced out
// (rules/core.md: never hard-DELETE, mask at read — the projection is the
// mask; the RECORD in the log is never hard-deleted).
//
// NEW module (not folded into colonyMutations.ts — see that file's header
// and P0.7-b task 6/8b).

import type { ColonyGrid, MouseCell, PunchLocation } from '@repo/types';
import {
    mintPunch,
    projectPunches,
    type AddMouseResult,
    type ColonyState,
    type Counters,
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

// Mints a punch into punchLog (the single append path, mintPunch) and
// re-derives the grid from it, so the view and the log cannot diverge.
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

    // `untagged` is minted once by addMouse and never removed, so a second one
    // is meaningless. Refused HERE and not only in the picker: a UI-only guard
    // is bypassable from the store.
    if (input.location === 'untagged') {
        return {
            state,
            counters,
            result: {
                ok: false,
                error: 'The untagged record is created with the mouse and cannot be added.',
            },
        };
    }

    const minted = mintPunch(state.punchLog, counters, {
        metaId: input.metaId,
        location: input.location,
        effectiveAt: input.effectiveAt,
        ...(input.note !== undefined ? { note: input.note } : {}),
    });

    return {
        state: {
            grid: projectPunches(state.grid, minted.log),
            punchLog: minted.log,
        },
        counters: minted.counters,
        result: { ok: true },
    };
}

// Tombstones the RECORD in punchLog (deletedAt set, never hard-deleted) and
// re-derives the grid — the projection is what masks it out of the grid VIEW
// (rules/core.md: never hard-DELETE, mask at read). punchId is globally
// unique, so the target row is found directly in the log, not via the grid.
// An unknown or already-removed punch id is a no-op returning the input
// unchanged. An `untagged` row is REFUSED (ok: false) rather than a silent
// no-op — a mouse always carries one, so removing it must be a distinguishable
// rejection, not indistinguishable from "didn't exist" (P0.7-b: "we never
// delete an untagged record").
export function removePunch(
    state: ColonyState,
    counters: Counters,
    input: RemovePunchInput
): { state: ColonyState; counters: Counters; result: AddMouseResult } {
    const active = state.punchLog.find(
        (e) => e.punchId === input.punchId && !e.deletedAt
    );
    if (!active) {
        return { state, counters, result: { ok: true } };
    }
    if (active.location === 'untagged') {
        return {
            state,
            counters,
            result: {
                ok: false,
                error: 'The untagged record cannot be removed.',
            },
        };
    }

    const newLog = state.punchLog.map((e) =>
        e.punchId === input.punchId ? { ...e, deletedAt: input.deletedAt } : e
    );

    return {
        state: {
            grid: projectPunches(state.grid, newLog),
            punchLog: newLog,
        },
        counters,
        result: { ok: true },
    };
}
