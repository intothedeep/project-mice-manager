'use client';

import { useMemo } from 'react';
import { useSyncExternalStore } from 'react';
import type { ColonyGrid, MouseCell, Sex } from '@repo/types';
import { SEED_COLONY } from '@/apis/getColonyGrid.mock.api';
import { moveMouse, type MoveTarget } from '@/lib/gridMove';
import {
    extractLitterCode,
    formatLitterCode,
    parseLitterCode,
} from '@/lib/litterCode';

// Mock-era colony store. Seeded from SEED_COLONY (the static fixture); all
// writes produce a new tree (immutable — never mutate SEED_COLONY arrays).
//
// SERVER ERA SWAP: replace the `addMouse` body below with a POST to
// colony_server (mouse_meta INSERT + mice version-row INSERT). The litter /
// prev_id FK chain is a server concern — not modelled here. The store then
// becomes a thin react-query wrapper and this file is retired.

// ---- seed scanners ---------------------------------------------------------

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

// Highest cageId in the seed — the new-cage counter starts above it.
function maxCageId(grid: ColonyGrid): number {
    let max = 0;
    for (const l of grid.lines)
        for (const c of l.cages)
            if (c.cageId > max) max = c.cageId;
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

// Every cage number currently in the tree (cage_number is GLOBALLY unique).
// Used to reject a duplicate new-cage number at add time.
function cageNumberSet(grid: ColonyGrid): Set<string> {
    const set = new Set<string>();
    for (const l of grid.lines)
        for (const c of l.cages) set.add(c.cageNumber);
    return set;
}

// Scan every mouse renderedId in the seed, extract its litter code (ignoring
// pooled "+N" notation and ear-tag suffixes — those return null from
// extractLitterCode), and return the ordinal of the maximum code found.
// WHY this form: the first generated code is nextLitterOrd+1, so
// seeding from the max avoids re-issuing a code that already exists in data.
function maxSeedLitterOrdinal(grid: ColonyGrid): number {
    let max = 0;
    for (const l of grid.lines)
        for (const c of l.cages)
            for (const s of c.slots)
                for (const m of s.mice) {
                    const code = extractLitterCode(m.renderedId);
                    if (code === null) continue;
                    const ord = parseLitterCode(code);
                    if (ord !== null && ord > max) max = ord;
                }
    return max;
}

// ---- state -----------------------------------------------------------------

let state: ColonyGrid = SEED_COLONY;
let nextMetaId = maxMetaId(SEED_COLONY) + 1;
let nextSlotId = maxSlotId(SEED_COLONY) + 1;
let nextCageId = maxCageId(SEED_COLONY) + 1;

// Litter-code counter: the NEXT ordinal to hand out. Peek = formatLitterCode(nextLitterOrd).
// WHY separate ordinal: avoids re-parsing on every peek; increment is a single int bump.
let nextLitterOrd = maxSeedLitterOrdinal(SEED_COLONY) + 1;

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
// LATEST-FIRST (highest ordinal first). Computed at read time — not stored
// (compute-at-read discipline).
// WHY useMemo over direct: useSyncExternalStore returns the same state reference
// until the next emit, so the memo re-runs only on actual colony changes.
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
        // Sort descending by ordinal (latest first).
        return [...seen.entries()]
            .sort((a, b) => b[0] - a[0])
            .map(([, code]) => code);
    }, [grid]);
}

// Returns the next auto-generated litter code WITHOUT advancing the counter.
// Callers display this in the "+ new (auto): XYZ" option label.
export function peekNextLitterCode(): string {
    return formatLitterCode(nextLitterOrd);
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
    /**
     * Cage to place the mouse in (by cageId). Required unless newCageNumber is set.
     */
    cageId?: number;
    /** Existing slot in the cage (by slotId); if omitted, uses cage's first slot */
    slotId?: number;
    /**
     * NEW slot label to create in the cage (takes precedence over slotId).
     * Rejected if the label already exists anywhere (slots.label is global-unique).
     */
    newSlotLabel?: string;
    /** Optional genotype text; defaults to '?' */
    genotype?: string;
    /**
     * Create a new cage in the selected line with this number (globally unique).
     * When set, cageId is ignored; newSlotLabel is REQUIRED (new cage has no slots).
     */
    newCageNumber?: number;
    /**
     * Line to create the new cage in. Required when newCageNumber is set.
     */
    lineId?: number;
}

// addMouse result — ok on success, else a human-readable reason.
export type AddMouseResult = { ok: true } | { ok: false; error: string };

// Compose renderedId = sex + pupNumber + litterCode (e.g. F + 9 + BCW = "F9BCW").
function composeRenderedId(sex: Sex, pupNumber: number, litterCode: string): string {
    return `${sex}${pupNumber}${litterCode}`;
}

// Build a MouseCell from AddMouseInput. Extracted to avoid duplicating the
// literal across the new-cage and existing-cage insert paths.
function buildMouseCell(input: AddMouseInput, litterCode: string): MouseCell {
    return {
        metaId: nextMetaId++,
        renderedId: composeRenderedId(input.sex, input.pupNumber, litterCode),
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
}

// addMouse: appends a new MouseCell into the target slot. Placement resolution:
//   NEW CAGE PATH (newCageNumber set):
//     1. reject if cage number already exists colony-wide
//     2. require newSlotLabel (new cage needs a slot defined)
//     3. dedupe new slot label globally
//     4. create cage + slot in the specified line
//   EXISTING CAGE PATH (cageId set):
//     1. resolve cage
//     2. newSlotLabel → create slot (global-unique dedupe)
//     3. slotId       → use that slot
//     4. neither      → cage's first existing slot
// Emits so all subscribers re-render. Returns a result so the caller can
// surface validation rejections.
export function addMouse(input: AddMouseInput): AddMouseResult {
    const litterCode = input.litterCode.trim();
    const isNewCagePath = input.newCageNumber !== undefined;
    const newLabel = input.newSlotLabel?.trim();

    if (isNewCagePath) {
        // NEW CAGE PATH — validate upfront before any counter increment or mutation.
        const cageNumStr = String(input.newCageNumber);
        if (cageNumberSet(state).has(cageNumStr)) {
            return {
                ok: false,
                error: `Cage number "${input.newCageNumber}" already exists — cage numbers are unique colony-wide.`,
            };
        }

        // A new cage must define its first slot label.
        if (!newLabel) {
            return {
                ok: false,
                error: 'A new cage requires a slot label — provide a new slot label.',
            };
        }

        // Even for a new cage the slot label must be globally unique.
        if (slotLabelSet(state).has(newLabel.toLowerCase())) {
            return {
                ok: false,
                error: `Slot label "${newLabel}" already exists — labels are unique colony-wide.`,
            };
        }

        const line = state.lines.find((l) => l.lineId === input.lineId);
        if (!line) {
            return { ok: false, error: 'Selected line no longer exists.' };
        }

        const mouse = buildMouseCell(input, litterCode);
        const newCageId = nextCageId++;
        const newSlotId = nextSlotId++;

        state = {
            ...state,
            lines: state.lines.map((l) => {
                if (l.lineId !== input.lineId) return l;
                return {
                    ...l,
                    cages: [
                        ...l.cages,
                        {
                            cageId: newCageId,
                            cageNumber: cageNumStr,
                            location: null,
                            slots: [{ slotId: newSlotId, label: newLabel, mice: [mouse] }],
                        },
                    ],
                };
            }),
        };

        advanceLitterCounter(litterCode);

        emit();
        return { ok: true };
    }

    // --- EXISTING CAGE PATH ---
    const cage = state.lines
        .flatMap((l) => l.cages)
        .find((c) => c.cageId === input.cageId);
    if (!cage) {
        return { ok: false, error: 'Selected cage no longer exists.' };
    }

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

    const mouse = buildMouseCell(input, litterCode);

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

    advanceLitterCounter(litterCode);

    emit();
    return { ok: true };
}

// Keep the auto counter strictly AHEAD of any code that lands in the colony.
// WHY max (not "bump only on peek match"): a manually-typed code above the
// current peek would otherwise leave the auto option proposing a code that now
// exists as a real litter — the user would think "new litter" but join an old
// one. Math.max makes the next peek always fresh regardless of how the code got in.
function advanceLitterCounter(litterCode: string): void {
    const ord = parseLitterCode(litterCode);
    if (ord !== null) nextLitterOrd = Math.max(nextLitterOrd, ord + 1);
}

// applyColonyMove: wraps gridMove.moveMouse and emits so the grid re-renders.
// Called by ColonyGridView in place of the former local setColony.
export function applyColonyMove(metaId: number, target: MoveTarget): void {
    state = moveMouse(state, metaId, target);
    emit();
}
