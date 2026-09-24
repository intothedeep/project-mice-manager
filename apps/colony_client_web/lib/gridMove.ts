// Pure move mutation: (state, counters, input) → { state, counters, result },
// the same shape as punchMutations.ts and for the same reason. A move does
// NOT edit the tree: it appends a version row to the location log
// (mintLocation) and lets projectLocations put the mouse where that row says.
// There is therefore no "moved the grid but recorded nothing" path left — the
// record IS the move.
//
// In the real backend this is the INSERT of a new `mice` version row with the
// new cage_id/slot_id. See packages/types/src/mouseLocationRow.ts for how the
// mock's row diverges from that table's full-state rule.

import type { ColonyGrid } from '@repo/types';
import {
    findCage,
    mintLocation,
    type AddMouseResult,
    type ColonyState,
    type Counters,
} from '@/lib/colonyMutationHelpers';
import { addSlot } from '@/lib/colonyMutations';
import { currentLocationOf } from '@/lib/mouseLocations';

export interface MoveTarget {
    cageId: number;
    slotId?: number; // existing slot
    newSlotLabel?: string; // create a fresh slot in the target cage
}

interface MoveMouseInput {
    metaId: number;
    target: MoveTarget;
    effectiveAt: string; // ISO date — WHEN the mouse physically moved
    reason?: string; // mice.reason; defaults to 'move'
    note?: string; // mice.change_note
}

function refuse(
    state: ColonyState,
    counters: Counters,
    error: string
): { state: ColonyState; counters: Counters; result: AddMouseResult } {
    return { state, counters, result: { ok: false, error } };
}

// A Move CASE names a cage and nothing finer (taskTypes.ts: the only field is
// `toCage`), so completing one cannot know the slot — nobody does when the
// task is written days earlier. There is therefore NO default slot here: the
// person completing the case picks it in MoveMenu, the same dialog the Move
// button opens. Guessing the cage's first slot relocated a mouse that was
// already in the right cage (the owner's report).

// Resolves a cage CODE (what a Move case's `toCage` direction field stores —
// the picker offers codes, cages.code being globally unique) to its cageId.
export function findCageIdByCode(
    grid: ColonyGrid,
    cageCode: string
): number | undefined {
    for (const line of grid.lines)
        for (const cage of line.cages)
            if (cage.code === cageCode) return cage.cageId;
    return undefined;
}

export function moveMouse(
    state: ColonyState,
    counters: Counters,
    input: MoveMouseInput
): { state: ColonyState; counters: Counters; result: AddMouseResult } {
    // The mouse's CURRENT place is the head row, not a search of the tree —
    // the tree is the projection, the log is the fact.
    const current = currentLocationOf(state.locations, input.metaId);
    if (!current) return refuse(state, counters, 'Mouse not found.');

    const cage = findCage(state.grid, input.target.cageId);
    if (!cage)
        return refuse(state, counters, 'Selected cage no longer exists.');

    let working = state;
    let workingCounters = counters;
    let slotId: number;

    if (input.target.slotId != null) {
        if (!cage.slots.some((s) => s.slotId === input.target.slotId)) {
            return refuse(state, counters, 'Selected slot no longer exists.');
        }
        slotId = input.target.slotId;
    } else {
        // Creating the destination slot is a STRUCTURAL change and stays with
        // addSlot, which owns the colony-wide unique-label rule. Its id is
        // counters.nextSlotId — read before the call, not inferred after it.
        slotId = counters.nextSlotId;
        const added = addSlot(state, counters, {
            cageId: input.target.cageId,
            slotLabel: input.target.newSlotLabel ?? '',
        });
        // Restore the CALLER's state on failure (same guard as addCage/addLine).
        if (!added.result.ok) {
            return { state, counters, result: added.result };
        }
        working = added.state;
        workingCounters = added.counters;
    }

    // Refused HERE and not only in MoveMenu's disabled radio: a UI-only guard
    // is bypassable from the store, and a move to where the mouse already is
    // would mint a version row recording nothing — which is how re-marking a
    // Move case `done` would otherwise grow the history without end.
    if (slotId === current.slotId) {
        return { state, counters, result: { ok: true } };
    }

    const minted = mintLocation(working, workingCounters, {
        metaId: input.metaId,
        cageId: input.target.cageId,
        slotId,
        effectiveAt: input.effectiveAt,
        reason: input.reason ?? 'move',
        ...(input.note !== undefined ? { note: input.note } : {}),
    });
    return {
        state: minted.state,
        counters: minted.counters,
        result: { ok: true },
    };
}
