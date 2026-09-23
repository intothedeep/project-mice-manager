// Pure helpers shared across colonyMutations.ts (the four add mutations) and
// updateMouse.ts. No side effects — callers (mockColonyStore.ts) reassign
// cells and emit.
// SERVER ERA SWAP: these stay pure; the store wrappers call the server and
// update the local read-model from the response.

import type {
    ColonyGrid,
    GridCage,
    MouseCell,
    PunchHistoryEntry,
    PunchRef,
    Sex,
} from '@repo/types';
import { parseLitterCode } from '@/lib/litterCode';

// Mock-store state (step 6a, owner option B): the live grid (ACTIVE punch
// rows only, plan §4) plus the append-only punch LOG (tombstones live here,
// never in the grid). This is mock-store state, not a DTO — it does not
// belong in packages/types. Step 7 seeds `punchLog` from SEED_COLONY and adds
// the usePunchLog(metaId) selector; this shape is 6a's contribution only.
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
    // WHEN the implicit toe punch (minted in addMouse) physically happened —
    // distinct from dob: a mouse entered weeks after birth must not have its
    // punch dated to its birthday. Callers pass TODAY (@/lib/dueDates).
    punchEffectiveAt: string; // ISO date
}

export type AddMouseResult = { ok: true } | { ok: false; error: string };

// litterCode is the trimmed value the caller resolved (may differ in casing
// from spec.litterCode before trimming) — the stored litterCode field is the
// one true source; the rendered label composes from it at read time
// (lib/mouseIdentity.ts), never stored here.
export function buildMouseCell(
    spec: MouseSpec,
    litterCode: string,
    metaId: number,
    punchId: number
): MouseCell {
    const pupOffsets: number[] = [];
    // Creating a mouse mints an implicit 'toe' punch — addMouse is the SOLE
    // mint site (docs/phases/p0.7.plan.md, punch-records bullet: "in addMouse
    // and NOWHERE else"); once-and-only-once is structural, not a DB trigger.
    const toePunch: PunchRef = {
        punchId,
        location: 'toe',
        effectiveAt: spec.punchEffectiveAt,
    };
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
        punches: [toePunch],
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
