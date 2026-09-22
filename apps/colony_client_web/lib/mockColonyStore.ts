'use client';

import { useMemo } from 'react';
import { useSyncExternalStore } from 'react';
import type { ColonyGrid } from '@repo/types';
import { SEED_COLONY } from '@/apis/getColonyGrid.mock.api';
import { moveMouse, type MoveTarget } from '@/lib/gridMove';
import { formatLitterCode, parseLitterCode } from '@/lib/litterCode';
import {
    maxMetaId,
    maxPunchId,
    maxSlotId,
    maxCageId,
    maxLineId,
    maxSeedLitterOrdinal,
} from '@/lib/colonySeed';
import {
    addMouse as pureAddMouse,
    addSlot as pureAddSlot,
    addCage as pureAddCage,
    updateMouse as pureUpdateMouse,
    addLine as pureAddLine,
    suggestNextCageNumber as pureSuggestNextCageNumber,
    type MouseSpec,
    type AddMouseInput,
    type AddSlotInput,
    type AddCageInput,
    type UpdateMousePatch,
    type AddMouseResult,
    type AddLineInput,
    type AddLineResult,
    type Counters,
} from '@/lib/colonyMutations';

// Mock-era colony store. Seeded from SEED_COLONY (the static fixture); all
// writes produce a new tree (immutable — never mutate SEED_COLONY arrays).
//
// SERVER ERA SWAP: replace the wrapper bodies below with POSTs to colony_server.
// The store then becomes a thin react-query wrapper and this file is retired.

// Re-export types consumed by the view layer so its imports stay stable.
export type {
    MouseSpec,
    AddMouseInput,
    AddSlotInput,
    AddCageInput,
    UpdateMousePatch,
    AddMouseResult,
    AddLineInput,
    AddLineResult,
};

// ---- state -----------------------------------------------------------------

let state: ColonyGrid = SEED_COLONY;
let counters: Counters = {
    nextMetaId: maxMetaId(SEED_COLONY) + 1,
    nextPunchId: maxPunchId(SEED_COLONY) + 1,
    nextSlotId: maxSlotId(SEED_COLONY) + 1,
    nextCageId: maxCageId(SEED_COLONY) + 1,
    nextLitterOrd: maxSeedLitterOrdinal(SEED_COLONY) + 1,
    nextLineId: maxLineId(SEED_COLONY) + 1,
};

// ---- subscription ----------------------------------------------------------

const listeners = new Set<() => void>();

function emit(): void {
    listeners.forEach((l) => l());
}

function subscribe(fn: () => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

// ---- public reads ----------------------------------------------------------

export function useColonyGrid(): ColonyGrid {
    return useSyncExternalStore(
        subscribe,
        () => state,
        () => state
    );
}

// Returns the DISTINCT litter codes currently present in the colony, sorted
// LATEST-FIRST (highest ordinal first). Computed at read time — not stored.
export function useLitterCodes(): string[] {
    const grid = useColonyGrid();
    return useMemo(() => {
        const seen = new Map<number, string>(); // ord → code
        for (const l of grid.lines)
            for (const c of l.cages)
                for (const s of c.slots)
                    for (const m of s.mice) {
                        // litterCode is a first-class field now — read it
                        // directly instead of parsing it back out of a label.
                        const ord = parseLitterCode(m.litterCode);
                        if (ord !== null) seen.set(ord, m.litterCode);
                    }
        return [...seen.entries()]
            .sort((a, b) => b[0] - a[0])
            .map(([, code]) => code);
    }, [grid]);
}

// Returns the next auto-generated litter code WITHOUT advancing the counter.
export function peekNextLitterCode(): string {
    return formatLitterCode(counters.nextLitterOrd);
}

// Suggested next cage number for the "new cage" field default — read-only,
// derived from current state (no counter advance).
export function suggestNextCageNumber(): string {
    return pureSuggestNextCageNumber(state);
}

// ---- public writes (thin wrappers) -----------------------------------------

// Shared by every mutation below: commit state/counters only on success, emit
// only when something actually changed.
function commitIfOk<R extends { ok: boolean }>(r: {
    state: ColonyGrid;
    counters: Counters;
    result: R;
}): R {
    if (r.result.ok) {
        state = r.state;
        counters = r.counters;
        emit();
    }
    return r.result;
}

export function addMouse(input: AddMouseInput): AddMouseResult {
    return commitIfOk(pureAddMouse(state, counters, input));
}

export function addSlot(input: AddSlotInput): AddMouseResult {
    return commitIfOk(pureAddSlot(state, counters, input));
}

export function addCage(input: AddCageInput): AddMouseResult {
    return commitIfOk(pureAddCage(state, counters, input));
}

export function addLine(input: AddLineInput): AddLineResult {
    return commitIfOk(pureAddLine(state, counters, input));
}

export function updateMouse(
    metaId: number,
    patch: UpdateMousePatch
): AddMouseResult {
    const r = pureUpdateMouse(state, counters, metaId, patch);
    counters = r.counters;
    // Only emit when state reference actually changed (no-op guard).
    if (r.state !== state) {
        state = r.state;
        emit();
    }
    return r.result;
}

// applyColonyMove: wraps gridMove.moveMouse and emits so the grid re-renders.
export function applyColonyMove(metaId: number, target: MoveTarget): void {
    state = moveMouse(state, metaId, target);
    emit();
}
