'use client';

import { useMemo } from 'react';
import { useSyncExternalStore } from 'react';
import type { ColonyGrid } from '@repo/types';
import { SEED_COLONY } from '@/apis/getColonyGrid.mock.api';
import { moveMouse, type MoveTarget } from '@/lib/gridMove';
import {
    extractLitterCode,
    formatLitterCode,
    parseLitterCode,
} from '@/lib/litterCode';
import {
    maxMetaId,
    maxSlotId,
    maxCageId,
    maxLineId,
    maxSeedLitterOrdinal,
} from '@/lib/colonySeed';
import {
    addMouse as purAddMouse,
    updateMouse as pureUpdateMouse,
    addLine as pureAddLine,
    type AddMouseInput,
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
export type { AddMouseInput, UpdateMousePatch, AddMouseResult, AddLineInput, AddLineResult };

// ---- state -----------------------------------------------------------------

let state: ColonyGrid = SEED_COLONY;
let counters: Counters = {
    nextMetaId: maxMetaId(SEED_COLONY) + 1,
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
                        const code = extractLitterCode(m.renderedId);
                        if (code === null) continue;
                        const ord = parseLitterCode(code);
                        if (ord !== null) seen.set(ord, code);
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

// ---- public writes (thin wrappers) -----------------------------------------

export function addMouse(input: AddMouseInput): AddMouseResult {
    const r = purAddMouse(state, counters, input);
    if (r.result.ok) {
        state = r.state;
        counters = r.counters;
        emit();
    }
    return r.result;
}

export function updateMouse(metaId: number, patch: UpdateMousePatch): AddMouseResult {
    const r = pureUpdateMouse(state, counters, metaId, patch);
    counters = r.counters;
    // Only emit when state reference actually changed (no-op guard).
    if (r.state !== state) {
        state = r.state;
        emit();
    }
    return r.result;
}

export function addLine(input: AddLineInput): AddLineResult {
    const r = pureAddLine(state, counters, input);
    if (r.result.ok) {
        state = r.state;
        counters = r.counters;
        emit();
    }
    return r.result;
}

// applyColonyMove: wraps gridMove.moveMouse and emits so the grid re-renders.
export function applyColonyMove(metaId: number, target: MoveTarget): void {
    state = moveMouse(state, metaId, target);
    emit();
}
