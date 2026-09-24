// Mouse LOCATION history — one row per placement, newest row = where the
// mouse is now. This is a slice of the `mice` version table
// (packages/db/migrations/0002_core_tables.sql): "an update does NOT modify a
// row: it INSERTs a new row for the same mouse_meta_id ... the row with the
// highest id per mouse_meta_id is the current state".
//
// DIVERGENCE, stated plainly: a real `mice` row carries the mouse's FULL
// state (sex, is_alive, death_reason, attention, location) and 0002's header
// forbids partial rows. This row carries the LOCATION fields only; the mock's
// other mouse state still lives on MouseCell and is patched in place by
// updateMouse. So one schema table is served by two mock mechanisms, and the
// mock cannot exhibit the "a partial row destroys what it omits" hazard 0002
// warns about. Accepted for MVP1 because the SCHEMA is untouched and the
// field this exists for — location — becomes single-sourced: the grid's
// placement is PROJECTED from these rows (lib/mouseLocations.ts), exactly as
// MouseCell.punches is projected from PunchRow. MVP2 widens the row to the
// real head-row DTO; nothing here has to be un-done to get there.
//
// `transit_status` is deliberately NOT modelled: its four stages duplicate
// the case/task workflow (owner ruling, 2026-09-24). The column keeps its
// 'verified' default.

export interface MouseLocationRow {
    // mice.id — monotone, so the highest row per mouse is the current one.
    locationId: number;
    metaId: number; // mice.mouse_meta_id
    // Both carried, as the table does. cage_id is not derivable from slot_id
    // at the DTO level, and a row that named only the slot would be the very
    // "partial row" 0002 forbids within this slice.
    cageId: number;
    slotId: number;
    // mice.effective_at — WHEN the mouse was actually in this place, not when
    // the row was written. Injected by the caller (the mutation layer is pure).
    effectiveAt: string; // ISO date
    // mice.reason — why this version exists. Free TEXT in the schema; the mock
    // writes 'import' (seed placement), 'created' (a new mouse's first row)
    // and 'move'.
    reason: string;
    // mice.change_note.
    note?: string;
}
