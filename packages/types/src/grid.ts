// View DTOs for the read-only Cage Grid screen.
//
// These are the shapes the API will return AFTER head-row resolution — i.e. the
// current state only. No version/prev_id/deleted_at leak to the client; the
// server collapses the append-only history down to "latest" before serializing.
// The mock fetcher and the future real fetcher both honour this contract.
// HISTORY is out of scope for these DTOs: it lives in its own, explicitly-named
// DTOs/selectors (e.g. PunchHistoryEntry in ./punchHistory) — `deleted_at`
// appears only there, never here.
//
// Full hierarchy: colony › line › cage › slot › mouse.
//   colony  → colonies
//   line    → mouse_lines (colony_id)
//   cage    → cages       (line_id, cage_number)
//   slot    → slots       (cage_id, label)   — its own level, holds many mice
//   mouse   → mice        (cage_id, slot_id) — head row per mouse_meta

// Workflow state, mirrored from the professor's Excel colour semantics.
// Rendered back to those colours in the UI so the sheet is instantly recognisable.
//   done        → black text (default, checked/ok)
//   instruction → red text   (FONT FFFF0000)
//   plan        → blue text  (FONT FF0432FF)
//   dead        → gray fill  (sac → dead → gray box)
//   flag        → yellow fill (attention / sample-flag)
export type SignalColor = 'done' | 'instruction' | 'plan' | 'dead' | 'flag';

export type Sex = 'M' | 'F' | 'U';

// Punch = a physical ear/toe mark used for genotyping/identification tracking.
// The rendered id is a READ-TIME projection composed from a mouse's parts (9b
// deleted the stored field); punches are NOT folded into it — they live BESIDE
// the mouse as their own field, so the UI never has to parse punch state back
// out of a label (the position of the 'e' suffix in a rendered id is an OPEN
// QUESTION to the lab owner — see the retired parse contract in
// docs/phases/p0.7.plan.md).
export type PunchLocation = 'toe' | 'ear' | 'other' | 'untagged';

export interface PunchRef {
    punchId: number;
    location: PunchLocation;
    // WHEN the punch happened, not when the row was written. created_at takes
    // transaction-start time, so an implicit toe punch and a same-transaction
    // ear punch would be unorderable — the punch history list needs this key.
    effectiveAt: string; // ISO date
    note?: string;
}

// Under Task model v2 the case is the primary entity and a task is a child
// record (a case's detail/progress). This badge on a mouse cell represents
// the CASE, not a task, hence "CaseTag" not "TaskTag". Colour reuses the
// SignalColor legend (no separate palette); `type` is the case's caseType,
// shown on hover. Derived client-side in ColonyGridView.client.tsx from open
// cases (status 'todo' or 'doing'), keyed by mouse metaId — not resolved by
// the server.
export interface MouseCaseTag {
    type: string; // caseType, e.g. "Genotyping", "Sac", "Wean" (tooltip)
    signal: SignalColor; // tag colour, mirroring the workflow-signal legend
}

// A parent reference shown in the grid's parents column. metaId lets the UI jump
// to that parent's row. Discriminated union on metaId (plan §5 Q46 option C):
// an in-grid parent (metaId non-null) carries NO label — the UI resolves that
// parent's MouseCell by metaId and composes the label the same way every other
// surface does (see lib/mouseIdentity.ts + lib/mouseLabel.ts), so it never drifts from the
// live punch/reclip state. An outside/unknown parent (metaId null) has no
// MouseCell to resolve, so it keeps a plain snapshot string instead.
export interface InGridParentCell {
    metaId: number;
    genotype: string | null;
    genotypeColor: string | null; // tint for the parent's genotype sub-cell (same palette as MouseCell.genotypeColor)
}

export interface OutsideParentCell {
    metaId: null;
    snapshotLabel: string; // text snapshot only — nobody can recompose this parent's identity
    genotype: string | null;
    genotypeColor: string | null;
}

export type ParentCell = InGridParentCell | OutsideParentCell;

export interface MouseParents {
    father: ParentCell | null; // ♂ (rendered blue)
    mother: ParentCell | null; // ♀ (rendered pink)
}

// A current mate of this mouse: the partner's id (+ metaId for click-to-jump) and
// the mate-group colour badge. A mouse mated to several partners has several.
export interface MateRef {
    partnerId: string;
    partnerMetaId: number | null;
    color: string;
    // ISO date of THIS pairing (matings.mated_on). The grid shows the LATEST mate
    // by sorting these descending, so the value must not be inferred from array
    // order — a server query without ORDER BY would otherwise silently surface the
    // wrong partner. null = not recorded; those sort last.
    matedOn: string | null;
}

// Breeding / lifecycle dates from the Breeders sheet (cols I–N) — all ISO dates
// (parsed from YYMMDD), null when not recorded. `deliv` may be approximate ('~').
export interface MouseDates {
    lastMating: string | null;
    plug: string | null;
    deliv: string | null;
    tissue: string | null;
    genotyping: string | null;
}

export interface MouseCell {
    metaId: number;
    // The rendered label ("M4BCW", "U3BCX", "F10BEVe") is NOT stored here — it
    // is a READ-TIME projection composed from the parts below (see
    // lib/mouseIdentity.ts buildMouseLabel), never parsed back apart (same
    // rule as punches below). Required: every mouse-creation path
    // (AddMouseInput) already carries pupNumber and litterCode, so there is
    // no partial-data caller to accommodate.
    pupNumber: number; // BIRTH number, immutable (mouse_meta.pup_number)
    litterCode: string; // denormalized on mouse_meta
    // ACTIVE pup-number offsets in CHAIN order; [] = never renumbered. Order is
    // significant for the rendered string ("1+10+20" vs "1+20+10") even though
    // the sum is the same either way.
    pupOffsets: number[];
    sex: Sex;
    genotype: string; // derived marker-combo label, e.g. "Nf1 f/+", "WT"
    signal: SignalColor;
    isAlive: boolean;
    attention: string | null; // short note surfaced on the cell (why it is flagged / planned)
    // activeTasks removed (T6): badges are now derived from the case store in
    // ColonyGridView.client.tsx (useTasks + signalColorOf), keyed by metaId.
    // MouseCaseTag and SignalColor are kept — the derived index is typed by them.
    dob: string | null; // ISO date of birth; the "age" colour is computed from dob + sex at read (never stored — it changes daily)
    genotypeColor: string | null; // resolved identity hex for this mouse's genotype; null = unknown '?' → neutral. Server resolves from color_assignments(channel='genotype').
    mates: MateRef[]; // current mate(s): partner id + group colour badge. [] if not breeding; several when mated to multiple partners.
    punches: PunchRef[]; // ACTIVE rows only (plan §4 "punches: PunchRef[] (active rows only)"). A removed row is tombstoned in the separate punch LOG (see ./punchHistory PunchHistoryEntry), not here — read-time projection, never parsed from the rendered label.
    parents?: MouseParents; // father/mother refs for the parents column; omitted when unknown (founders)
    dates?: MouseDates; // breeding/lifecycle dates (last mating, plug, deliv, tissue, genotyping)
}

export interface GridSlot {
    slotId: number;
    label: string; // GLOBALLY-UNIQUE slot label, e.g. "A8" — unique on its own, NOT scoped by cage
    mice: MouseCell[];
}

export interface GridCage {
    cageId: number;
    cageNumber: string; // e.g. "2413"
    location: string | null;
    slots: GridSlot[];
}

export interface GridLine {
    lineId: number;
    lineName: string; // e.g. "pNf1 flox;ccEGFP"
    nominalGenotypeColor: string | null; // the line's SOLE rail colour — its nominal genotype colour (same palette as MouseCell.genotypeColor); null for the default WT line (neutral, on-brand). A mouse whose genotypeColor differs is a transfer. (Dropped the separate lineColor identity hue 2026-09-12: line ≈ genotype 1:1, so it was redundant; lines stay identifiable by index badge + name.)
    cages: GridCage[];
}

export interface ColonyGrid {
    colonyId: number;
    colonyName: string;
    lines: GridLine[];
}
