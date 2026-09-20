# tasks archive — schema-evolution fold preamble (2026-09-04 → 2026-09-05)

> Rolled off from 00.tasks.md. History of how P0 was re-scoped and the
> schema folded R1–R15. Current schema is authoritative in packages/db/SCHEMA.md.

Re-scoped 2026-09-04 (gpt_01): P0 split into sub-milestones P0-a / P0-b / P0-c;
xlsx export moved to DEFERRED (bottom). Schema refinements R1–R6 folded
2026-09-04: slot + mouse_line entities, unique-alone natural keys, litter-code
{3,5}; the genotyping block was PROMOTED from DEFERRED to P1.
Append-only model + surrogate identity folded 2026-09-04 (plan §4 R2/R7):
mouse = birth facts, mutable state → mouse_attr_log; per-line counter dropped.
Identity naming aligned 2026-09-04: mouse PK = `id`; litters carry
mouse_letter_id (UNIQUE); natural key = (litter_id, pup_number); new
mice.reclip_tag (plan Q23).
R8/R9 folded 2026-09-04: tables PLURAL (task_status_history →
task_status_transitions); litter_seq column DROPPED — litter order derived via
ORDER BY length(mouse_letter_id), mouse_letter_id COLLATE "C", pup_number;
base-26 codec survives in packages/domain for code GENERATION only; PK `id` /
FK `mouse_id` (mouse_seq_id, mouse_ref retired); reclip_tag pipe-joined.
R10 folded 2026-09-04 (plan §4 R10 — real-workbook evidence): P0.2 REOPENED —
new matings/mouse_genotypes/mouse_events/notes tables; SIX enums
(mouse_event_kind); four soft-delete-safe partial uniques (slots now
(cage_id, label)); mice 19→17 cols; tasks+notes APPEND-ONLY (self-referencing
origin_task_id/origin_note_id, first row = itself, id drawn from a SEQUENCE),
task_status_transitions MERGED into tasks; migrations 0001–0006 amended +
new 0007/0008.
R11-R15 folded 2026-09-05 (plan §4): schema REDESIGNED — `matings` split into
`mates` (couple) + `litters` (one cycle each, carrying litter_code + seq);
`mouse_ids`/`litter_code_counter`/`pups` GONE; `mice` split into `mouse_meta`
(birth-given identity, what everything else FKs to) and `mice` (APPEND state
rows: cage/slot/status, current = DISTINCT ON head query); natural key is
(litter_id, pup_number) on mouse_meta; the professor's label is COMPOSED
(sex || pup_number || litter_code) and litter_code is denormalized onto
mouse_meta behind a composite FK. **Structure is NOT restated in this doc —
`packages/db/SCHEMA.md` is generated from the live DB and is authoritative.**
