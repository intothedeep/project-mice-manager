'use client';

import { useMemo } from 'react';
import { useSyncExternalStore } from 'react';
import type { ColonyGrid, PunchHistoryEntry } from '@repo/types';
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
    seedPunchLog,
} from '@/lib/colonySeed';
import {
    addMouse as pureAddMouse,
    addSlot as pureAddSlot,
    addCage as pureAddCage,
    addLine as pureAddLine,
    type AddMouseInput,
    type AddSlotInput,
    type AddCageInput,
    type AddLineInput,
    type AddLineResult,
} from '@/lib/colonyMutations';
import {
    updateMouse as pureUpdateMouse,
    type UpdateMousePatch,
} from '@/lib/updateMouse';
import {
    addPunch as pureAddPunch,
    removePunch as pureRemovePunch,
    type AddPunchInput,
    type RemovePunchInput,
} from '@/lib/punchMutations';
import {
    suggestNextCageNumber as pureSuggestNextCageNumber,
    projectPunches,
    type ColonyState,
    type MouseSpec,
    type AddMouseResult,
    type Counters,
} from '@/lib/colonyMutationHelpers';

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
    AddPunchInput,
    RemovePunchInput,
};

// ---- state -----------------------------------------------------------------

// punchLog is the SINGLE SOURCE (colonyMutationHelpers.ts header) — it seeds
// from every punch row already in SEED_COLONY (the seed carries ACTIVE rows
// only, so no seeded entry starts tombstoned), and `grid` is projectPunches'
// derived view over it from the very first snapshot.
const initialPunchLog = seedPunchLog(SEED_COLONY);
let state: ColonyState = {
    grid: projectPunches(SEED_COLONY, initialPunchLog),
    punchLog: initialPunchLog,
};
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
        () => state.grid,
        () => state.grid
    );
}

// Punch HISTORY for one mouse — mirrors useTaskLog's shape (subscribe to the
// whole append-only log, no separate cache): the log is reassigned, never
// mutated, on every write, so filtering it here is cheap and the returned
// array is a fresh reference only when the underlying log actually changed.
// Under option B this is the drawer's ONLY route to a removed punch's
// deletedAt — MouseCell.punches never carries it (plan §4).
export function usePunchLog(metaId: number): PunchHistoryEntry[] {
    const log = useSyncExternalStore(
        subscribe,
        () => state.punchLog,
        () => state.punchLog
    );
    return useMemo(() => log.filter((e) => e.metaId === metaId), [log, metaId]);
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
    return pureSuggestNextCageNumber(state.grid);
}

// ---- public writes (thin wrappers) -----------------------------------------

// Shared by every write below: commit state/counters only when the pure
// function actually produced a new state (the no-op/failure paths return the
// SAME state reference back), emit only then. All six pure mutations now
// take/return ColonyState (grid + punchLog) — addMouse's creation punch is
// minted straight into punchLog by the pure layer (colonyMutations.ts), so
// there is no separate seam to close here any more.
function commit<R extends { ok: boolean }>(r: {
    state: ColonyState;
    counters: Counters;
    result: R;
}): R {
    counters = r.counters;
    if (r.state !== state) {
        state = r.state;
        emit();
    }
    return r.result;
}

export function addMouse(input: AddMouseInput): AddMouseResult {
    return commit(pureAddMouse(state, counters, input));
}

export function addSlot(input: AddSlotInput): AddMouseResult {
    return commit(pureAddSlot(state, counters, input));
}

export function addCage(input: AddCageInput): AddMouseResult {
    return commit(pureAddCage(state, counters, input));
}

export function addLine(input: AddLineInput): AddLineResult {
    return commit(pureAddLine(state, counters, input));
}

export function updateMouse(
    metaId: number,
    patch: UpdateMousePatch
): AddMouseResult {
    const r = pureUpdateMouse(state.grid, counters, metaId, patch);
    counters = r.counters;
    // Only emit when the grid reference actually changed (no-op guard).
    if (r.state !== state.grid) {
        state = { ...state, grid: r.state };
        emit();
    }
    return r.result;
}

export function addPunch(input: AddPunchInput): AddMouseResult {
    return commit(pureAddPunch(state, counters, input));
}

export function removePunch(input: RemovePunchInput): AddMouseResult {
    return commit(pureRemovePunch(state, counters, input));
}

// applyColonyMove: wraps gridMove.moveMouse and emits so the grid re-renders.
export function applyColonyMove(metaId: number, target: MoveTarget): void {
    state = { ...state, grid: moveMouse(state.grid, metaId, target) };
    emit();
}
