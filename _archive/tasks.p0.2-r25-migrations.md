# P0.2-R25 — Schema review-pass migrations 0009–0019 (ARCHIVED 2026-09-14, all DONE)

> Cut from `00.tasks.md` (docs.md §3 — completed sub-tasks of a partially-done
> feature). HISTORY ONLY. These are the shipped, checksum-guarded migration
> items of the P0.2-R25 review pass (plan §4 R25). The section's still-OPEN
> items (audit_logs real-immutability NOTE, slots.label relabel MEMO, Q31
> task-subject rule) stay LIVE in `00.tasks.md`. Current schema is authoritative
> in `packages/db/SCHEMA.md` (generated from the live DB).

- [x] `0009` drop import provenance columns (import_batch_id/source_sheet/source_row)
      off cages, slots, mouse_meta, mice, mates, litters, mouse_genotypes, mouse_events.
- [x] `0010` mothball import machinery: DROP raw_sheet_rows, import_errors,
      color_maps, then import_batches (FK order). 0006 stays on disk, inert.
- [x] `0011` `mice.sex` TEXT CHECK → `sex` ENUM.
- [x] `0012` move `line_id` mouse_meta → mice; appendVersion helper must carry it
      forward. Correct the stale 0002 bred-under comment in-migration.
- [x] `0013` `slots.label` → global partial unique (drop cage-scoped). Record the
      'F5' relabel blocker for the future import.
- [x] `0014` CREATE `genes` (id, code, label, description) + partial-unique on code.
- [x] `0015` rename `mouse_genotypes` → `mice_genes`; drop marker_text, add
      `gene_id → genes(id)`; keep (mouse_id, order_index) unique.
- [x] `0016` DROP `mouse_events` + `mouse_event_kind`. AC: doc records date landing
      as done tasks rows + accepted losses.
- [x] `0017` prev_id CAS on tasks/notes/mates/mice: ADD prev_id +
      `UNIQUE (origin_*_id, prev_id) WHERE deleted_at IS NULL`. AC: two concurrent
      edits off the same head — second INSERT rejected (deliberate breakage).
- [x] `0018` notes reach: ADD nullable FKs colony_id/cage_id/line_id/slot_id. NO
      exactly-one CHECK. AC: room-level (zero-target) and mouse+litter notes both insert.
- [x] `0019` audit_logs immutable: DROP trigger + updated_at/deleted_at, recreate
      the two indexes without the deleted_at predicate, ADD request_id/on_behalf_of_id,
      REVOKE UPDATE,DELETE. AC: an UPDATE on audit_logs is rejected.
- [x] Regenerate SCHEMA.md + ERD (from live DB); fix scenarios (flow-*.sql) to R25
      + add CAS/notes-reach/audit probes (commits 865e68b, 2006f87).
