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

export interface MouseCell {
  metaId: number;
  renderedId: string; // sex+number+litter-code+tag, e.g. "M4BCW", "U3BCX", "F10BEVe"
  sex: Sex;
  genotype: string; // derived marker-combo label, e.g. "Nf1 f/+", "WT"
  signal: SignalColor;
  isAlive: boolean;
  attention: string | null; // short note surfaced on the cell (why it is flagged / planned)
}

export interface GridSlot {
  slotId: number;
  label: string; // short label shown in the UI, e.g. "A8" (global form: 2413-A8)
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
  cages: GridCage[];
}

export interface ColonyGrid {
  colonyId: number;
  colonyName: string;
  lines: GridLine[];
}
