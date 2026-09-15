'use client';

import { useSyncExternalStore } from 'react';
import type { ColonyGrid, MouseCell, Sex } from '@repo/types';
import { SEED_COLONY } from '@/apis/getColonyGrid.mock.api';
import { moveMouse, type MoveTarget } from '@/lib/gridMove';

// Mock-era colony store. Seeded from SEED_COLONY (the static fixture); all
// writes produce a new tree (immutable — never mutate SEED_COLONY arrays).
//
// SERVER ERA SWAP: replace the `addMouse` body below with a POST to
// colony_server (mouse_meta INSERT + mice version-row INSERT). The litter /
// prev_id FK chain is a server concern — not modelled here. The store then
// becomes a thin react-query wrapper and this file is retired.

// ---- state -----------------------------------------------------------------

// Compute the highest metaId in the seed once — counter starts above it.
function maxMetaId(grid: ColonyGrid): number {
    let max = 0;
    for (const l of grid.lines)
        for (const c of l.cages)
            for (const s of c.slots)
                for (const m of s.mice)
                    if (m.metaId > max) max = m.metaId;
    return max;
}

// Highest slotId in the seed — the new-slot counter starts above it.
function maxSlotId(grid: ColonyGrid): number {
    let max = 0;
    for (const l of grid.lines)
        for (const c of l.cages)
            for (const s of c.slots) if (s.slotId > max) max = s.slotId;
    return max;
}

// Every slot label currently in the tree (slots.label is GLOBALLY unique —
// not scoped by cage). Used to reject a duplicate new-slot label at add time.
function slotLabelSet(grid: ColonyGrid): Set<string> {
    const set = new Set<string>();
    for (const l of grid.lines)
        for (const c of l.cages)
            for (const s of c.slots) set.add(s.label.toLowerCase());
    return set;
}

let state: ColonyGrid = SEED_COLONY;
let nextMetaId = maxMetaId(SEED_COLONY) + 1;
let nextSlotId = maxSlotId(SEED_COLONY) + 1;

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

// ---- public writes ---------------------------------------------------------

// AddMouseInput — local type; NOT exported to @repo/types (mock-only shape).
// Fields the dialog collects; the store derives the full MouseCell from them.
export interface AddMouseInput {
    sex: Sex;
    /** Litter code, e.g. "BCW" */
    litterCode: string;
    /** Pup number within the litter, e.g. 9 */
    pupNumber: number;
    /** ISO date of birth, e.g. "2026-09-14" */
    dob: string;
    /** Cage to place the mouse in (by cageId) */
    cageId: number;
    /** Existing slot in the cage (by slotId); if omitted, uses cage's first slot */
    slotId?: number;
    /**
     * NEW slot label to create in the cage (takes precedence over slotId).
     * Rejected if the label already exists anywhere (slots.label is global-unique).
     */
    newSlotLabel?: string;
    /** Optional genotype text; defaults to '?' */
    genotype?: string;
}

// addMouse result — ok on success, else a human-readable reason (the only
// current failure is a duplicate new-slot label, which the dialog surfaces).
export type AddMouseResult = { ok: true } | { ok: false; error: string };

// Compose renderedId = sex + pupNumber + litterCode (e.g. F + 9 + BCW = "F9BCW").
function composeRenderedId(sex: Sex, pupNumber: number, litterCode: string): string {
    return `${sex}${pupNumber}${litterCode}`;
}

// addMouse: appends a new MouseCell into the target slot. Slot resolution:
//   1. newSlotLabel → create a new slot in the cage (global-unique dedupe first)
//   2. slotId       → an existing slot in the cage
//   3. neither      → the cage's first existing slot
// Emits so all subscribers re-render. Returns a result so the caller can
// surface a duplicate-label rejection.
export function addMouse(input: AddMouseInput): AddMouseResult {
    // --- Validate placement UPFRONT so we never burn a metaId / emit on a
    //     no-op. The mouse must land in exactly one slot, or we reject.
    const cage = state.lines
        .flatMap((l) => l.cages)
        .find((c) => c.cageId === input.cageId);
    if (!cage) {
        return { ok: false, error: 'Selected cage no longer exists.' };
    }

    const newLabel = input.newSlotLabel?.trim();
    if (newLabel && slotLabelSet(state).has(newLabel.toLowerCase())) {
        return {
            ok: false,
            error: `Slot label "${newLabel}" already exists — labels are unique colony-wide.`,
        };
    }

    // Resolve the destination slot: new label → (created below); else explicit
    // slotId → cage's first existing slot. With no new label and no slot, reject.
    const targetSlotId = newLabel
        ? null
        : (input.slotId ?? cage.slots[0]?.slotId ?? null);
    if (!newLabel && targetSlotId == null) {
        return {
            ok: false,
            error: 'Cage has no slot — create a new slot label to place the mouse.',
        };
    }

    const mouse: MouseCell = {
        metaId: nextMetaId++,
        renderedId: composeRenderedId(input.sex, input.pupNumber, input.litterCode),
        sex: input.sex,
        genotype: input.genotype?.trim() || '?',
        // signal 'done' = default/black (grid.ts §SignalColor: "done → black text, default").
        signal: 'done',
        isAlive: true,
        attention: null,
        dob: input.dob,
        // genotypeColor stays null: the mock does not run the GENO lookup table here.
        // The server era will resolve this from color_assignments before serializing.
        genotypeColor: null,
        mates: [],
    };

    // Rebuild the tree immutably so useSyncExternalStore detects the reference change.
    state = {
        ...state,
        lines: state.lines.map((line) => ({
            ...line,
            cages: line.cages.map((c) => {
                if (c.cageId !== input.cageId) return c;

                // NEW slot: create it (dedupe already passed) and drop the mouse in.
                if (newLabel) {
                    const newSlot = {
                        slotId: nextSlotId++,
                        label: newLabel,
                        mice: [mouse],
                    };
                    return { ...c, slots: [...c.slots, newSlot] };
                }

                return {
                    ...c,
                    slots: c.slots.map((slot) =>
                        slot.slotId === targetSlotId
                            ? { ...slot, mice: [...slot.mice, mouse] }
                            : slot
                    ),
                };
            }),
        })),
    };

    emit();
    return { ok: true };
}

// applyColonyMove: wraps gridMove.moveMouse and emits so the grid re-renders.
// Called by ColonyGridView in place of the former local setColony.
export function applyColonyMove(metaId: number, target: MoveTarget): void {
    state = moveMouse(state, metaId, target);
    emit();
}
