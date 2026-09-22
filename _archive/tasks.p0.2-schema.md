# P0.2 / P0.2-R — Schema (ARCHIVED 2026-09-05)

> Cut from `00.tasks.md`. HISTORY ONLY. These acceptance criteria describe the
> schema as it stood BEFORE the R11-R15 redesign, and name tables that no longer
> exist (`mouse_ids`, `litter_code_counter`, `matings`, `pups`) and columns that
> were renamed (`mouse_letter_id`, `baby_litter_id`, `litter_id` on mice).
> For the CURRENT schema read `packages/db/SCHEMA.md`, which is generated from
> the live database, and plan §4 R11-R15 for the reasoning.

### P0.2 Schema (`packages/db`) — P0-a

- [x] Enums migration: sex (M/F/**U** — added 2026-09-04: newborns = U
      non-warn; bare non-pup → U + warn, never guess), mouse_status, attention,
      task_status, cell_signal. move_reason stays TEXT in v0.1 (promote to enum
      later).
      AC: exactly these 5 enums exist with the value sets from the architect
      brief; sex includes `U`; NO sample_type / lifecycle_event enums (deferred).
- [x] Core tables (rev. 2026-09-04 R1/R2/R7): users (stub, clerk_user_id
      nullable, role default 'staff'), colonies → subcolonies → cages
      (cage_number UNIQUE alone, location, status) → slots (cage_id FK, label
      **UNIQUE GLOBAL** — adopted, Q19 resolved; verify physical oddity at
      first real import; deleted_at) → mice = **identity + birth facts ONLY**
      (id BIGINT PK — surrogate record id, unique + monotonic, NOT
      the litter id; line_id FK mouse_lines, litter_id FK, pup_number INT,
      dob, is_pooled BOOL, reclip_tag TEXT nullable — `+N` re-clip notation,
      may hold multiple PIPE-joined like `6|8`, plan Q23 — raw_genotype,
      genotype_parsed JSONB — plain fields, NOT normalized — raw_notes,
      raw_parents, provenance cols, deleted_at) + derived-cache cage_id/slot_id
      NULLABLE FKs (explicitly sanctioned cache rebuilt from mouse_moves —
      TRUTH = mouse_moves, never hand-edited; move/transfer stays cage-based);
      NO `mouse_label` column on mice — the rendered label lives in
      mouse_attr_logs; NO litter letter-code or sort-key
      column on mice — litter identity lives on litters (R9: no litter_seq
      exists anywhere); natural re-import
      key = PARTIAL unique index (litter_id, pup_number) WHERE
      is_pooled=false AND deleted_at IS NULL; mouse_lines entity (id, name
      UNIQUE, deleted_at).
      AC: FK chains colonies→subcolonies→cages→slots and cages→mice enforced;
      BIGINT identity PKs; `deleted_at` on all mutable tables; mice have NO
      mutable life-state columns (no sex/status/attention/notes/label/
      genotype_label) and NO text mouse_line/slot columns and NO
      mouse_letter_id column (litter identity lives on litters; no litter_seq
      column exists on ANY table — R9); the partial unique index rejects a
      duplicate non-pooled (litter_id, pup_number) and admits pooled rows;
      MOVE-service invariant testable: slot_id set ⇒ slots.cage_id =
      mice.cage_id.
- [x] mouse_attr_logs table + mouse_current_attrs view (Option A, 2026-09-04) —
      append-only: id, mouse_id FK mice, field CHECK IN (sex,
      mouse_label, status, attention, notes, genotype_label,
      raw_genotype_correction), value TEXT, actor_id NOT NULL FK users,
      created_at; NO deleted_at, no UPDATE/DELETE path; index (mouse_id,
      field, created_at DESC, id DESC); plain NON-unique index on
      mouse_label values for search (labels repeat/change — never UNIQUE);
      view mouse_current_attrs = DISTINCT ON latest value per (mouse_id,
      field). UI/dashboard reads the VIEW, not raw logs.
      AC: UPDATE/DELETE blocked (trigger or grant); for a mouse with 2 rows on
      the same field the view returns exactly the latest (created_at, id
      order); NO unique constraint on mouse_label; actor_id NOT NULL
      enforced.
- [x] mouse_moves table — append-only: mouse_id FK mice, from_cage_id,
      to_cage_id, nullable from_slot_id/to_slot_id (ADOPTED 2026-09-04, Q21
      resolved), moved_by NOT NULL, moved_at, reason TEXT, idempotency_key
      UUID UNIQUE. Location TRUTH — mice.cage_id/slot_id is a derived cache
      of the latest row.
      AC: NO deleted_at column; duplicate idempotency_key insert rejected;
      history queries order by moved_at then PK; slot columns nullable and
      NULL-safe in all move queries; moved_by NOT NULL enforced.
- [x] litters table (mother_mouse_id, father_mouse_id, birth_date, pup_count,
      line_id FK mouse_lines, created_by) + litter identity cols (relocated
      2026-09-04): mouse_letter_id TEXT (the litter's letter code, e.g. BCW —
      shared by littermates; mouse_letter_id UNIQUE — the import resolution
      key AND, with length-first ordering, the derived sort key via JOIN; R9)
      + global persistent litter-code counter
      storage (codes `^[A-Z]{3,5}$`, grows via rollover):
      litter_code_counter(id SMALLINT PRIMARY KEY CHECK (id = 1), next_seq
      BIGINT NOT NULL) — SINGLE row; allocate under SELECT ... FOR UPDATE
      inside the CREATE-LITTER transaction; code = encodeLitterCode(next_seq),
      then next_seq += 1. A single global counter row, NOT a per-litter
      column (R9-compliant). Seeded so the first emitted code is BIZ. Do NOT
      derive the next code from SELECT max(...) — race-prone. Per-line
      mouse_id_sequence DROPPED (2026-09-04, Q22 resolved) — the GLOBAL
      litter-code counter is the ONLY sequence; pup_number is JUST a
      distinguishing number within one litter — no birth-order/tag semantics,
      NO CHECK restricting its values (plan Q11 RESOLVED 2026-09-04).
      AC: litters FK mother/father to mice and created_by to users;
      mice.litter_id FKs litters; mouse_letter_id is UNIQUE on litters
      (import's only resolution key) with CHECK (mouse_letter_id ~
      '^[A-Z]{1,5}$'); NO litter_seq column exists on litters or any other
      table; the global litter-code counter is persistent (survives restart)
      and is a SINGLE row, not a per-litter column; NO per-line counter table
      or column exists; SELECT ... ORDER BY length(mouse_letter_id),
      mouse_letter_id COLLATE "C" over the fixture code set returns the same
      order as ORDER BY decodeLitterCode(mouse_letter_id).
- [x] CREATE INDEX litters_code_order_idx ON litters (length(mouse_letter_id),
      mouse_letter_id COLLATE "C") WHERE deleted_at IS NULL; —
      UNIQUE(mouse_letter_id) alone does NOT serve an expression ORDER BY.
      Note: the mouse-list query sorts mice by litter columns across a JOIN,
      so no index removes that sort; cardinality is low (hundreds of litters,
      thousands of mice) so an in-memory sort is fine for P0 — this index is
      for litter-list / next-code queries. Do not over-engineer.
      AC: the migration creates litters_code_order_idx exactly as specified
      (partial, expression-based, COLLATE "C").
- [x] tasks table (subject_mouse/cage, litter_id, task_type, due_date, status,
      created_by/done_by/verified_by + timestamps).
      AC: status transitions representable open→done→verified/cancelled; actor
      columns FK users; litter_id nullable FK litters.
- [x] task_status_transitions table — append-only: task_id FK, from_status (NULL on
      create), to_status, actor_id FK users, actor_role TEXT (DENORMALIZED at
      transition time — records the role that authorized, not current role),
      created_at. tasks.status stays the fast current pointer. Purpose-built
      role-carrying task timeline, NOT a duplicate of audit_logs (inserted in
      the SAME tx as the audit_logs row).
      AC: NO deleted_at column; no UPDATE/DELETE path in app code; from_status
      NULL exactly on task creation; actor_role stores the transition-time role.
- [x] audit_logs table: actor_id NOT NULL, action, entity, entity_id, before_json,
      after_json, created_at — append-only.
      AC: NO deleted_at column; no UPDATE/DELETE path in app code; trigger or
      grant blocks UPDATE/DELETE.
- [x] Import provenance tables: import_batches (source_filename, file_sha256 UNIQUE,
      sheet_snapshot JSONB, imported_by/at), raw_sheet_rows, import_errors,
      color_maps;
      provenance cols (import_batch_id, source_sheet, source_row) on mutable tables.
      AC: duplicate file_sha256 insert rejected; import_errors rows carry
      (batch, sheet, row, col, raw_value, rule_violated, severity).

### P0.2-R Schema REOPENED (2026-09-04, plan §4 R10 — workbook-driven redesign)

The `[x]` tasks above SHIPPED and stay checked; the real-file extraction
(plan §4 R10) falsified parts of them, so the redesign is tracked here rather
than by silently unchecking shipped work.

Migration plan (all pre-seed — zero data at risk): AMEND in place 0001 (add
enum), 0002 (four partial uniques + slots (cage_id, label) + drop two mice
columns), 0004 (field CHECK, plus the tasks/notes append-only work), 0005
(tasks append-only + merge task_status_transitions), 0006 (import_errors
entity/entity_id); NEW `0007_breeding_and_records.sql` (matings,
mouse_genotypes, mouse_events, notes, triggers, views) and
`0008_task_mating_link.sql` (tasks.mating_id — it CANNOT be inlined in 0005
because tasks sorts before matings). NOTE: amending applied migrations makes
the runner FAIL on checksum BY DESIGN — the developer must
`dropdb && createdb && migrate` once; this is NOT a runner bug.

- [ ] AMEND 0001: add enum `mouse_event_kind
      ('tissue_collection','genotyping')` (plan Q27).
      AC: exactly SIX enums exist (supersedes the "exactly these 5 enums" AC
      above); mouse_event_kind has exactly the two values.
- [ ] AMEND 0002: soft-delete-safe uniqueness — `cages.cage_number`,
      `mouse_lines.name`, `litters.mouse_letter_id` become PARTIAL unique
      indexes `WHERE deleted_at IS NULL`; `slots` UNIQUE(label) GLOBAL →
      partial UNIQUE (cage_id, label) WHERE deleted_at IS NULL (Q19
      EMPIRICALLY FALSIFIED: 'F5' exists in cages '2413' AND '4'). DROP
      `mice.genotype_parsed` + `mice.raw_notes` (19 → 17 columns).
      AC: for each of the four keys, tombstoned row + re-import of the same
      natural key succeeds (no abort); two live 'F5' slots in DIFFERENT cages
      coexist; a duplicate live (cage_id, label) slot is rejected; mice has
      17 columns with no genotype_parsed/raw_notes.
- [ ] AMEND 0004: `mouse_attr_logs.field` CHECK drops 'notes' (notes move to
      the `notes` table — R10); shared append-only trigger machinery
      (reject_mutation + truncate guards) prepared for reuse by notes/tasks.
      AC: INSERT with field='notes' is rejected; every remaining set member
      is accepted.
- [ ] AMEND 0005: `tasks` APPEND-ONLY (user directive, plan §4 R10) — add
      `origin_task_id` as the LOGICAL id, FIRST ROW POINTING AT ITSELF (an
      "update" = NEW row carrying the same origin_task_id; a BIGINT
      first-row id — that would need a post-insert UPDATE, which the
      append-only trigger rejects); MERGE `task_status_transitions` INTO
      tasks (each row IS a transition; from_status = previous row's status;
      actor_role denormalized onto the tasks row); drop the separate
      task_status_transitions table; reject_mutation + truncate triggers;
      an explicit DISTINCT ON head query (the `current_tasks` view was
      REMOVED 2026-09-05, user). COST accepted (recorded R10):
      current-state reads spell out DISTINCT ON; no UNIQUE constraints on
      mutable fields.
      AC: UPDATE/DELETE/TRUNCATE on tasks rejected by trigger; two rows
      sharing one origin_task_id → the DISTINCT ON head query returns exactly the latest
      (created_at, id order); no task_status_transitions table exists; a
      status change is exactly one INSERT carrying from_status + actor_role.
- [ ] AMEND 0006: `import_errors` gains `entity` / `entity_id` (nullable) so
      triage can navigate to the row needing the patch.
      AC: a warn row can carry (entity, entity_id) pointing at the created
      row; existing severity/provenance columns unchanged.
- [ ] NEW 0007_breeding_and_records.sql: `matings` (one row per breeding
      cycle: subject_mouse_id, nullable mate_mouse_id + mate_raw_label,
      cage_id, mated_on + is_mated_on_approx + mated_on_raw,
      expected_delivery_on + approx + raw, nullable baby_litter_id = the OUTCOME,
      provenance, deleted_at; partial unique indexes: resolved pair-cycle,
      unresolved cycle, one-mating-per-litter); `mouse_genotypes` (mouse_id,
      order_index SMALLINT, marker_text; render via string_agg ORDER BY
      order_index); `mouse_events` (mouse_id, kind mouse_event_kind,
      occurred_on, is_occurred_on_approx, raw_value — ONE ROW PER DATE:
      '260629 260817' in one cell = two rows); `notes` (append-only,
      origin_note_id (self-referencing, first row = itself), subject_mouse_id, nullable
      mating_id, signal cell_signal — REUSED, no new enum, 'done' = plain
      settled note (Q29) — body, actor_id). NO current_notes view; DISTINCT ON
      view + reject_mutation AND truncate triggers. `matings` stays MUTABLE
      soft-delete (fact table, NOT a work item — plan R10 tasks-vs-matings).
      AC: duplicate resolved pair-cycle mating rejected; duplicate unresolved
      cycle rejected; two live matings on one litter_id rejected;
      UPDATE/DELETE/TRUNCATE on notes rejected; two notes sharing one
      origin_note_id → the DISTINCT ON head query returns the latest; a two-date
      mouse_events cell yields exactly two rows; matings rows soft-delete
      via deleted_at (no append-only trigger on matings).
- [ ] NEW 0008_task_mating_link.sql: `tasks.mating_id` nullable FK matings —
      separate file because tasks (0005) sorts before matings (0007).
      AC: tasks.mating_id FK enforced; NULL allowed; file applies after 0007.
- [ ] One-time reset + re-apply: `dropdb && createdb && migrate` 0001–0008
      from empty (the checksum failure on the amended applied migrations is
      BY DESIGN — see the note above).
      AC: full run from empty succeeds in order; immediate re-run is a no-op.

Service-layer invariants to carry into P0.6 (cannot be DB constraints — plan
§4 R10): mating pair-merge when an unresolved mate later resolves (the two
partial indexes cannot see each other — the one place matings can grow
duplicates); matings.baby_litter_id must point at a litter with the same parent
pair; notes/tasks origin-id continuity on updates (repository takes the origin id
EXPLICITLY — the UUID default is for NEW threads only); genotype order_index
contiguity; parent conflict across littermates → first-wins + warn.

