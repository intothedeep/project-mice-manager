// The LOCATION half of the mouse version log: where each mouse is, derived
// from its rows rather than stored on the tree.
//
// Same relationship punches has with MouseCell.punches (colonyMutationHelpers
// header): the log is the SINGLE SOURCE, the grid is a read-time PROJECTION.
// A mouse sits in the slot its HEAD row names, and nowhere else — the tree
// cannot hold a placement the log disagrees with, because projectLocations
// rebuilds every slot's occupants from the log on every derive.
//
// Pure: no ColonyState, no counters, no Date. That is also what keeps it free
// of a cycle — colonyMutationHelpers imports THIS file, not the reverse.

import type { ColonyGrid, MouseCell, MouseLocationRow } from '@repo/types';
import { mapSlots } from '@/lib/gridWalk';

// Highest-id row per mouse = its current state (0002: "the row with the
// highest id per mouse_meta_id is the current state").
function headLocations(
    log: readonly MouseLocationRow[]
): Map<number, MouseLocationRow> {
    const head = new Map<number, MouseLocationRow>();
    for (const row of log) {
        const prev = head.get(row.metaId);
        if (!prev || row.locationId > prev.locationId)
            head.set(row.metaId, row);
    }
    return head;
}

// This mouse's rows, oldest first — the drawer's move history. The "from" of
// a move is the PREVIOUS row, never a stored string, so a corrected earlier
// row cannot leave a stale origin behind it.
export function locationsOf(
    log: readonly MouseLocationRow[],
    metaId: number
): MouseLocationRow[] {
    return log
        .filter((r) => r.metaId === metaId)
        .sort((a, b) => a.locationId - b.locationId);
}

export function currentLocationOf(
    log: readonly MouseLocationRow[],
    metaId: number
): MouseLocationRow | undefined {
    const rows = locationsOf(log, metaId);
    return rows[rows.length - 1];
}

// Places every mouse in the slot its head row names. Returns the grid BY
// REFERENCE when no mouse moved (and reuses every unchanged slot/cage/line),
// so the seed projection is an identity and a move re-renders one slot pair.
//
// Ordering within a slot is by the head row's locationId: the seed mints rows
// in fixture order, so residents keep their fixture order and a mouse that
// moves in lands last — what the old push-at-the-end move did.
//
// THROWS on a mouse with no row, or a row whose cageId does not match the
// slot's cage. Both are programmer errors (mintLocation is the only writer
// and addMouse mints one with the mouse), and the alternative — quietly
// leaving the mouse where the tree had it — is a second location source
// wearing a disguise. Not dev-gated: silently losing an animal is worse than
// a loud failure.
export function projectLocations(
    grid: ColonyGrid,
    log: readonly MouseLocationRow[]
): ColonyGrid {
    const head = headLocations(log);
    const cageOfSlot = new Map<number, number>();
    for (const line of grid.lines)
        for (const cage of line.cages)
            for (const slot of cage.slots)
                cageOfSlot.set(slot.slotId, cage.cageId);

    const buckets = new Map<number, { mouse: MouseCell; order: number }[]>();
    for (const line of grid.lines)
        for (const cage of line.cages)
            for (const slot of cage.slots)
                for (const mouse of slot.mice) {
                    const row = head.get(mouse.metaId);
                    if (!row) {
                        throw new Error(
                            `Location log has no row for mouse ${mouse.metaId} — every mouse is placed by mintLocation.`
                        );
                    }
                    if (cageOfSlot.get(row.slotId) !== row.cageId) {
                        throw new Error(
                            `Location row ${row.locationId} names slot ${row.slotId} in cage ${row.cageId}, which do not belong together.`
                        );
                    }
                    const bucket = buckets.get(row.slotId) ?? [];
                    bucket.push({ mouse, order: row.locationId });
                    buckets.set(row.slotId, bucket);
                }

    return mapSlots(grid, (slot) => {
        const mice = (buckets.get(slot.slotId) ?? [])
            .sort((a, b) => a.order - b.order)
            .map((e) => e.mouse);
        const same =
            mice.length === slot.mice.length &&
            mice.every((m, i) => m === slot.mice[i]);
        return same ? slot : { ...slot, mice };
    });
}
