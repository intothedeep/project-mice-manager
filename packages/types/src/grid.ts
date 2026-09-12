// View DTOs for the read-only Cage Grid screen.
//
// These are the shapes the API will return AFTER head-row resolution — i.e. the
// current state only. No version/prev_id/deleted_at leak to the client; the
// server collapses the append-only history down to "latest" before serializing.
// The mock fetcher and the future real fetcher both honour this contract.
//
// Hierarchy (mirrors the schema): colony › line › cage › slot › mouse.
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
export type SignalColor =
  | "done"
  | "instruction"
  | "plan"
  | "dead"
  | "flag";

export type Sex = "M" | "F" | "U";

// One active task on a mouse, surfaced as a small colour tag on the cell.
// Colour reuses the SignalColor legend (no separate palette); `type` is the
// task_type, shown on hover. The server resolves this from the mouse's open
// tasks before serializing (head-row of the tasks history, status = open).
export interface MouseTaskTag {
  type: string; // task_type, e.g. "Genotyping", "Sac", "Wean" (tooltip)
  signal: SignalColor; // tag colour, mirroring the workflow-signal legend
}

// A parent reference shown in the grid's parents column. metaId lets the UI jump
// to that parent's row; null = the parent is not shown here (outside / unknown).
export interface ParentCell {
  renderedId: string;
  metaId: number | null;
  genotype: string | null;
  genotypeColor: string | null; // tint for the parent's genotype sub-cell (same palette as MouseCell.genotypeColor)
}

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
  renderedId: string; // sex+number+litter-code+tag, e.g. "M4BCW", "U3BCX", "F10BEVe"
  sex: Sex;
  genotype: string; // derived marker-combo label, e.g. "Nf1 f/+", "WT"
  signal: SignalColor;
  isAlive: boolean;
  attention: string | null; // short note surfaced on the cell (why it is flagged / planned)
  activeTasks: MouseTaskTag[]; // open tasks on this mouse, rendered as colour tags
  dob: string | null; // ISO date of birth; the "age" colour is computed from dob + sex at read (never stored — it changes daily)
  genotypeColor: string | null; // resolved identity hex for this mouse's genotype; null = unknown '?' → neutral. Server resolves from color_assignments(channel='genotype').
  mates: MateRef[]; // current mate(s): partner id + group colour badge. [] if not breeding; several when mated to multiple partners.
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
  lineColor: string; // line-identity hex (color_assignments channel='line', key=lineId)
  nominalGenotypeColor: string | null; // the line's nominal genotype colour (same palette as MouseCell.genotypeColor); null for the default WT line. A mouse whose genotypeColor differs is a transfer.
  cages: GridCage[];
}

export interface ColonyGrid {
  colonyId: number;
  colonyName: string;
  lines: GridLine[];
}
