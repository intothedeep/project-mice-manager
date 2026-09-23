// Pure helpers shared across colonyMutations.ts (the four add mutations),
// punchMutations.ts and updateMouse.ts. No side effects — callers
// (mockColonyStore.ts) reassign cells and emit.
// SERVER ERA SWAP: these stay pure; the store wrappers call the server and
// update the local read-model from the response.

import type {
    ColonyGrid,
    GridCage,
    MouseCell,
    PunchRef,
    PunchRow,
    PunchLocation,
    Sex,
} from '@repo/types';
import { parseLitterCode } from '@/lib/litterCode';
import { mintGeneRefs } from '@/lib/genotype';

// Mock-store state: `punches` is the SINGLE SOURCE for every punch, active
// or tombstoned (deletedAt set). `grid.MouseCell.punches` is not a second
// store — it is a read-time PROJECTION of punches (see projectPunches
// below), filtered to active rows, mirroring the real server's two queries
// over one `punches` table (one `WHERE deleted_at IS NULL`, one without —
// migration 0026's partial index exists for exactly that). This is
// mock-store state, not a DTO — it does not belong in packages/types.
// `readonly` here is LOCAL to this file, never packages/types — the invariant
// it protects is mock-era only. It stops an in-place push/splice on this
// reference and NOTHING MORE. The single-writer property is ENFORCED, not
// structural: a caller can still hand-build `[...state.punches, row]` and, if
// the id happens to be unique and the counter ahead, assertPunchInvariants
// passes it and the log and grid silently diverge for that mouse. The guard
// checks the log's internal consistency, never that a write came through
// mintPunch/deriveColonyState. Making it structural needs a branded punchId,
// which the 8h ruling rejected on cost.
export interface ColonyState {
    grid: ColonyGrid;
    readonly punches: readonly PunchRow[];
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
    // Picked CATALOGUE CODES ('Nf1', 'WT'), not a genotype string: the mouse's
    // rows are minted from these (mintGeneRefs), both alleles NULL = zygosity
    // not recorded. Omitted or empty = not genotyped, which composes to '?'.
    geneCodes?: string[];
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
// punches (colonyMutations.ts:addMouse, the SOLE mint site) and reaches this
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
        genes: mintGeneRefs(spec.geneCodes ?? []),
        signal: 'done',
        isAlive: true,
        attention: null,
        dob: spec.dob,
        genotypeColor: null,
        mates: [],
        punches: [],
    };
}

// The ONE place a { grid, punches } snapshot is assembled from a punch log —
// mintPunch (append, below) and removePunch (tombstone, punchMutations.ts)
// both go through this, so neither call site hand-rolls the pair itself
// (8h AC 1: no site outside the sanctioned re-derivation path constructs a
// punch-write pair).
export function deriveColonyState(
    grid: ColonyGrid,
    punches: readonly PunchRow[]
): ColonyState {
    return { grid: projectPunches(grid, punches), punches };
}

// ONE append path into the punch store (rules/core.md: never hard-DELETE —
// this only ever appends, removePunch tombstones in place). Every mint —
// addMouse's creation punch, PunchSection's addPunch — funnels through here.
// Owns the re-derivation (returns the new ColonyState, not a bare log) so a
// caller can never advance the punch counter without also re-deriving the
// grid from it, and can never build a well-typed punch write outside this
// function (8h piece a).
export function mintPunch(
    state: ColonyState,
    counters: Counters,
    input: {
        metaId: number;
        location: PunchLocation;
        effectiveAt: string;
        note?: string;
    }
): { state: ColonyState; counters: Counters } {
    const punchId = counters.nextPunchId;
    const entry: PunchRow = {
        punchId,
        metaId: input.metaId,
        location: input.location,
        effectiveAt: input.effectiveAt,
        ...(input.note !== undefined ? { note: input.note } : {}),
    };
    return {
        state: deriveColonyState(state.grid, [...state.punches, entry]),
        counters: { ...counters, nextPunchId: punchId + 1 },
    };
}

// Generic reuse-preserving map: returns the ORIGINAL array reference when no
// element actually changed (by `fn`'s own reference test), and a fresh array
// only when at least one element did. mapMice below composes four of these,
// one per grid level, so identity survives all the way up to the root when
// nothing under it changed (step 6's AC: every unaffected mouse/slot/cage/
// line stays `===` its previous self).
function mapReuse<T>(
    arr: T[],
    fn: (item: T) => T
): { list: T[]; changed: boolean } {
    let changed = false;
    const list = arr.map((item) => {
        const next = fn(item);
        if (next !== item) changed = true;
        return next;
    });
    return { list: changed ? list : arr, changed };
}

// Walks all four grid levels (line → cage → slot → mouse) and applies `fn` to
// every mouse, preserving reference identity at every level whose contents
// did not change. Shared by projectPunches (below) and updateMouse.ts — the
// single generic walker for "touch one mouse, leave the rest `===`" (step 6's
// AC), so a caller never hand-rolls the four-level nest again.
export function mapMice(
    grid: ColonyGrid,
    fn: (mouse: MouseCell) => MouseCell
): ColonyGrid {
    const { list: lines, changed } = mapReuse(grid.lines, (line) => {
        const { list: cages, changed: cagesChanged } = mapReuse(
            line.cages,
            (cage) => {
                const { list: slots, changed: slotsChanged } = mapReuse(
                    cage.slots,
                    (slot) => {
                        const { list: mice, changed: miceChanged } = mapReuse(
                            slot.mice,
                            fn
                        );
                        return miceChanged ? { ...slot, mice } : slot;
                    }
                );
                return slotsChanged ? { ...cage, slots } : cage;
            }
        );
        return cagesChanged ? { ...line, cages } : line;
    });
    return changed ? { ...grid, lines } : grid;
}

// Elementwise PunchRef equality (never JSON/rendered-string comparison) —
// lets projectPunches skip rebuilding a mouse whose projected punches are
// value-equal to what it already carries.
function punchRefsEqual(a: PunchRef[], b: PunchRef[]): boolean {
    if (a.length !== b.length) return false;
    return a.every((p, i) => {
        const q = b[i];
        return (
            q !== undefined &&
            p.punchId === q.punchId &&
            p.location === q.location &&
            p.effectiveAt === q.effectiveAt &&
            p.note === q.note
        );
    });
}

// Derives MouseCell.punches (active rows only, plan §4) for every mouse in
// the grid from punches — the read-time projection that makes punches the
// single source (grid never carries its own punch array independently).
// Reuses mapMice so a mouse whose projected punches are unchanged is
// returned BY REFERENCE — required for step 6's "every other mouse is
// reference-equal" AC, which a naive rebuild-everything projection breaks.
export function projectPunches(
    grid: ColonyGrid,
    log: readonly PunchRow[]
): ColonyGrid {
    return mapMice(grid, (m) => {
        const punches: PunchRef[] = log
            .filter((e) => e.metaId === m.metaId && !e.deletedAt)
            .map((e) => ({
                punchId: e.punchId,
                location: e.location,
                effectiveAt: e.effectiveAt,
                ...(e.note !== undefined ? { note: e.note } : {}),
            }));
        return punchRefsEqual(m.punches, punches) ? m : { ...m, punches };
    });
}

// Dev-gated invariant guard over the punch store — same species as
// addPunch's `untagged` refusal: a rejection of a PROGRAMMER ERROR, not a
// test and not a test runner (rules/core.md: tests are SUSPENDED). Two
// checks with different lifespans, called out separately because they die at
// different points:
//   - punchId uniqueness across EVERY row (active + tombstoned) — survives
//     MVP2: once the server mints ids this validates the server's response
//     instead of the mock's own counter.
//   - max(punchId) < counters.nextPunchId — MOCK-ERA ONLY. It assumes the
//     mock's own counter is the id authority, which stops being true the
//     day the server mints ids; delete this half then, keep the other.
// Callers run this after every commit AND once at init (colonySeed's
// `seedPunches` is a legitimate third PunchRow constructor this guard would
// otherwise never see).
export function assertPunchInvariants(
    punches: readonly PunchRow[],
    counters: Counters
): void {
    if (process.env.NODE_ENV === 'production') return;
    const seen = new Set<number>();
    let max = 0;
    for (const p of punches) {
        if (seen.has(p.punchId)) {
            throw new Error(
                `Punch store invariant violated: duplicate punchId ${p.punchId}.`
            );
        }
        seen.add(p.punchId);
        if (p.punchId > max) max = p.punchId;
    }
    if (max >= counters.nextPunchId) {
        throw new Error(
            `Punch store invariant violated: punchId ${max} >= counters.nextPunchId ${counters.nextPunchId}.`
        );
    }
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

// Suggested next cage code for a fresh "new cage" field. Cage codes are a
// global integer sequence the lab already tracks by hand; this only pre-fills
// a freely-editable guess. Falls back to '' when any existing cage code
// isn't purely numeric — guessing past a non-numeric scheme would silently
// propose a wrong sequence.
export function suggestNextCageCode(state: ColonyGrid): string {
    const cageCodes = state.lines.flatMap((l) => l.cages.map((c) => c.code));
    if (cageCodes.length === 0) return '';
    let max = 0;
    for (const n of cageCodes) {
        if (!/^\d+$/.test(n)) return '';
        max = Math.max(max, parseInt(n, 10));
    }
    return String(max + 1);
}
