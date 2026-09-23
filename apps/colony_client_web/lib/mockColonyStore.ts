'use client';

import { useMemo } from 'react';
import { useSyncExternalStore } from 'react';
import type { ColonyGrid, PunchRow } from '@repo/types';
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
    seedPunches,
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
    suggestNextCageCode as pureSuggestNextCageCode,
    projectPunches,
    assertPunchInvariants,
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

// punches is the SINGLE SOURCE (colonyMutationHelpers.ts header) — it seeds
// from every punch row already in SEED_COLONY (the seed carries ACTIVE rows
// only, so no seeded entry starts tombstoned), and `grid` is projectPunches'
// derived view over it from the very first snapshot.
const initialPunches = seedPunches(SEED_COLONY);
let state: ColonyState = {
    grid: projectPunches(SEED_COLONY, initialPunches),
    punches: initialPunches,
};
let counters: Counters = {
    nextMetaId: maxMetaId(SEED_COLONY) + 1,
    nextPunchId: maxPunchId(SEED_COLONY) + 1,
    nextSlotId: maxSlotId(SEED_COLONY) + 1,
    nextCageId: maxCageId(SEED_COLONY) + 1,
    nextLitterOrd: maxSeedLitterOrdinal(SEED_COLONY) + 1,
    nextLineId: maxLineId(SEED_COLONY) + 1,
};
// Guard the seed itself — colonySeed.seedPunches is a legitimate third
// PunchRow constructor (beside mintPunch and the store's own normalisation)
// that this invariant would otherwise never see.
assertPunchInvariants(initialPunches, counters);

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
export function usePunches(metaId: number): PunchRow[] {
    const log = useSyncExternalStore(
        subscribe,
        () => state.punches,
        () => state.punches
    );
    return useMemo(() => log.filter((e) => e.metaId === metaId), [log, metaId]);
}

// Returns the DISTINCT litter codes currently present in the colony, sorted
// LATEST-FIRST (highest ordinal first) with 'WT' PINNED to the top. Computed
// at read time — not stored.
//
// WHY the pin: 'WT' is the standing wild-type label (litterCode.ts header), not
// a generated litter, and its ordinal 618 sits below the 703 generator floor —
// a plain descending sort would bury the colony's most-used code at the bottom
// of the picker.
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
        const rank = (ord: number, code: string) =>
            code === 'WT' ? Infinity : ord;
        return [...seen.entries()]
            .sort((a, b) => rank(b[0], b[1]) - rank(a[0], a[1]))
            .map(([, code]) => code);
    }, [grid]);
}

// Returns the next auto-generated litter code WITHOUT advancing the counter.
export function peekNextLitterCode(): string {
    return formatLitterCode(counters.nextLitterOrd);
}

// Suggested next cage code for the "new cage" field default — read-only,
// derived from current state (no counter advance).
export function suggestNextCageCode(): string {
    return pureSuggestNextCageCode(state.grid);
}

// ---- public writes (thin wrappers) -----------------------------------------

// Shared by every write below: commit state/counters only when the pure
// function actually produced a new state (the no-op/failure paths return the
// SAME state reference back), emit only then. All six pure mutations now
// take/return ColonyState (grid + punches) — addMouse's creation punch is
// minted straight into punches by the pure layer (colonyMutations.ts), so
// there is no separate seam to close here any more.
function commit<R extends { ok: boolean }>(r: {
    state: ColonyState;
    counters: Counters;
    result: R;
}): R {
    // Assert BEFORE assigning anything: assertPunchInvariants throws, and a
    // rejected write that had already advanced `counters` would leave the id
    // sequence one ahead with nothing committed.
    if (r.state !== state) {
        assertPunchInvariants(r.state.punches, r.counters);
        counters = r.counters;
        state = r.state;
        emit();
    } else {
        counters = r.counters;
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
