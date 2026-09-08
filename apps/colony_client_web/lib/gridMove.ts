import type { ColonyGrid, GridCage } from '@repo/types';

// Pure move core — mirrors the server's append-only move without any I/O.
// In the real backend a move INSERTs a new `mice` version row with the new
// cage_id/slot_id (prev_id = current head, CAS). Here we just recompute the
// derived "current state" tree the same way the API would return it, so the
// demo shows the exact post-move shape.

export interface MoveTarget {
    cageId: number;
    slotId?: number; // existing slot
    newSlotLabel?: string; // create a fresh slot in the target cage
}

// Returns a NEW colony with the mouse relocated. No-op-safe: if the mouse or
// target cage is missing, returns the input unchanged.
export function moveMouse(
    colony: ColonyGrid,
    metaId: number,
    target: MoveTarget
): ColonyGrid {
    const next: ColonyGrid = structuredClone(colony);

    // 1. detach the mouse from wherever it currently sits, dropping now-empty slots.
    let moved: import('@repo/types').MouseCell | undefined;
    for (const line of next.lines) {
        for (const cage of line.cages) {
            for (const slot of cage.slots) {
                const i = slot.mice.findIndex((m) => m.metaId === metaId);
                if (i >= 0) {
                    moved = slot.mice.splice(i, 1)[0];
                }
            }
            cage.slots = cage.slots.filter((s) => s.mice.length > 0);
        }
    }
    if (!moved) return colony;

    // 2. attach to the target cage / slot.
    const targetCage = findCage(next, target.cageId);
    if (!targetCage) return colony;

    if (target.slotId != null) {
        const slot = targetCage.slots.find((s) => s.slotId === target.slotId);
        if (!slot) return colony;
        slot.mice.push(moved);
    } else {
        targetCage.slots.push({
            slotId: nextSlotId(next),
            label: target.newSlotLabel?.trim() || 'NEW',
            mice: [moved],
        });
    }
    return next;
}

function findCage(colony: ColonyGrid, cageId: number): GridCage | undefined {
    for (const line of colony.lines) {
        const cage = line.cages.find((c) => c.cageId === cageId);
        if (cage) return cage;
    }
    return undefined;
}

// Demo-only surrogate id for a freshly created slot (real DB assigns it).
function nextSlotId(colony: ColonyGrid): number {
    let max = 0;
    for (const line of colony.lines) {
        for (const cage of line.cages) {
            for (const slot of cage.slots) {
                if (slot.slotId > max) max = slot.slotId;
            }
        }
    }
    return max + 1;
}
