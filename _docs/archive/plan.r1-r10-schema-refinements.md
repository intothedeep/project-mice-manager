# plan archive — schema refinements R1–R10 (2026-09-04 → 09-05)

> Cold storage (docs.md §2). History-only. SUPERSEDED by R11–R25 (see
> `plan.r11-r25-schema-redesign.md`) — most tables defined here
> (`mouse_attr_log`, `mouse_move`, `matings`, `mouse_events`, `mouse_genotypes`,
> `task_status_transitions`, view `mouse_current_attrs`) NO LONGER EXIST. The
> CURRENT schema is authoritative in `packages/db/SCHEMA.md` (generated from the
> live DB). Cut from `00.plan.md` §4 on 2026-09-16; nothing changed, only
> relocated. The still-live conclusions per R-item are carried in the §4 stub.

- Schema refinements (architect-validated, 2026-09-04):
  - **R1 slot entity (rev. 2026-09-04):** hierarchy colony > mouse line > cage >
    slot > mouse. New `slot(id, cage_id FK, label UNIQUE GLOBAL, deleted_at)` —
    global-unique label ADOPTED (Q19 resolved; verify physical oddity at first
    real import — SUPERSEDED by R10: Q19 EMPIRICALLY FALSIFIED, label is now
    partial UNIQUE (cage_id, label) WHERE deleted_at IS NULL);
    <!-- CORRECTION 2026-09-12 (user): the R10 composite amendment above is
    REVERSED. `slots.label` STAYS GLOBALLY unique (live DB already is —
    SCHEMA.md slots_label_key, shipped by migration 0013); the duplicate 'F5'
    (two cages) is handled by an IMPORT-TIME dedupe/relabel step, NOT a
    composite key. See §5 Q19. -->
    `mouse.slot_id` NULLABLE FK (replaces the old text slot
    field). `mouse.cage_id`/`mouse.slot_id` KEPT as an explicitly-sanctioned
    **derived cache** rebuilt from `mouse_move` (same class as task.status;
    never hand-edited; TRUTH = mouse_move) so move/transfer machinery stays
    cage-based and P0-c chip queries need no rewrite. Invariant enforced in
    the MOVE service: if slot_id is set, slot.cage_id must equal
    mouse.cage_id. mouse_move gains nullable from_slot_id/to_slot_id (Q21
    resolved: yes; NULL-safe queries).
  - **R2 identity (REVISED 2026-09-04 — surrogate identity; identity columns
    renamed/relocated 2026-09-04, final rename fold same day):** `mouse.id
    BIGINT` = surrogate PK (read as string) — unique, monotonic mouse RECORD
    id ("how many mouse records created"); it is NOT the litter id. DISTINCT
    from the `mouse_label` string = a DERIVED rendered display LABEL stored
    in `mouse_attr_log(field='mouse_label')` — composition: `sex +
    pup_number + (reclip_tag rendered with '+') + litters.mouse_letter_id`, e.g.
    `M4+10BCW` (replaces the old rendered-label) — it changes (U→M/F,
    pooled, tag reissue) and repeats → **NO UNIQUE constraint** (plain
    non-unique index for search); never confuse the mouse `id` PK with the
    `mouse_label` display string. Litter identity lives on the **`litter`
    entity, NOT on mouse**: `litters.mouse_letter_id` TEXT (the litter's letter
    code, e.g. `BCW` — shared by littermates, unique per litter).
    Natural re-import key = `(litter_id, pup_number)` PARTIAL
    unique index `WHERE is_pooled=false AND deleted_at IS NULL` (import
    resolves letter code → litter row directly via
    UNIQUE(litters.mouse_letter_id) — R9);
    line_id NOT part of uniqueness (global counter). `mouse_line` promoted
    to entity `mouse_line(id, name UNIQUE, deleted_at)`,
    `mouse.mouse_line TEXT` → `mouse.line_id FK` (ripples: litter.mouse_line,
    forward-fill output, search filter). Per-line counter DROPPED (Q22
    resolved) — the GLOBAL litter-code counter is the only sequence; pup
    number = operator-entered (Open Question 11). `cage_number` UNIQUE
    alone — low risk, consistent with cage_number_seq seed 2482 (Open
    Question 12).
  - **R4 deterministic sort key — SUPERSEDED by R9 (2026-09-04).** The sort
    guarantee (shorter before longer; AZZ→BAA and ZZZ→AAAA correct) is
    preserved, but DERIVED, not persisted:
    `ORDER BY length(litters.mouse_letter_id), litters.mouse_letter_id
    COLLATE "C", mice.pup_number` (then tag_suffix, reissue_seq). NEVER
    plain-string-sort the variable-length code.
  - **R5 extensible markers:** the existing `marker` table already suffices;
    add-marker = role-gated (director/admin) INSERT — no schema change per
    marker. Confirmed.
  - **R6 genotype = derived combined label (rev. 2026-09-04):** keep
    `mouse.raw_genotype` (imported truth); `genotype_label` = deterministic
    `;`-join of per-marker genotyping_result in `line_marker_panel` order,
    recomputed when a genotyping run completes and APPENDED as a
    `mouse_attr_log(field='genotype_label')` row (current via
    mouse_current_attr — NO mouse column update); NEVER overwrites
    raw_genotype. Lands with the P1 genotyping subsystem.
  - **R7 append-only mouse model (Option A, DECIDED 2026-09-04; identity cols
    renamed 2026-09-04):** `mouse` table = identity + birth facts ONLY
    (id BIGINT PK, line_id FK, litter_id FK, pup_number INT, dob,
    is_pooled BOOL, reclip_tag TEXT nullable — the `+N` re-clip notation,
    multiple reclips stored PIPE-joined like `6|8`, rendered with `+` in
    mouse_label (Open Question 23) — raw_genotype, raw_notes,
    raw_parents, provenance, deleted_at — no litter_seq anywhere, R9) —
    nothing mutates except deleted_at (plus the R1 derived-cache cols). ALL
    mutable life-state (sex, mouse_label, status, attention, notes,
    genotype_label, raw_genotype corrections) lives in ONE generic append-only
    `mouse_attr_log(id, mouse_id FK → mice.id, field CHECK-in-set (the set
    uses `mouse_label` — R2's name, never `rendered_label`), value
    TEXT, actor_id NOT NULL, created_at)` — NO deleted_at, no UPDATE/DELETE
    path; index (mouse_id, field, created_at DESC, id DESC); current values
    exposed via view `mouse_current_attr` (DISTINCT ON latest). The
    Excel-familiar dashboard reads the VIEWS, not raw logs. Import seeds
    initial log rows (actor = importing user); re-import diffs APPEND, never
    UPDATE. Pooled `+N` forms (MVP default): ONE row per source line, the
    `+N` part parsed into `reclip_tag`, raw `+N` label preserved,
    `is_pooled=true` — NOT exploded into multiple mice; excluded from the
    natural unique index; re-import matches pooled rows by raw label (grammar
    residual: Open Question 2; reclip_tag semantics: Open Question 23). Sex
    enum gains `U`: newborns = U non-warn; bare non-pup IDs → U + warn, never
    guess (Open Question 4).
  - **R8 table naming = PLURAL (DECIDED 2026-09-04):** tables are plural,
    columns and FKs stay SINGULAR (`cages` table ⟷ `cage_id` column — never
    `cages_id`). Authoritative map, and the ONLY source the migrations are
    written from: `mice`, `litters`, `cages`, `slots`, `tasks`, `colonies`,
    `mouse_lines`, `users`, `mouse_lines`, `mouse_moves`, `mouse_attr_logs`,
    `audit_logs`, `import_batches`, `import_errors`, `raw_sheet_rows`,
    `color_maps`, `transfers`, `snapshots`,
    `markers`, `line_marker_panels`, `genotyping_runs`, `genotyping_results`,
    `task_offset_rules`, `task_status_transitions`; view
    `mouse_current_attrs`. Exception: `litter_code_counter` is deliberately
    SINGULAR — it is a singleton (single-row) counter, not a collection.
    DEFERRED tables `matings` and `lifecycle_events` inherit the same rule
    when scheduled. PK on every table is `id` BIGINT; FK to `mice` is
    `mouse_id` (R8 singular-FK rule, unambiguous now that the display label
    is `mouse_label`); `mouse_seq_id` and `mouse_ref` are RETIRED names.
    One rename beyond
    pluralization: `task_status_history` → **`task_status_transitions`**
    ("histories" reads badly and the rows ARE transitions). Prose in these docs
    still says "mouse"/"litter" as ENGLISH — do NOT mass-rename prose; this map
    governs identifiers only.
  - **R9 litter_seq DROPPED (DECIDED 2026-09-04, supersedes R4):** no persisted
    base-26 column. `pup_number` on `mice` is the only sequence; litter order is
    DERIVED from the letter code. **Sort rule (single authoritative form —
    length FIRST):**
    `ORDER BY length(mouse_letter_id), mouse_letter_id COLLATE "C", pup_number`.
    Length-first is REQUIRED, not stylistic: codes are variable-length with a
    ZZZ→AAAA rollover and plain lexicographic sort puts `'ZZZ'` AFTER `'AAAA'`
    (wrong). For `^[A-Z]+$` codes this is provably identical to bijective
    base-26 order, so R4's guarantee is preserved without the column. Two
    follow-ons: (a) the base-26 codec REMAINS a pure fn in `packages/domain` —
    still needed to GENERATE the next code across the ZZZ→AAAA rollover (P0-b),
    merely no longer persisted; (b) import resolution simplifies to letter code
    → litter row directly via `UNIQUE(litters.mouse_letter_id)`, dropping the
    old `code → litter_seq → litter` hop. Natural re-import key is unchanged:
    `(litter_id, pup_number)`.
    **Precondition:** the length-first equivalence holds ONLY for `^[A-Z]+$`;
    lowercase, digits, spaces or empty codes BREAK it. Enforced by
    `CHECK (mouse_letter_id ~ '^[A-Z]{1,5}$')` on litters. The column is
    declared `COLLATE "C"` at DDL time (deterministic across libc/ICU version
    bumps, and lets a btree index serve the ORDER BY); the `COLLATE "C"` at
    call sites is then redundant-but-harmless documentation.
    **Naming note (user, 2026-09-04):** the number rendered INTO `mouse_label`
    (the `4` in `M4+10BCW`) is the value the professor calls "litter seq"; we
    persist and refer to it as **`pup_number`** because that name is more
    semantic — it is the pup's index WITHIN its litter. So "litter_seq" survives
    only as lab vocabulary, never as an identifier: the dropped `litter_seq`
    BIGINT (base-26 of the letter code) was a DIFFERENT thing and never appeared
    in the label. Label composition is unchanged.
  - **R10 workbook-driven schema redesign (DECIDED 2026-09-04 — real-file
    evidence; P0.2 REOPENED in 00.tasks):** extraction of the real Breeders
    sheet (`_assets/MouseRoomSheet-260823-ALJ.xlsx`, 226 mouse rows) proved
    the P0.2 schema cannot hold it.
    **Evidence.** Column fill rates: B Mouse line / D Cage# / E Slot all
    forward-filled; F MOUSE ID 100%; G GENOTYPE 76%; H DOB 99%; I MATE'S
    ID/GENOTYPE 26%; J Last mating date 19%; K PLUG 1%; L ~DELIV 3%;
    M TISSUE COLLECTION 97%; N GENOTYPING 98%; O Plans/Notes 75%;
    P Parents 98%. Six columns (I,J,K,L,M,N) had NO schema home; M and N at
    97/98% make that a real oversight, not a deferral. `slots.label` UNIQUE
    GLOBAL is EMPIRICALLY FALSIFIED: label 'F5' appears in two cages
    ('2413' and '4') — Q19's "verify at first real import" ran and FAILED.
    'Last mating date' is NOT a system timestamp: DELIV(L) minus mating(J)
    over the 8 rows having both gives gaps 4,3,7,59,49,3,−5,5 days (mean
    15.6) against ~20-day gestation, and one gap is NEGATIVE (delivered
    260812, re-mated 260817 — mice re-mate postpartum) — decisive proof that
    J and L describe DIFFERENT breeding cycles, so the flat sheet holds only
    the latest cycle and destroys all prior ones. That is the justification
    for the `matings` table. PLUG = the copulatory plug, the post-mating
    evidence checked each morning (finding one fixes embryonic day 0.5);
    no plug seen means the date is estimated — which is WHY 30 of 45 mating
    dates carry a '~'. Pregnancy tracking in practice is NOT column K (1%
    filled) but dated questions inside notes ('260824 preg?', '260831 Preg?
    Breed with WT for exp?', '260907 sac if not preg') — so note-date
    extraction into tasks is far more central than previously scoped.
    Genotype shape: ';' separator in 110 cells, ':' in 6 (typos), max 3
    markers (e.g. 'PlpCre;Nf1 f/+;ccEGFP').
    **NEW TABLES:** `matings` — one row per breeding cycle:
    subject_mouse_id, nullable mate_mouse_id + mate_raw_label,
    mated_on + is_mated_on_approx + mated_on_raw, expected_delivery_on +
    approx + raw, nullable baby_litter_id as the OUTCOME, provenance, deleted_at;
    partial unique indexes for resolved pair-cycle, unresolved cycle, and
    one-mating-per-litter. `mouse_genotypes` — mouse_id, order_index
    SMALLINT, marker_text; render via string_agg ORDER BY order_index.
    `mouse_events` — mouse_id, kind mouse_event_kind, occurred_on,
    is_occurred_on_approx, raw_value — ONE ROW PER DATE, so a cell holding
    '260629 260817' becomes two rows. `notes` — self-referencing origin_note_id
    as the LOGICAL id (first row points at itself), subject_mouse_id, nullable
    mating_id, signal cell_signal, body, actor_id. Version rows accumulate but
    rows stay MUTABLE with soft delete — append-only enforcement was dropped
    (decided 2026-09-05).
    **NO `current_tasks` / `current_notes` VIEWS (removed 2026-09-05, user).**
    Callers write the head query themselves — `DISTINCT ON (origin_*_id) ...
    ORDER BY origin_*_id, id DESC` — served by `tasks_origin_idx` /
    `notes_origin_idx`. The origin-id versioning itself is unchanged; only the
    convenience wrappers are gone.
    **`baby_litter_id`, not `litter_id` (renamed 2026-09-05, user)** — on
    `matings` it means the litter this cycle PRODUCED, which is a different
    sense from `mice.litter_id` (the mouse's own BIRTH litter). Same-named
    columns meaning opposite directions of the same relation is the kind of
    thing that gets mis-joined, so the name carries the direction.
    **NO `matings.cage_id` (decided 2026-09-05, user).** The workbook has no
    "cage where the mating happened" datum — col D is the mouse's CURRENT
    cage, so copying it would record the wrong thing for a column with no
    source data. Derivable from `mouse_moves` at `mated_on` if ever needed.
    `matings.baby_litter_id` is NOT droppable by the same argument: when one pair
    mates repeatedly, parent back-lookup on `litters` cannot say WHICH cycle
    produced WHICH litter — the very loss `matings` exists to fix.
    **CAGE/SLOT DIVERGENCE GUARD (added 2026-09-05).** `mice` and
    `mouse_moves` carry cage_id alongside slot_id while `slots` already has
    cage_id; verified by deliberate breakage that a mouse could claim cage 1
    while sitting in a slot of cage 2. Fixed with `slots UNIQUE (id, cage_id)`
    + composite FKs. cage_id is NOT dropped — the workbook gives a cage for
    mice with unknown slot, and MATCH SIMPLE skips the check when slot_id
    IS NULL, so that case still records.
    **NEW ENUM:** `mouse_event_kind ('tissue_collection','genotyping')` —
    the P0.2 "exactly 5 enums" AC becomes SIX (Q27).
    **AMENDED:** `slots.label` global UNIQUE → partial UNIQUE (cage_id,
    label) WHERE deleted_at IS NULL.
    <!-- REVERSED 2026-09-12 (user): this specific slots.label amendment is
    rejected. `slots.label` STAYS GLOBALLY unique (live DB is already global —
    SCHEMA.md slots_label_key via migration 0013); the composite (cage_id,label)
    was NEVER adopted. The real workbook's 'F5'-in-two-cages is handled by an
    import-time dedupe/relabel step (see 00.tasks P0.4). The rest of this
    AMENDED clause — the partial-unique fix on cages.cage_number /
    mouse_lines.name / litters.mouse_letter_id, the mice column drops, the
    import_errors and tasks.mating_id changes — STANDS unchanged. -->
    The same soft-delete bug class is fixed
    on `cages.cage_number`, `mouse_lines.name`, `litters.mouse_letter_id` —
    all four become PARTIAL unique indexes (tombstone + re-import previously
    aborted the whole import). `mice` DROPS `genotype_parsed` and
    `raw_notes` (19 → 17 columns). `mouse_attr_logs.field` CHECK drops
    'notes'. `import_errors` gains `entity`/`entity_id` so triage can
    navigate to the row needing the patch. `tasks` gains `mating_id`.
    **UNRESOLVED REFERENCES** (mate, parents): nullable FK + preserved raw
    text + an import_errors warn row. Never abort, never drop a row. Same
    for DOB junk ('Check List') and the malformed cage '4'.
    **APPROXIMATE DATES:** DATE + sibling `is_*_approx BOOLEAN` + preserved
    `*_raw TEXT`. Rejected daterange (unindexable for the date queries every
    view needs) and string-only (kills date arithmetic).
    **REJECTED USER DIRECTIVES (reasons recorded):** (a) mother_id/father_id
    on `mice` — parents live on `litters`, siblings share parents by
    definition, and adding them widens the very table the user wants
    narrower; (b) a new `kind` enum for notes — `cell_signal
    (done|instruction|plan)` already IS that mapping, so notes REUSE it
    ('done' = a plain settled note), finally making cell_signal load-bearing
    rather than dead schema; (c) breeding-as-tasks-only — see the
    tasks-vs-matings distinction below.
    **APPEND-ONLY TASKS + SELF-REFERENCING ORIGIN ID (user directive,
    2026-09-04 — SUPERSEDES the `thread_id UUID` design):** `tasks` and
    `notes` become APPEND-ONLY with `id` = physical row and
    `origin_task_id` / `origin_note_id` = the LOGICAL id, where **the first
    row points at ITSELF** (`origin_task_id = id`) and an "update" is a NEW
    ROW carrying that same origin id.
    <!-- SUPERSEDED FOR TASKS 2026-09-13 (user): the single `tasks` table
    versioned by origin_task_id is REPLACED by the two-table CASE model
    (`cases` + append-only `task_events`) — see "Task model v2" at the end
    of §4. The origin-id versioning pattern REMAINS LIVE for `notes` (and
    the other versioned tables + prev_id CAS); only its application to
    tasks is superseded. -->
    The chicken-and-egg (the id is unknown before INSERT) is solved by
    drawing the id from an explicit SEQUENCE first, NOT by a post-insert
    UPDATE — which the append-only trigger would rightly reject:
    `CREATE SEQUENCE tasks_id_seq;` `id BIGINT PRIMARY KEY DEFAULT
    nextval('tasks_id_seq')`, then
    `WITH new_id AS (SELECT nextval('tasks_id_seq') AS id)
     INSERT INTO tasks (id, origin_task_id, ...) SELECT id, id, ... FROM new_id;`
    One atomic statement, no UPDATE.
    **WHY THIS BEATS THE UUID:** a UUID `thread_id` is not the PK of any row,
    so nothing can FK to it — the DB cannot stop a reference to a task that
    never existed. `origin_task_id` points at a REAL row (the first one),
    which append-only guarantees is never deleted, so it is a genuine
    self-FK: `origin_task_id BIGINT NOT NULL REFERENCES tasks (id)`. Other
    tables reference the origin row the same way. This also RETIRES the
    earlier `task_identities` / `note_identities` side-table proposal — no
    extra table is needed, and referential integrity is preserved.
    ~~CONSEQUENCE: `task_status_transitions` becomes REDUNDANT and is MERGED
    INTO `tasks` — each append-only tasks row IS a transition, `from_status`
    is the previous row's status, and `actor_role` (denormalized at
    transition time) moves onto the tasks row. COST, stated honestly: every
    current-state read now needs an explicit DISTINCT ON head query (the
    `current_tasks` view was removed 2026-09-05), and
    UNIQUE constraints cannot be placed on mutable fields.~~
    <!-- SUPERSEDED 2026-09-13: task transitions now live in append-only
    `task_events` under `cases`; the gen_key UNIQUE finally sits on the
    IMMUTABLE `cases` row — see Task model v2 below. --> The
    origin-id versioning pattern now applies uniformly to `notes` and
    `tasks` — though APPEND-ONLY ENFORCEMENT WAS DROPPED 2026-09-05: version
    rows still accumulate, but every table is mutable with `deleted_at`, so
    `reject_mutation()` and its triggers are gone;
    `matings` stays a normal MUTABLE soft-delete table (its state
    changes are few and it is a fact table, not a work item) — checked
    against this plan: no conflict, §2's append-only class is a closed list
    and transfers/snapshots set the mutable-new-table precedent.
    **TASKS vs MATINGS (user question, recorded):** tasks = WORK TO DO
    (created by a person, closed by a person, soft-deletable); matings = a
    BIOLOGICAL FACT (observed; outcome is a litter or failure; must never be
    deleted). They look alike only because both relate to breeding work —
    only tasks/notes use the append-only/threaded shape. Relationship:
    `tasks.mating_id` points AT a mating ("check this cycle");
    `matings.baby_litter_id` is the outcome.
    **SERVICE-LAYER INVARIANTS (cannot be DB constraints):** mating
    pair-merge when an unresolved mate later resolves (the two partial
    indexes cannot see each other — the one place matings can grow
    duplicates); matings.baby_litter_id must point at a litter with the same
    parent pair; notes/tasks origin-id continuity on updates (a fresh sequence value is
    a convenience for NEW threads and a footgun for updates — the repository
    must take the origin id explicitly on every update path); genotype order_index contiguity; parent
    conflict across littermates → first-wins + warn.
