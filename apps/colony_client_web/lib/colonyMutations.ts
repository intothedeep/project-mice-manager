// Pure mutation functions: (state, counters, input) → { state, counters, result }
// No side effects — callers (mockColonyStore.ts) reassign cells and emit.
// SERVER ERA SWAP: these become POST-body builders; the store wrappers call the
// server and update the local read-model from the response.

import type { ColonyGrid, GridLine, MouseCell, Sex, SignalColor } from '@repo/types';
import { extractLitterCode, parseLitterCode, formatLitterCode } from '@/lib/litterCode';
import { slotLabelSet, cageNumberSet, renderedIdSet } from '@/lib/colonySeed';

// ---- types ------------------------------------------------------------------

export interface Counters {
    nextMetaId: number;
    nextSlotId: number;
    nextCageId: number;
    nextLitterOrd: number;
    nextLineId: number;
}

export interface AddMouseInput {
    sex: Sex;
    litterCode: string;
    pupNumber: number;
    dob: string;
    cageId?: number;
    slotId?: number;
    /** Globally-unique new slot label — takes precedence over slotId. */
    newSlotLabel?: string;
    genotype?: string;
    /** Create a new cage with this number (globally unique); newSlotLabel required. */
    newCageNumber?: number;
    lineId?: number;
}

export interface UpdateMousePatch {
    renderedId?: string;
    sex?: Sex;
    genotype?: string;
    dob?: string;
    signal?: SignalColor;
    isAlive?: boolean;
}

export type AddMouseResult = { ok: true } | { ok: false; error: string };

export interface AddLineInput {
    lineName: string;
    nominalGenotypeColor?: string | null;
}

export type AddLineResult = { ok: true; lineId: number } | { ok: false; error: string };

// ---- helpers ----------------------------------------------------------------

export function composeRenderedId(sex: Sex, pupNumber: number, litterCode: string): string {
    return `${sex}${pupNumber}${litterCode}`;
}

export function buildMouseCell(input: AddMouseInput, litterCode: string, metaId: number): MouseCell {
    return {
        metaId,
        renderedId: composeRenderedId(input.sex, input.pupNumber, litterCode),
        sex: input.sex,
        genotype: input.genotype?.trim() || '?',
        signal: 'done',
        isAlive: true,
        attention: null,
        dob: input.dob,
        genotypeColor: null,
        mates: [],
    };
}

// WHY max: a manually-typed code above peek keeps the auto option from proposing
// a code that already exists as a real litter.
export function advanceLitterCounter(litterCode: string, nextLitterOrd: number): number {
    const ord = parseLitterCode(litterCode);
    if (ord !== null) return Math.max(nextLitterOrd, ord + 1);
    return nextLitterOrd;
}

// ---- pure mutations ---------------------------------------------------------

export function addMouse(
    state: ColonyGrid,
    counters: Counters,
    input: AddMouseInput
): { state: ColonyGrid; counters: Counters; result: AddMouseResult } {
    const litterCode = input.litterCode.trim();
    const isNewCagePath = input.newCageNumber !== undefined;
    const newLabel = input.newSlotLabel?.trim();

    if (isNewCagePath) {
        const cageNumStr = String(input.newCageNumber);
        if (cageNumberSet(state).has(cageNumStr)) {
            return { state, counters, result: { ok: false, error: `Cage number "${input.newCageNumber}" already exists — cage numbers are unique colony-wide.` } };
        }
        if (!newLabel) {
            return { state, counters, result: { ok: false, error: 'A new cage requires a slot label — provide a new slot label.' } };
        }
        if (slotLabelSet(state).has(newLabel.toLowerCase())) {
            return { state, counters, result: { ok: false, error: `Slot label "${newLabel}" already exists — labels are unique colony-wide.` } };
        }
        const line = state.lines.find((l) => l.lineId === input.lineId);
        if (!line) {
            return { state, counters, result: { ok: false, error: 'Selected line no longer exists.' } };
        }

        const nextMeta = counters.nextMetaId;
        const nextCage = counters.nextCageId;
        const nextSlot = counters.nextSlotId;
        const mouse = buildMouseCell(input, litterCode, nextMeta);
        const newLitterOrd = advanceLitterCounter(litterCode, counters.nextLitterOrd);

        const newState: ColonyGrid = {
            ...state,
            lines: state.lines.map((l) => {
                if (l.lineId !== input.lineId) return l;
                return {
                    ...l,
                    cages: [
                        ...l.cages,
                        {
                            cageId: nextCage,
                            cageNumber: cageNumStr,
                            location: null,
                            slots: [{ slotId: nextSlot, label: newLabel, mice: [mouse] }],
                        },
                    ],
                };
            }),
        };

        return {
            state: newState,
            counters: { ...counters, nextMetaId: nextMeta + 1, nextCageId: nextCage + 1, nextSlotId: nextSlot + 1, nextLitterOrd: newLitterOrd },
            result: { ok: true },
        };
    }

    // --- EXISTING CAGE PATH ---
    const cage = state.lines.flatMap((l) => l.cages).find((c) => c.cageId === input.cageId);
    if (!cage) {
        return { state, counters, result: { ok: false, error: 'Selected cage no longer exists.' } };
    }
    if (newLabel && slotLabelSet(state).has(newLabel.toLowerCase())) {
        return { state, counters, result: { ok: false, error: `Slot label "${newLabel}" already exists — labels are unique colony-wide.` } };
    }

    const targetSlotId = newLabel ? null : (input.slotId ?? cage.slots[0]?.slotId ?? null);
    if (!newLabel && targetSlotId == null) {
        return { state, counters, result: { ok: false, error: 'Cage has no slot — create a new slot label to place the mouse.' } };
    }

    const nextMeta = counters.nextMetaId;
    const nextSlot = counters.nextSlotId;
    const mouse = buildMouseCell(input, litterCode, nextMeta);
    const newLitterOrd = advanceLitterCounter(litterCode, counters.nextLitterOrd);

    const newState: ColonyGrid = {
        ...state,
        lines: state.lines.map((line) => ({
            ...line,
            cages: line.cages.map((c) => {
                if (c.cageId !== input.cageId) return c;
                if (newLabel) {
                    return { ...c, slots: [...c.slots, { slotId: nextSlot, label: newLabel, mice: [mouse] }] };
                }
                return {
                    ...c,
                    slots: c.slots.map((slot) =>
                        slot.slotId === targetSlotId ? { ...slot, mice: [...slot.mice, mouse] } : slot
                    ),
                };
            }),
        })),
    };

    const newCounters: Counters = { ...counters, nextMetaId: nextMeta + 1, nextLitterOrd: newLitterOrd };
    if (newLabel) newCounters.nextSlotId = nextSlot + 1;

    return { state: newState, counters: newCounters, result: { ok: true } };
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
                    if (m.metaId === metaId) { current = m; break; }

    if (!current) {
        return { state, counters, result: { ok: false, error: `Mouse ${metaId} not found.` } };
    }

    if (patch.renderedId !== undefined) {
        const newId = patch.renderedId.trim();
        if (newId.toLowerCase() !== current.renderedId.toLowerCase()) {
            const ids = renderedIdSet(state);
            ids.delete(current.renderedId.toLowerCase());
            if (ids.has(newId.toLowerCase())) {
                return { state, counters, result: { ok: false, error: `ID "${newId}" already exists — mouse IDs are unique colony-wide.` } };
            }
        }
    }

    const updated: MouseCell = { ...current };
    let changed = false;
    let newLitterOrd = counters.nextLitterOrd;

    if (patch.renderedId !== undefined) {
        const newId = patch.renderedId.trim();
        if (newId.toLowerCase() !== current.renderedId.toLowerCase()) {
            updated.renderedId = newId;
            changed = true;
            const firstChar = newId[0]?.toUpperCase();
            if (firstChar === 'M' || firstChar === 'F' || firstChar === 'U') {
                updated.sex = firstChar as Sex;
            }
            const code = extractLitterCode(newId);
            if (code) newLitterOrd = advanceLitterCounter(code, newLitterOrd);
        }
    }

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
    if (!changed) return { state, counters: { ...counters, nextLitterOrd: newLitterOrd }, result: { ok: true } };

    const newState: ColonyGrid = {
        ...state,
        lines: state.lines.map((l) => ({
            ...l,
            cages: l.cages.map((c) => ({
                ...c,
                slots: c.slots.map((s) => ({
                    ...s,
                    mice: s.mice.map((m) => (m.metaId === metaId ? updated : m)),
                })),
            })),
        })),
    };

    return { state: newState, counters: { ...counters, nextLitterOrd: newLitterOrd }, result: { ok: true } };
}

export function addLine(
    state: ColonyGrid,
    counters: Counters,
    input: AddLineInput
): { state: ColonyGrid; counters: Counters; result: AddLineResult } {
    const name = input.lineName.trim();
    if (!name) {
        return { state, counters, result: { ok: false, error: 'Line name cannot be empty.' } };
    }

    const nameLower = name.toLowerCase();
    if (state.lines.some((l) => l.lineName.toLowerCase() === nameLower)) {
        return { state, counters, result: { ok: false, error: `Line "${name}" already exists — line names are unique colony-wide.` } };
    }

    const lineId = counters.nextLineId;
    const newLine: GridLine = {
        lineId,
        lineName: name,
        nominalGenotypeColor: input.nominalGenotypeColor ?? null,
        cages: [],
    };

    return {
        state: { ...state, lines: [...state.lines, newLine] },
        counters: { ...counters, nextLineId: lineId + 1 },
        result: { ok: true, lineId },
    };
}
