// Reference-preserving walkers over the colony tree (line › cage › slot ›
// mouse). Pure, no domain knowledge — they exist so a projection never
// hand-rolls the four-level nest again, and so an untouched line/cage/slot/
// mouse comes back `===` its previous self.
//
// Split out of colonyMutationHelpers.ts when the LOCATION projection
// (lib/mouseLocations.ts) needed the same walk: helpers imports
// mouseLocations, so the walkers cannot live in helpers without a cycle.

import type { ColonyGrid, GridSlot, MouseCell } from '@repo/types';

// Generic reuse-preserving map: returns the ORIGINAL array reference when no
// element actually changed (by `fn`'s own reference test), and a fresh array
// only when at least one element did.
function mapReuse<T>(
    arr: T[],
    fn: (item: T) => T
): { list: T[]; changed: boolean } {
    let changed = false;
    const list = arr.map((item) => {
        const next = fn(item);
        if (next !== item) changed = true;
        return next;
    });
    return { list: changed ? list : arr, changed };
}

// Walks line → cage → slot and applies `fn` to every slot, preserving
// reference identity at every level whose contents did not change.
export function mapSlots(
    grid: ColonyGrid,
    fn: (slot: GridSlot) => GridSlot
): ColonyGrid {
    const { list: lines, changed } = mapReuse(grid.lines, (line) => {
        const { list: cages, changed: cagesChanged } = mapReuse(
            line.cages,
            (cage) => {
                const { list: slots, changed: slotsChanged } = mapReuse(
                    cage.slots,
                    fn
                );
                return slotsChanged ? { ...cage, slots } : cage;
            }
        );
        return cagesChanged ? { ...line, cages } : line;
    });
    return changed ? { ...grid, lines } : grid;
}

// Same walk, one level deeper: applies `fn` to every mouse. Shared by
// projectPunches and updateMouse.ts — "touch one mouse, leave the rest `===`".
export function mapMice(
    grid: ColonyGrid,
    fn: (mouse: MouseCell) => MouseCell
): ColonyGrid {
    return mapSlots(grid, (slot) => {
        const { list: mice, changed } = mapReuse(slot.mice, fn);
        return changed ? { ...slot, mice } : slot;
    });
}
