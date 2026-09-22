// Pure mutation functions: (state, counters, input) → { state, counters, result }
// No side effects — callers (mockColonyStore.ts) reassign cells and emit.
// SERVER ERA SWAP: these become POST-body builders; the store wrappers call the
// server and update the local read-model from the response.
//
// Layering (line ≥ 1 cage, cage ≥ 1 slot, slot MAY be empty): addLine creates
// the line then delegates to addCage; addCage creates the cage then delegates
// to addSlot; addSlot creates the slot then calls addMouse only when a mouse
// was supplied. addMouse is the SOLE mouse-creating primitive — a later step
// mints an implicit toe punch inside it and must not have two branches to
// patch. A rejection anywhere in the chain returns the CALLER's original
// state/counters (not the tentative ones), so a failed addLine never leaves a
// dangling cages: [] line behind.

import type {
    ColonyGrid,
    GridCage,
    GridLine,
    MouseCell,
    Sex,
    SignalColor,
} from '@repo/types';
import { extractLitterCode, parseLitterCode } from '@/lib/litterCode';
import { buildMouseLabel } from '@/lib/mouseIdentity';
import { slotLabelSet, cageNumberSet, mouseLabelSet } from '@/lib/colonySeed';

// ---- types ------------------------------------------------------------------

export interface Counters {
    nextMetaId: number;
    nextSlotId: number;
    nextCageId: number;
    nextLitterOrd: number;
    nextLineId: number;
}

// Fields needed to build a MouseCell — shared by every level's optional
// `mouse` param and by addMouse's own required input.
export interface MouseSpec {
    sex: Sex;
    litterCode: string;
    pupNumber: number;
    dob: string;
    genotype?: string;
}

export interface AddMouseInput extends MouseSpec {
    cageId: number;
    slotId: number;
}

export interface AddSlotInput {
    cageId: number;
    slotLabel: string;
    mouse?: MouseSpec;
}

export interface AddCageInput {
    lineId: number;
    cageNumber: number;
    slotLabel: string;
    mouse?: MouseSpec;
}

export interface AddLineInput {
    lineName: string;
    nominalGenotypeColor?: string | null;
    cageNumber: number;
    slotLabel: string;
    mouse?: MouseSpec;
}

export interface UpdateMousePatch {
    mouseLabel?: string;
    sex?: Sex;
    genotype?: string;
    dob?: string;
    signal?: SignalColor;
    isAlive?: boolean;
}

export type AddMouseResult = { ok: true } | { ok: false; error: string };

export type AddLineResult =
    { ok: true; lineId: number } | { ok: false; error: string };

// ---- helpers ----------------------------------------------------------------

// litterCode is the trimmed value the caller resolved (may differ in casing
// from spec.litterCode before trimming) — mouseLabel and the stored
// litterCode field must agree, so both derive from this same param.
export function buildMouseCell(
    spec: MouseSpec,
    litterCode: string,
    metaId: number
): MouseCell {
    const pupOffsets: number[] = [];
    return {
        metaId,
        mouseLabel: buildMouseLabel({
            sex: spec.sex,
            pupNumber: spec.pupNumber,
            pupOffsets,
            litterCode,
            earPunchCount: 0, // punches not minted here yet (later step)
        }),
        pupNumber: spec.pupNumber,
        litterCode,
        pupOffsets,
        sex: spec.sex,
        genotype: spec.genotype?.trim() || '?',
        signal: 'done',
        isAlive: true,
        attention: null,
        dob: spec.dob,
        genotypeColor: null,
        mates: [],
    };
}

// WHY max: a manually-typed code above peek keeps the auto option from proposing
// a code that already exists as a real litter.
export function advanceLitterCounter(
    litterCode: string,
    nextLitterOrd: number
): number {
    const ord = parseLitterCode(litterCode);
    if (ord !== null) return Math.max(nextLitterOrd, ord + 1);
    return nextLitterOrd;
}

function findCage(state: ColonyGrid, cageId: number): GridCage | undefined {
    for (const l of state.lines) {
        const cage = l.cages.find((c) => c.cageId === cageId);
        if (cage) return cage;
    }
    return undefined;
}

// Suggested next cage number for a fresh "new cage" field. Cage numbers are a
// global integer sequence the lab already tracks by hand; this only pre-fills
// a freely-editable guess. Falls back to '' when any existing cage number
// isn't purely numeric — guessing past a non-numeric scheme would silently
// propose a wrong sequence.
export function suggestNextCageNumber(state: ColonyGrid): string {
    const cageNumbers = state.lines.flatMap((l) =>
        l.cages.map((c) => c.cageNumber)
    );
    if (cageNumbers.length === 0) return '';
    let max = 0;
    for (const n of cageNumbers) {
        if (!/^\d+$/.test(n)) return '';
        max = Math.max(max, parseInt(n, 10));
    }
    return String(max + 1);
}

// ---- pure mutations ---------------------------------------------------------

// SOLE mouse-creating primitive — addSlot/addCage/addLine delegate here.
export function addMouse(
    state: ColonyGrid,
    counters: Counters,
    input: AddMouseInput
): { state: ColonyGrid; counters: Counters; result: AddMouseResult } {
    const cage = findCage(state, input.cageId);
    if (!cage) {
        return {
            state,
            counters,
            result: { ok: false, error: 'Selected cage no longer exists.' },
        };
    }
    if (!cage.slots.some((s) => s.slotId === input.slotId)) {
        return {
            state,
            counters,
            result: { ok: false, error: 'Selected slot no longer exists.' },
        };
    }

    const litterCode = input.litterCode.trim();
    const nextMeta = counters.nextMetaId;
    const mouse = buildMouseCell(input, litterCode, nextMeta);
    const newLitterOrd = advanceLitterCounter(
        litterCode,
        counters.nextLitterOrd
    );

    const newState: ColonyGrid = {
        ...state,
        lines: state.lines.map((line) => ({
            ...line,
            cages: line.cages.map((c) => {
                if (c.cageId !== input.cageId) return c;
                return {
                    ...c,
                    slots: c.slots.map((s) =>
                        s.slotId === input.slotId
                            ? { ...s, mice: [...s.mice, mouse] }
                            : s
                    ),
                };
            }),
        })),
    };

    return {
        state: newState,
        counters: {
            ...counters,
            nextMetaId: nextMeta + 1,
            nextLitterOrd: newLitterOrd,
        },
        result: { ok: true },
    };
}

// Creates the slot (empty), then delegates to addMouse iff a mouse was supplied.
export function addSlot(
    state: ColonyGrid,
    counters: Counters,
    input: AddSlotInput
): { state: ColonyGrid; counters: Counters; result: AddMouseResult } {
    const label = input.slotLabel.trim();
    if (!label) {
        return {
            state,
            counters,
            result: {
                ok: false,
                error: 'A new cage requires a slot label — provide a new slot label.',
            },
        };
    }
    if (slotLabelSet(state).has(label.toLowerCase())) {
        return {
            state,
            counters,
            result: {
                ok: false,
                error: `Slot label "${label}" already exists — labels are unique colony-wide.`,
            },
        };
    }
    const cage = findCage(state, input.cageId);
    if (!cage) {
        return {
            state,
            counters,
            result: { ok: false, error: 'Selected cage no longer exists.' },
        };
    }

    const slotId = counters.nextSlotId;
    const stateWithSlot: ColonyGrid = {
        ...state,
        lines: state.lines.map((line) => ({
            ...line,
            cages: line.cages.map((c) =>
                c.cageId !== input.cageId
                    ? c
                    : { ...c, slots: [...c.slots, { slotId, label, mice: [] }] }
            ),
        })),
    };
    const countersWithSlot: Counters = { ...counters, nextSlotId: slotId + 1 };

    if (!input.mouse) {
        return {
            state: stateWithSlot,
            counters: countersWithSlot,
            result: { ok: true },
        };
    }

    const inner = addMouse(stateWithSlot, countersWithSlot, {
        ...input.mouse,
        cageId: input.cageId,
        slotId,
    });
    // Restore the CALLER's state on failure — never leave the half-created
    // slot or the burned counter behind (same guard as addCage/addLine).
    if (!inner.result.ok) return { state, counters, result: inner.result };
    return inner;
}

// Creates the cage (empty), then delegates to addSlot.
export function addCage(
    state: ColonyGrid,
    counters: Counters,
    input: AddCageInput
): { state: ColonyGrid; counters: Counters; result: AddMouseResult } {
    const cageNumStr = String(input.cageNumber);
    if (cageNumberSet(state).has(cageNumStr)) {
        return {
            state,
            counters,
            result: {
                ok: false,
                error: `Cage number "${input.cageNumber}" already exists — cage numbers are unique colony-wide.`,
            },
        };
    }
    const line = state.lines.find((l) => l.lineId === input.lineId);
    if (!line) {
        return {
            state,
            counters,
            result: { ok: false, error: 'Selected line no longer exists.' },
        };
    }

    const cageId = counters.nextCageId;
    const stateWithCage: ColonyGrid = {
        ...state,
        lines: state.lines.map((l) =>
            l.lineId !== input.lineId
                ? l
                : {
                      ...l,
                      cages: [
                          ...l.cages,
                          {
                              cageId,
                              cageNumber: cageNumStr,
                              location: null,
                              slots: [],
                          },
                      ],
                  }
        ),
    };
    const countersWithCage: Counters = { ...counters, nextCageId: cageId + 1 };

    const inner = addSlot(stateWithCage, countersWithCage, {
        cageId,
        slotLabel: input.slotLabel,
        mouse: input.mouse,
    });
    if (!inner.result.ok) {
        return { state, counters, result: inner.result };
    }
    return inner;
}

// Creates the line (no cages yet), then delegates to addCage.
export function addLine(
    state: ColonyGrid,
    counters: Counters,
    input: AddLineInput
): { state: ColonyGrid; counters: Counters; result: AddLineResult } {
    const name = input.lineName.trim();
    if (!name) {
        return {
            state,
            counters,
            result: { ok: false, error: 'Line name cannot be empty.' },
        };
    }

    const nameLower = name.toLowerCase();
    if (state.lines.some((l) => l.lineName.toLowerCase() === nameLower)) {
        return {
            state,
            counters,
            result: {
                ok: false,
                error: `Line "${name}" already exists — line names are unique colony-wide.`,
            },
        };
    }

    const lineId = counters.nextLineId;
    const newLine: GridLine = {
        lineId,
        lineName: name,
        nominalGenotypeColor: input.nominalGenotypeColor ?? null,
        cages: [],
    };
    const stateWithLine: ColonyGrid = {
        ...state,
        lines: [...state.lines, newLine],
    };
    const countersWithLine: Counters = { ...counters, nextLineId: lineId + 1 };

    const inner = addCage(stateWithLine, countersWithLine, {
        lineId,
        cageNumber: input.cageNumber,
        slotLabel: input.slotLabel,
        mouse: input.mouse,
    });
    if (!inner.result.ok) {
        return { state, counters, result: inner.result };
    }
    return {
        state: inner.state,
        counters: inner.counters,
        result: { ok: true, lineId },
    };
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

    if (patch.mouseLabel !== undefined) {
        const newId = patch.mouseLabel.trim();
        if (newId.toLowerCase() !== current.mouseLabel.toLowerCase()) {
            const ids = mouseLabelSet(state);
            ids.delete(current.mouseLabel.toLowerCase());
            if (ids.has(newId.toLowerCase())) {
                return {
                    state,
                    counters,
                    result: {
                        ok: false,
                        error: `ID "${newId}" already exists — mouse IDs are unique colony-wide.`,
                    },
                };
            }
        }
    }

    const updated: MouseCell = { ...current };
    let changed = false;
    let newLitterOrd = counters.nextLitterOrd;

    if (patch.mouseLabel !== undefined) {
        const newId = patch.mouseLabel.trim();
        if (newId.toLowerCase() !== current.mouseLabel.toLowerCase()) {
            updated.mouseLabel = newId;
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
    if (!changed)
        return {
            state,
            counters: { ...counters, nextLitterOrd: newLitterOrd },
            result: { ok: true },
        };

    const newState: ColonyGrid = {
        ...state,
        lines: state.lines.map((l) => ({
            ...l,
            cages: l.cages.map((c) => ({
                ...c,
                slots: c.slots.map((s) => ({
                    ...s,
                    mice: s.mice.map((m) =>
                        m.metaId === metaId ? updated : m
                    ),
                })),
            })),
        })),
    };

    return {
        state: newState,
        counters: { ...counters, nextLitterOrd: newLitterOrd },
        result: { ok: true },
    };
}
