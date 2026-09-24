// Pure mutation functions: (state, counters, input) → { state, counters, result }
// No side effects — callers (mockColonyStore.ts) reassign cells and emit.
// SERVER ERA SWAP: these become POST-body builders; the store wrappers call the
// server and update the local read-model from the response.
//
// Layering (line ≥ 1 cage, cage ≥ 1 slot, slot MAY be empty): addLine creates
// the line then delegates to addCage; addCage creates the cage then delegates
// to addSlot; addSlot creates the slot then calls addMouse only when a mouse
// was supplied. addMouse is the SOLE mouse-creating primitive — it mints the
// creation punch (colonyMutationHelpers.ts:mintPunch) and must not have two
// branches to patch. A rejection anywhere in the chain returns the CALLER's
// original state/counters (not the tentative ones), so a failed addLine
// never leaves a dangling cages: [] line behind.
//
// All four take/return ColonyState (grid + punches + locations), not a bare
// ColonyGrid — addMouse appends to both logs, so every caller in the chain
// must carry them through.
//
// Split out of this file (P0.7-b 8b): updateMouse.ts (edits an existing
// mouse — no call chain with the four add mutations below) and
// colonyMutationHelpers.ts (buildMouseCell, mintPunch, projectPunches,
// advanceLitterCounter, findCage, suggestNextCageCode — pure helpers
// shared by both).

import type { ColonyGrid, GridLine } from '@repo/types';
import { slotLabelSet, cageCodeSet } from '@/lib/colonySeed';
import {
    buildMouseCell,
    advanceLitterCounter,
    findCage,
    mintLocation,
    mintPunch,
    type AddMouseResult,
    type ColonyState,
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
    // A cage code is an IDENTIFIER, not a quantity: cages.code is TEXT and
    // GridCage.code is string, so a leading zero has to survive the write
    // path. "digits only" is a UI rule and lives in the dialogs.
    cageCode: string;
    slotLabel: string;
    mouse?: MouseSpec;
}

export interface AddLineInput {
    lineName: string;
    nominalGenotypeColor?: string | null;
    cageCode: string;
    slotLabel: string;
    mouse?: MouseSpec;
}

export type AddLineResult =
    { ok: true; lineId: number } | { ok: false; error: string };

// ---- pure mutations ---------------------------------------------------------

// SOLE mouse-creating primitive — addSlot/addCage/addLine delegate here.
export function addMouse(
    state: ColonyState,
    counters: Counters,
    input: AddMouseInput
): { state: ColonyState; counters: Counters; result: AddMouseResult } {
    const cage = findCage(state.grid, input.cageId);
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

    const gridWithMouse: ColonyGrid = {
        ...state.grid,
        lines: state.grid.lines.map((line) => ({
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

    // The location row comes FIRST and is not optional: projectLocations
    // places a mouse by its head row and REFUSES a mouse that has none, so a
    // mouse added without one would blow up the very next derive — which
    // mintPunch below performs. Creation is where a mouse gets its first
    // version row, exactly as it is where it gets its 'untagged' punch.
    // effectiveAt is punchEffectiveAt (the caller's TODAY): entering the
    // colony and being placed in a cage are the same instant, and neither is
    // the mouse's dob.
    const placed = mintLocation(
        {
            grid: gridWithMouse,
            punches: state.punches,
            locations: state.locations,
        },
        { ...counters, nextMetaId: nextMeta + 1, nextLitterOrd: newLitterOrd },
        {
            metaId: nextMeta,
            cageId: input.cageId,
            slotId: input.slotId,
            effectiveAt: input.punchEffectiveAt,
            reason: 'created',
        }
    );

    // Creation always mints 'untagged' — it is no longer a caller choice
    // (P0.7-b: "we never delete an untagged record"). Real tags are added
    // beside it afterward via addPunch.
    const minted = mintPunch(placed.state, placed.counters, {
        metaId: nextMeta,
        location: 'untagged',
        effectiveAt: input.punchEffectiveAt,
    });

    return {
        state: minted.state,
        counters: minted.counters,
        result: { ok: true },
    };
}

// Creates the slot (empty), then delegates to addMouse iff a mouse was supplied.
export function addSlot(
    state: ColonyState,
    counters: Counters,
    input: AddSlotInput
): { state: ColonyState; counters: Counters; result: AddMouseResult } {
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
    if (slotLabelSet(state.grid).has(label.toLowerCase())) {
        return {
            state,
            counters,
            result: {
                ok: false,
                error: `Slot label "${label}" already exists — labels are unique colony-wide.`,
            },
        };
    }
    const cage = findCage(state.grid, input.cageId);
    if (!cage) {
        return {
            state,
            counters,
            result: { ok: false, error: 'Selected cage no longer exists.' },
        };
    }

    const slotId = counters.nextSlotId;
    const gridWithSlot: ColonyGrid = {
        ...state.grid,
        lines: state.grid.lines.map((line) => ({
            ...line,
            cages: line.cages.map((c) =>
                c.cageId !== input.cageId
                    ? c
                    : { ...c, slots: [...c.slots, { slotId, label, mice: [] }] }
            ),
        })),
    };
    const stateWithSlot: ColonyState = {
        grid: gridWithSlot,
        punches: state.punches,
        locations: state.locations,
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
    state: ColonyState,
    counters: Counters,
    input: AddCageInput
): { state: ColonyState; counters: Counters; result: AddMouseResult } {
    const cageCodeStr = input.cageCode.trim();
    if (!cageCodeStr) {
        return {
            state,
            counters,
            result: { ok: false, error: 'A new cage requires a cage code.' },
        };
    }
    if (cageCodeSet(state.grid).has(cageCodeStr)) {
        return {
            state,
            counters,
            result: {
                ok: false,
                error: `Cage number "${cageCodeStr}" already exists — cage numbers are unique colony-wide.`,
            },
        };
    }
    const line = state.grid.lines.find((l) => l.lineId === input.lineId);
    if (!line) {
        return {
            state,
            counters,
            result: { ok: false, error: 'Selected line no longer exists.' },
        };
    }

    const cageId = counters.nextCageId;
    const gridWithCage: ColonyGrid = {
        ...state.grid,
        lines: state.grid.lines.map((l) =>
            l.lineId !== input.lineId
                ? l
                : {
                      ...l,
                      cages: [
                          ...l.cages,
                          {
                              cageId,
                              code: cageCodeStr,
                              location: null,
                              slots: [],
                          },
                      ],
                  }
        ),
    };
    const stateWithCage: ColonyState = {
        grid: gridWithCage,
        punches: state.punches,
        locations: state.locations,
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
    state: ColonyState,
    counters: Counters,
    input: AddLineInput
): { state: ColonyState; counters: Counters; result: AddLineResult } {
    const name = input.lineName.trim();
    if (!name) {
        return {
            state,
            counters,
            result: { ok: false, error: 'Line name cannot be empty.' },
        };
    }

    const nameLower = name.toLowerCase();
    if (state.grid.lines.some((l) => l.lineName.toLowerCase() === nameLower)) {
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
    const gridWithLine: ColonyGrid = {
        ...state.grid,
        lines: [...state.grid.lines, newLine],
    };
    const stateWithLine: ColonyState = {
        grid: gridWithLine,
        punches: state.punches,
        locations: state.locations,
    };
    const countersWithLine: Counters = { ...counters, nextLineId: lineId + 1 };

    const inner = addCage(stateWithLine, countersWithLine, {
        lineId,
        cageCode: input.cageCode,
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
