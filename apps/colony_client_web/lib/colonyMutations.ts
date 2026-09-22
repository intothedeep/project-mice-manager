// Pure mutation functions: (state, counters, input) → { state, counters, result }
// No side effects — callers (mockColonyStore.ts) reassign cells and emit.
// SERVER ERA SWAP: these become POST-body builders; the store wrappers call the
// server and update the local read-model from the response.
//
// Layering (line ≥ 1 cage, cage ≥ 1 slot, slot MAY be empty): addLine creates
// the line then delegates to addCage; addCage creates the cage then delegates
// to addSlot; addSlot creates the slot then calls addMouse only when a mouse
// was supplied. addMouse is the SOLE mouse-creating primitive — it mints the
// implicit toe punch (colonyMutationHelpers.ts:buildMouseCell) and must not
// have two branches to patch. A rejection anywhere in the chain returns the
// CALLER's original state/counters (not the tentative ones), so a failed
// addLine never leaves a dangling cages: [] line behind.
//
// Split out of this file (P0.7-b 8b): updateMouse.ts (edits an existing
// mouse — no call chain with the four add mutations below) and
// colonyMutationHelpers.ts (buildMouseCell, advanceLitterCounter, findCage,
// suggestNextCageNumber — pure helpers shared by both).

import type { ColonyGrid, GridLine } from '@repo/types';
import { slotLabelSet, cageNumberSet } from '@/lib/colonySeed';
import {
    buildMouseCell,
    advanceLitterCounter,
    findCage,
    type AddMouseResult,
    type Counters,
    type MouseSpec,
} from '@/lib/colonyMutationHelpers';

// ---- types ------------------------------------------------------------------

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

export type AddLineResult =
    { ok: true; lineId: number } | { ok: false; error: string };

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
    const nextPunch = counters.nextPunchId;
    const mouse = buildMouseCell(input, litterCode, nextMeta, nextPunch);
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
            nextPunchId: nextPunch + 1,
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
