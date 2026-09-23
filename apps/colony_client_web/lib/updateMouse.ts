// Pure mutation: (state, counters, metaId, patch) → { state, counters, result }
// No side effects — callers (mockColonyStore.ts) reassign cells and emit.
// SERVER ERA SWAP: becomes a PATCH-body builder; the store wrapper calls the
// server and updates the local read-model from the response.
//
// Split out of colonyMutations.ts (P0.7-b 8b): updateMouse edits an existing
// mouse and shares no call chain with the four add mutations — only the
// Counters/AddMouseResult shapes and the mapMice walker in
// colonyMutationHelpers.ts.

import type { ColonyGrid, MouseCell, Sex, SignalColor } from '@repo/types';
import {
    mapMice,
    type AddMouseResult,
    type Counters,
} from '@/lib/colonyMutationHelpers';

export interface UpdateMousePatch {
    sex?: Sex;
    genotype?: string;
    dob?: string;
    signal?: SignalColor;
    isAlive?: boolean;
}

export function updateMouse(
    state: ColonyGrid,
    counters: Counters,
    metaId: number,
    patch: UpdateMousePatch
): { state: ColonyGrid; counters: Counters; result: AddMouseResult } {
    let current: MouseCell | undefined;
    for (const l of state.lines)
        for (const c of l.cages)
            for (const s of c.slots)
                for (const m of s.mice)
                    if (m.metaId === metaId) {
                        current = m;
                        break;
                    }

    if (!current) {
        return {
            state,
            counters,
            result: { ok: false, error: `Mouse ${metaId} not found.` },
        };
    }

    const updated: MouseCell = { ...current };
    let changed = false;
    const newLitterOrd = counters.nextLitterOrd;

    if (patch.sex !== undefined && patch.sex !== current.sex) {
        updated.sex = patch.sex;
        changed = true;
    }

    if (patch.genotype !== undefined) {
        const newGeno = patch.genotype.trim() || '?';
        if (newGeno !== current.genotype) {
            updated.genotype = newGeno;
            updated.genotypeColor = null; // old color is a lie for new genotype
            changed = true;
        }
    }

    if (patch.dob !== undefined && patch.dob !== current.dob) {
        updated.dob = patch.dob || null;
        changed = true;
    }

    if (patch.signal !== undefined && patch.signal !== current.signal) {
        updated.signal = patch.signal;
        changed = true;
    }

    if (patch.isAlive !== undefined && patch.isAlive !== current.isAlive) {
        updated.isAlive = patch.isAlive;
        changed = true;
    }

    // No-op: return same state reference so the wrapper skips emit.
    if (!changed)
        return {
            state,
            counters: { ...counters, nextLitterOrd: newLitterOrd },
            result: { ok: true },
        };

    const newState: ColonyGrid = mapMice(state, (m) =>
        m.metaId === metaId ? updated : m
    );

    return {
        state: newState,
        counters: { ...counters, nextLitterOrd: newLitterOrd },
        result: { ok: true },
    };
}
