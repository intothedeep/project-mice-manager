// Pure helpers shared across colonyMutations.ts (the four add mutations),
// punchMutations.ts and updateMouse.ts. No side effects — callers
// (mockColonyStore.ts) reassign cells and emit.
// SERVER ERA SWAP: these stay pure; the store wrappers call the server and
// update the local read-model from the response.

import type {
    ColonyGrid,
    GridCage,
    MouseCell,
    PunchHistoryEntry,
    PunchLocation,
    Sex,
} from '@repo/types';
import { parseLitterCode } from '@/lib/litterCode';

// Mock-store state: `punchLog` is the SINGLE SOURCE for every punch, active
// or tombstoned (deletedAt set). `grid.MouseCell.punches` is not a second
// store — it is a read-time PROJECTION of punchLog (see projectPunches
// below), filtered to active rows, mirroring the real server's two queries
// over one `punches` table (one `WHERE deleted_at IS NULL`, one without —
// migration 0026's partial index exists for exactly that). This is
// mock-store state, not a DTO — it does not belong in packages/types.
export interface ColonyState {
    grid: ColonyGrid;
    punchLog: PunchHistoryEntry[];
}

export interface Counters {
    nextMetaId: number;
    nextPunchId: number;
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
    // WHEN the punch minted in addMouse physically happened — distinct from
    // dob: a mouse entered weeks after birth must not have its punch dated
    // to its birthday. Callers pass TODAY (@/lib/dueDates).
    punchEffectiveAt: string; // ISO date
}

export type AddMouseResult = { ok: true } | { ok: false; error: string };

// litterCode is the trimmed value the caller resolved (may differ in casing
// from spec.litterCode before trimming) — the stored litterCode field is the
// one true source; the rendered label composes from it at read time
// (lib/mouseIdentity.ts), never stored here.
// `punches` starts empty — the creation punch is minted separately into
// punchLog (colonyMutations.ts:addMouse, the SOLE mint site) and reaches this
// mouse only through projectPunches, same as every other punch.
export function buildMouseCell(
    spec: MouseSpec,
    litterCode: string,
    metaId: number
): MouseCell {
    const pupOffsets: number[] = [];
    return {
        metaId,
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
        punches: [],
    };
}

// ONE append path into the punch store (rules/core.md: never hard-DELETE —
// this only ever appends, removePunch tombstones in place). Every mint —
// addMouse's creation punch, PunchSection's addPunch — funnels through here.
export function mintPunch(
    log: PunchHistoryEntry[],
    counters: Counters,
    input: {
        metaId: number;
        location: PunchLocation;
        effectiveAt: string;
        note?: string;
    }
): { log: PunchHistoryEntry[]; counters: Counters } {
    const punchId = counters.nextPunchId;
    const entry: PunchHistoryEntry = {
        punchId,
        metaId: input.metaId,
        location: input.location,
        effectiveAt: input.effectiveAt,
        ...(input.note !== undefined ? { note: input.note } : {}),
    };
    return {
        log: [...log, entry],
        counters: { ...counters, nextPunchId: punchId + 1 },
    };
}

// Derives MouseCell.punches (active rows only, plan §4) for every mouse in
// the grid from punchLog — the read-time projection that makes punchLog the
// single source (grid never carries its own punch array independently).
export function projectPunches(
    grid: ColonyGrid,
    log: PunchHistoryEntry[]
): ColonyGrid {
    return {
        ...grid,
        lines: grid.lines.map((l) => ({
            ...l,
            cages: l.cages.map((c) => ({
                ...c,
                slots: c.slots.map((s) => ({
                    ...s,
                    mice: s.mice.map((m) => ({
                        ...m,
                        punches: log
                            .filter(
                                (e) => e.metaId === m.metaId && !e.deletedAt
                            )
                            .map((e) => ({
                                punchId: e.punchId,
                                location: e.location,
                                effectiveAt: e.effectiveAt,
                                ...(e.note !== undefined
                                    ? { note: e.note }
                                    : {}),
                            })),
                    })),
                })),
            })),
        })),
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

export function findCage(
    state: ColonyGrid,
    cageId: number
): GridCage | undefined {
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
