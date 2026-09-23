# TASKS — Lopez-Juarez Mouse-Colony Automation

> Completed items live in `_archive/` (cold storage — do not read unless
> investigating history). Active per-sub-phase detail lives in `docs/phases/`
> (read ON DEMAND when a stub below is insufficient; the stub is the truth).
> This doc holds the index + cross-cutting content + planned work only.

Task legend: `[ ]` TODO · `[~]` IN PROGRESS · `[x]` DONE.
Each task lists AC = deterministic acceptance criteria.
> Schema-evolution fold history (P0 re-scope + R1–R15) rolled off → _archive/tasks.schema-fold-preamble.md  <!-- ARCHIVE: history-only -->
> Current schema is authoritative in packages/db/SCHEMA.md (generated from live DB), NOT restated here.

## P0 — Prototype (LOCAL ONLY)

### P0.1 Scaffold — P0-a — DONE

> Monorepo scaffold (pnpm+turbo, colony_client_web + colony_server + packages)
> and local Postgres + checksum-guarded migration runner shipped. <!-- ARCHIVE: history-only -->
> Detail: [_archive/tasks.p0-scaffold-and-mock-ui.md](./_archive/tasks.p0-scaffold-and-mock-ui.md)

### P0.2 Schema (`packages/db`) — P0-a — DONE, then SUPERSEDED (2026-09-05)

> Schema shipped, then REDESIGNED by plan §4 R11-R15 (mouse_meta/mice split,
> mates + litters, denormalized litter_code). The original P0.2 and P0.2-R
> acceptance criteria describe tables that no longer exist and are history only.
> <!-- ARCHIVE: history-only -->
> Detail: [_archive/tasks.p0.2-schema.md](./_archive/tasks.p0.2-schema.md)
>
> **CURRENT SCHEMA IS NOT DESCRIBED IN THIS DOC.** It is generated from the live
> database into [packages/db/SCHEMA.md](./packages/db/SCHEMA.md) (with
> [ERD.core.png](./packages/db/ERD.core.png)) by
> `packages/db/scripts/{schema-doc,erd}.sh`. Regenerate after every migration
> change rather than restating structure here — restating it is what produced
> the drift this stub replaces.

### P0.2-R25 Schema review pass (`packages/db` migrations 0009+) — P0-a

> Plan §4 R25. New checksum-guarded migration files only (never edit 0001-0008).
> Verify each by DELIBERATE BREAKAGE against a rebuilt DB (§19), then regenerate
> `packages/db/SCHEMA.md` + ERD. Tests stay SUSPENDED.

> Migrations `0009`–`0019` (drop import-provenance cols, mothball import machinery, sex ENUM, line_id→mice, slots.label global-unique, genes + mice_genes, drop mouse_events, prev_id CAS, notes reach, audit_logs immutable) + SCHEMA.md/ERD regen — all DONE. <!-- ARCHIVE: history-only -->
> Detail: [_archive/tasks.p0.2-r25-migrations.md](./_archive/tasks.p0.2-r25-migrations.md)

- [ ] NOTE — audit_logs REAL immutability: 0019's `REVOKE UPDATE,DELETE FROM PUBLIC`
      is bypassed by the table OWNER (scenarios PROBE 11 proved it). For true
      append-only, the app must connect as a NON-OWNER role granted INSERT/SELECT
      only, then `REVOKE UPDATE, DELETE ON audit_logs FROM <app_role>`. Belongs with
      the P2 Clerk-auth / RLS role work (DB role separation does not exist yet).
- [ ] MEMO (revisit BEFORE any import) — slots.label is now GLOBALLY unique (0013),
      but the real workbook has label 'F5' in cages '2413' and '4'. The deferred
      import CANNOT load that data without a relabel step. Decide the relabel scheme
      (e.g. cage-number-qualified labels, as the scenarios now use) before import.
      RATIFIED 2026-09-12 (user): keep slots.label GLOBALLY unique (R10 composite
      proposal REJECTED — plan §5 Q19); the relabel/dedupe happens at IMPORT time.
      Actioned as the P0.4 dedupe task below.
- [ ] NOTE (2026-09-16, comment-only, out of scope) — `0002_core_tables.sql:210-227`
      still SAYS `slots.label` is unique PER CAGE; `0013` made it GLOBAL (live DB
      `slots_label_key`). 0001-0008 are frozen, so the stale comment stays until
      0002 is touched for another reason; SCHEMA.md is the truth, not the comment.
- [ ] OPEN Q31 (Dr. Lopez-Juarez) — the real task-subject rule: per task type, which
      subjects are valid, and may a task have zero/multiple? And should `tasks` gain
      colony/line/slot FKs to mirror the R25 notes reach? Subject columns stay
      unconstrained until she answers.

### P0.3 Domain parsers (`packages/domain` — pure, no I/O) — P0-a — TODO (7 [ ])

> Pure parsers: tiered mouse-ID parser (BLOCKED-BY plan Q4 disposition freeze),
> litter-code base-26 codec (mock impl exists in `lib/litterCode.ts` — fold, don't
> rewrite), YYMMDD codec, forward-fill, `canTransition` (5-state matrix pending
> Q18), optional note-date extractor; parser test suite SUSPENDED (§19).
> <!-- DETAIL: active, read on demand -->
> Detail: [docs/phases/p0.3.tasks.md](./docs/phases/p0.3.tasks.md)

### P0.4 ETL (`apps/colony_server` helpers) — P0-a — TODO (5 [ ])

> Breeders-only synchronous exceljs import (one tx, cage-before-slot), slot-label
> dedupe/relabel at import (Q19 global-unique), idempotent upsert by
> (litter_id, pup_number), raw_sheet_rows archival of all 9 sheets, import-error
> report endpoint + UI. <!-- DETAIL: active, read on demand -->
> Detail: [docs/phases/p0.4.tasks.md](./docs/phases/p0.4.tasks.md)

### P0.5 Seed data — P0-a

- [ ] Mock/seed generator: realistic anonymized seed derived from the real xlsx
      (structure, ID grammar, colors preserved; identifying content scrambled).
      AC: `seed` command populates an empty local DB; prototype + full test suite
      run green without the live file present.

### P0.6 Server API + UI — P0-a — IN PROGRESS (1 [x] mock-UI suite archived · 17 [ ])

> **NOT MVP-blocking (user, 2026-09-17):** the MVP is mock data + mock APIs only;
> server + persistence is Phase 2 (plan §3 POLICY). The server-side items in this
> phase — endpoints, MOVE transaction, repositories, `appendVersion`, audit writes
> — are Phase 2 work. Only the mock-UI items here are on the MVP path.

> Mock-UI prototype suite DONE (archived). Open: register-mouse/litter wizard
> (design only), rendering-perf at scale (analysis only), task assignment + group
> eligibility, `appendVersion` helper (mice/mates/notes — tasks superseded by
> P0.9), unplaced-mice visibility, server endpoints, MOVE tx, dashboard,
> Excel-familiar grid, cage-grid view, history timeline, search/filter, move UI,
> ticket bin (build against P0.9), audit viewer, local-run setup.
> Still-open pointers: cross-line move warn-vs-block; Q33/Q34.
> <!-- DETAIL: active, read on demand -->
> Detail: [docs/phases/p0.6.tasks.md](./docs/phases/p0.6.tasks.md)

### P0.7 Litter recording + auto tasks — P0-b (MVP v0.2) — IN PROGRESS (v1 [x] · P0.7-b steps 1,2,3,5,8,8b,8c,9a,9b,9c,9d [x] + inline sex editor [x] SUPERSEDED-not-shipped; 4 = professor GATE; 6 + NEW 11 (remove inline cell editing) [~] IN FLIGHT; NEW 6a + 7 + NEW 8d (`untagged` punch location) + 9e + 10 + NEW 12 (replacement edit surface, design RULED) + SEED_COLONY note [ ] · 6 base tasks [ ])

> Add-mouse v1 SHIPPED mock-era (archived). P0.7-b add-flow split + punch records:
> migration 0026, `PunchRef` types, the `extractLitterCode` blocker fix, the FOUR
> add mutations, `buildMouseLabel` and the whole LABEL-PROJECTION family are now
> DONE — 1, 2, 3, 5, 8, 8b, 8c, 9a, 9b, 9c, 9d. Closed 2026-09-22, all reviewer
> PASS: **9c** (`15194aa`) retired `extractLitterCode`, its regex + six tolerated
> forms + three-instance bug history moved to `docs/phases/p0.7.plan.md` FIRST and
> byte-verified by diff, `peekNextLitterCode` still `BGY`; **8c** (`4d5870e`)
> mints the implicit `toe` punch in `addMouse` — 25 mice none with zero punches,
> 26 pairwise-distinct `punchId`s, first minted id 23 off seed max 22, `'toe'` in
> exactly one non-fixture file; **9d** (`fcece2b`) made `ParentCell` a
> discriminated union (plan §5 Q46 option C) — metaId 101's parent renders
> `M4BCW.2` with BOTH `mouseLabelOf` and `composeMouseLabel` verified in the
> chain, `ParentRef`/`MouseDetail.parents` gone; **8b** (`da51a75`) split
> `colonyMutations.ts` → 307 + `updateMouse.ts` 107 + `colonyMutationHelpers.ts`
> 114, meeting step 8's criterion (i) via the AC's SECOND branch (`< 400` plus a
> written justification: each add mutation's input type is coupled to the function
> below it, so splitting further cuts an artificial seam) — recorded on the task
> so it is not re-litigated.
> Step 4 is the professor GATE — Q39/Q41/Q44 answered, Q40 dissolved, **Q45
> RESOLVED 2026-09-18** (migration 0027 `pup_number_offsets` +
> `MouseCell.pupOffsets`); only **Q42** and **Q43's narrower sub-question** (does
> a Tissue-collection case also mint a `toe` punch row?) remain, and Q43-narrow
> gates step 10 only.
> **PUNCH TOMBSTONES — OWNER DECIDED 2026-09-22, option B** ("B: correct.
> because we can update punch record's deleted_at"): `MouseCell.punches` stays
> ACTIVE ROWS ONLY and a removed punch is tombstoned in a separate append-only
> PUNCH LOG served by its own selector, mirroring `useTaskLog()`. Step 6's
> in-flight implementation had flipped `punches` to carry tombstones, against
> plan §4, `0026`'s `WHERE deleted_at IS NULL` index, `grid.ts`'s header and
> `rules/core.md`'s "mask at read". B RESTORES plan §4 — §4 is unchanged. New
> task **6a (punch history contract)** carries the type/store work and BLOCKS 6;
> step 6's AC was REWRITTEN (the old one is the defect — see below) and its
> in-flight work REBASES rather than restarts; step 7 grows to own the
> `punchLog` seed + `usePunchLog(metaId)`; step 10's AC is unchanged and only
> TIGHTENED to name the selector. SIXTH AC defect logged in the phase file's
> PATTERN block, a NEW SUB-SHAPE: an AC that silently MANDATES a schema change
> because the state shape it operates on has no room for what it demands.
> **IN FLIGHT (developers dispatched 2026-09-22): step 6** `lib/punchMutations.ts`
> (the NEW-module requirement stands on SRP alone, since 8b took the file to 307;
> now BLOCKED-BY 6a) **and NEW step 11 — REMOVE inline cell editing.**
> **INLINE CELL EDITING IS REMOVED — OWNER DECIDED 2026-09-22:** *"lets simplify
> we will remove cell click edit feature from now on > work this first no more
> cell direct update. delete all related code."* / *"we use a edit modal or mouse
> drawer to update a mouse data."* The inline `sex` editor shipped (`b5a990b`)
> and got a reviewer **PASS** (data layer proven — `U5BFA`→`F5BFA`→`M5BFA`→
> `U5BFA`, no `mouseLabel` key, `SEED_COLONY` unmutated, no grid-cell control,
> check-types/lint 0; interaction layer explicitly **NOT VERIFIED**, no browser),
> but it is closed **SUPERSEDED, not shipped** — and the three interaction
> defects the reviewer found BY READING are the EVIDENCE BASE for the removal,
> not incidental bugs: a native `<select>` never blurs on pick so the edit sits
> uncommitted with no Save affordance; Escape closes the whole Sheet because
> Radix registers on `ownerDocument` with `capture: true`, ahead of React, making
> `editable-cell.tsx:115-116`'s "stop propagation" comment false; and
> pick-then-overlay-dismiss can SILENTLY LOSE the edit (Radix dismisses on
> `pointerdown`). KEPT through the removal (task 12 is their consumer): the
> drawer's live-lookup staleness fix (ruled ENTAILED by the AC, not scope creep —
> the click-time snapshot renders `U5BFA` after the edit and fails the AC) and
> the store-direct `updateMouse` wiring. The earlier "the control goes in the
> mouse-detail drawer" ruling was SUPERSEDED when the owner reopened the surface
> as "edit modal **or** mouse drawer" — and the ARCHITECT HAS NOW RULED it back
> to the DRAWER (2026-09-22, see 12 below).
> **NEW 11** (`[~]`, developer dispatched) deletes `components/ui/editable-cell.tsx`
> + its three consumers (grid genotype + dob, drawer sex); the cells go read-only
> with no dead double-click affordance; nothing else changes. An `x_` rename is
> NOT a soft delete here (both tsconfigs `exclude: ["**/x_*"]`), so the file goes
> as an ordinary reviewable diff, recoverable from git. **NEW 12** (`[ ]`,
> BLOCKED-BY 11, SEQUENCED AFTER 10) is the replacement edit surface — **DESIGN
> RULED 2026-09-22:** the surface is the **DRAWER** (`MouseDetailDrawer` exists,
> is store-driven, already carries the live-lookup fix a modal would re-solve);
> the shape is an **EDIT MODE on the Identity section** — pencil toggle, LOCAL
> draft, Save/Cancel, ONE atomic `updateMouse(metaId, patch)` on Save, NOT
> per-field live commit (the composed label must be visible before it is
> committed); the phase is **P0.7-b** (9a killed label-as-input, 9b killed
> label-as-storage, "edit the parts" is the closing move; no P0.8 deliverable is
> a field-edit surface). EDITABLE: `sex`, `genotype`, `dob`. READ-ONLY, each with
> its reason shown: `pupNumber` (birth number, immutable — typo correction OPEN
> for the owner), `litterCode` (membership, not text — re-parenting is a separate
> flow), `pupOffsets` ("assigned on transfer"; P0.8's transfer flow is the only
> writer), punches (read-only projection → step 10's section, no second
> add/remove UI), `.N` (derived from done/verified Tissue-collection cases). The
> live result composes through `composeMouseLabel(buildMouseLabel(...))` — never
> a template string, never a second builder; ACs are DATA-FLOW DIRECTION (labels
> flow OUT to render, never IN to a mutation) plus the 603 probe (`U5BFA`→`F5BFA`
> in drawer AND grid, no label write). Owner's requirement, verbatim: *"for mouse
> label we will show all part by part so we can edit each"* — the closure of 9a
> (no free-text label, no sex back-inference) and 9b (no stored label); 12 must
> not reintroduce either. **The window between 11 and 12, in which NO mouse field
> is editable in the app, is DELIBERATE (owner chose removal first and REAFFIRMED
> it 2026-09-22 — no stopgap control) — not a regression, and SETTLED.**
> Still open: 6a (blocks 6), 7 (BLOCKED-BY 6), 10 (BLOCKED-BY 6a + 7 +
> Q43-narrow), **NEW 11 `[~]` / 12 `[ ]` (inline-edit removal + replacement
> surface — see the paragraph above)**, **NEW 8d — the `untagged` punch location
> (owner DECIDED the value AND the default 2026-09-22): migration `0028`
> re-ADDs the `punch_location` CHECK as `('toe','ear','other','untagged')` after
> VERIFYING the constraint name in `pg_constraint`, `PunchLocation` gains the
> fourth value, `MouseSpec` gains `initialPunchLocation` (riding `mouse?` exactly
> as `punchEffectiveAt` does — no mutation signature changes) with the
> AddMouseDialog select DEFAULTING to `untagged`, the `'toe'` literal leaves
> `buildMouseCell`, and 1-2 `untagged` fixture mice give the value seed coverage
> (this moves the seed `maxPunchId` off 22 — step 7 asserts the EQUALITY, not the
> literal). `untagged` renders nothing, same as `toe`; `mouseIdentity.ts`
> unchanged. SEQUENCED AFTER 6a and 6. STILL OPEN: the zero-active-punches
> FLOOR**, and NEW **9e —
> DELETE the dead code (owner decided 2026-09-22)**: `nextLitterCode` (zero
> consumers, re-grepped; the live path is counter-based on purpose),
> `apis/getMouseDetail.mock.api.ts` (zero importers) and the `MouseDetail` /
> `GeneCall` / `HistoryEvent` types that die with it — explicitly NOT a 9c-style
> knowledge move, since `GeneCall`'s baked `"f/+"` allele is the old genotype
> model P1 abolishes; sequenced AFTER 6a and step 6 (shared `packages/types`).
> **`untagged` PUNCH LOCATION — OWNER DECIDED 2026-09-22: ADOPT IT** (*"add this
> type into enum for punchs table"*), overruling the architect's earlier
> recommendation against it; **the design landed 2026-09-22 as task 8d above,
> and the creation default is now `untagged`, not `toe`.** Still
> OPEN (recorded, not designed): the ZERO-ACTIVE-PUNCHES
> question (floor vs no floor) — adopting `untagged` did not pick a branch.
> Three collisions recorded on step 10:
> `punch_location` is a CLOSED CHECK in `0026` (a fourth value is a migration),
> **plan §5 Q42 is open and asks exactly whether that CHECK is closed**, and it
> may contradict shipped task 8c, which mints `location: 'toe'` at creation.
> 8c is NOT marked defective. Recorded,
> not actioned: `NewTaskDialog.client.tsx` imports `SEED_COLONY` instead of reading
> the live store (`:5`, consumed at `:35` + `:42`; the only UI file doing so) —
> mock module feeding a real UI list, MVP-ladder L3, pre-existing —
> OPEN, architect. A FIFTH AC defect is recorded in the phase file's PATTERN block
> (9d's bare-identifier grep, unmeetable as written, AC restated as "no
> `mouseLabel:` key declaration"), together with a ruling that the three stale
> references `afa8c43` fixed are a DRIFT class (correct-then-stale), not a sixth
> PATTERN instance (wrong-at-writing). Base P0-b: litter-code
> generator, pup-ID generator, parents parser, `task_offset_rule` + auto tasks,
> Record-Litter tx, surface cols I–N.
> **SPLIT DEFERRED (main session, 2026-09-22):** `docs/phases/p0.7.tasks.md` is
> ~1140 lines, past docs.md §1's 400 hard line, but a further split WAITS until
> P0.7-b closes — splitting mid-flight moves files under in-progress tasks and §2
> forbids archiving while the set has open work.
> <!-- DETAIL: active, read on demand -->
> Detail: [docs/phases/p0.7.tasks.md](./docs/phases/p0.7.tasks.md)

### P0.8 Visual cage management — P0-c (MVP v0.3) — TODO (5 [ ])

> Location-layout cage view, transfers table, pending-transfer
> initiate/commit/cancel service, pending-transfer visualization, drag-and-drop
> move (Q16/Q17 open). <!-- DETAIL: active, read on demand -->
> Detail: [docs/phases/p0.8.tasks.md](./docs/phases/p0.8.tasks.md)

### P0.9 Task model v2 — cases + child tasks — IN PROGRESS (Wave 1: 2 [~] · Wave 2: 5 [ ] · Wave 3: 3 [~])

> Lifecycle todo→doing→done→verified (cancelled side-exit); `cases` identity +
> immutable child `tasks` status records (plan §4). Wave 1 (migration 0021 +
> `@repo/types` Case/Task/isOverdue) in progress; Wave 2 (server tx + two SOP
> TaskGenerators + runner + client lifecycle UI) not started; Wave 3 (batch case
> 1:N via `case_mice` 0024, grid quick-create v1, `.N` re-clip derived label) in
> progress. `.N` vs toe-punch double-representation parked on Q43.
> <!-- DETAIL: active, read on demand -->
> Detail: [docs/phases/p0.9.tasks.md](./docs/phases/p0.9.tasks.md)

## P1 — Beta

- [ ] In-app changelog engine: version history + diff over import_batches +
      audit_logs + `mice` version rows (NOT excel-vs-excel file
      diffing) by natural key → diff(added/changed/removed, field, old, new).
      AC: two known workbook import batches produce the exact expected diff set.
- [ ] Per-version changelog UI (who/what/when) + human confirmation of tombstone
      candidates (sac/move).
      AC: removed-row tombstones require explicit confirm before final.
- [ ] snapshots table — MUTABLE (`deleted_at`): version_no INT UNIQUE (monotonic
      v0,v1…), label, state JSONB (materialized dashboard payload),
      state_schema_ver INT, high-water marks last_audit_log_id /
      last_mouse_move_id / last_mouse_attr_log_id (added 2026-09-04) /
      last_import_batch_id, published_by FK users, published_at. Substrate for
      the changelog engine — NOT a second change log (audit_logs + `mice`/`mates`/
      `tasks` version rows + import_batches remain THE change log). Optional
      pull-forward to P0-b (plan Open Question 14).
      AC: duplicate version_no rejected; high-water-mark columns FK/reference
      valid max ids of the four append-only sources at publish time.
- [ ] Publish transaction (service): read live dashboard payload → max(id) of
      each append high-water source (audit_logs, `mice`, `mates`, `tasks`,
      import_batches) → INSERT snapshots(version_no=last+1,
      state, marks) → INSERT audit_logs(action='publish_snapshot'). Boundary =
      professor explicitly publishes (weekend loop, plan Open Question 14).
      AC: one publish = exactly one snapshot row + one audit row, atomically;
      version_no increments by exactly 1 per publish.
- [ ] View-at-version: version picker list + single-row read
      (`SELECT state FROM snapshots WHERE version_no=$1`) — serve the JSONB, NO
      log-folding on read; live dashboard stays the existing P0-a query.
      AC: viewing any published version issues exactly one snapshot-row query;
      the API response body for that version equals the stored snapshots.state
      JSONB byte-for-byte.
- [ ] Version→version step-by-step replay (added 2026-09-04): fold the
      audit_logs / `mice`+`mates`+`tasks` version rows / import_batches between two
      snapshots' high-water marks into an ordered, steppable diff — extends
      the changelog engine above.
      AC: replay between v(n) and v(n+1) lists every log entry between the two
      mark sets exactly once, in (created_at, PK) order, and the entry count
      equals the sum of the four high-water-mark deltas. (State reconstruction
      from logs is explicitly NOT claimed — plan §4 defers fold-on-read.)
- [ ] Pedigree/generation tree (added 2026-09-04): family tree over
      litters.mother_mouse_id/father_mouse_id + mice.litter_id — depends on
      the P0-b parents parser.
      AC: for a seeded 3-generation family, the tree renders exactly the
      parent→litter→pup edges present in DB; mice with no litter render as
      roots; no cycle crashes the view (cycle → explicit error state).
- [ ] Scheduling offset refinement: professor-confirmed task_offset_rules values
      replace placeholders.
      AC: every task_offset_rules row has confirmed_by/confirmed_at set; fixture
      events yield the professor-confirmed offsets.
- [ ] Normalize Experimental sheet (982 rows, parallel entity, import only).
      AC: 0 silently dropped rows; rejects in import_error.
- [ ] Normalize New litters sheet (21 rows, feeds Breeders, import only).
      AC: litters link to Breeders mice by natural key; rejects in import_error.

### P1 Genotyping subsystem — PROMOTED from DEFERRED 2026-09-04 — TODO (8 [ ])

> Genotyping tables (markers/line_marker_panels/genotyping_runs/genotyping_results),
> genotype tokenizer, GENOTYPING sheet normalization, view+edit UI, role-gated
> testing ticket, per-marker result entry, genotype_label writeback (R6),
> add-marker endpoint (R5). Request lifecycle rides `cases` (plan §4 Task model
> v2); RESULTS stay in genotyping_results. <!-- DETAIL: active, read on demand -->
> Detail: [docs/phases/p1.genotyping.tasks.md](./docs/phases/p1.genotyping.tasks.md)

## P2 — NOT MVP

- [ ] Offline-first PWA (command/outbox queue) — P2, design-stage. Ratified
      2026-09-12 (plan §3, Q7 RESOLVED): offline-first render from an IndexedDB
      snapshot (keep the getColonyGrid mock→real seam) + Service-Worker shell +
      IndexedDB outbox with optimistic apply + Background-Sync flush; conflict via
      `prev_id` CAS. DO NOT build now — a later SWAP after the online path. Open:
      Q36 (outbox reuse `audit_logs` vs dedicated), Q37 (server-replay vs CRDT),
      Q38 (sync library). Not broken into detailed tasks yet.
- [ ] Clerk auth: user mapping via clerk_user_id; roles admin / professor
      (read+write+verify) / staff (read+write-status). Identity resolution only
      — the role-gated transition matrix is already service-enforced from P0-a.
- [ ] RLS policies enforcing the role matrix at DB level (hardens the same
      canTransition matrix).
- [ ] Revisit ETL placement: promote import helper to queued worker if needed.
- [ ] xlsx export helper — see DEFERRED below (ordering: P2 or a dedicated
      later phase, per plan §3).

## DEFERRED (post-MVP — moved here in the 2026-09-04 re-scope, NOT deleted)

Superseded-for-MVP tasks preserved verbatim-in-substance for when the
export/color phase is scheduled. NOTE 2026-09-04: the genotyping-named tasks
that lived here were PROMOTED to P1 (see "P1 Genotyping subsystem" above — a
MOVE, nothing dropped); the items below are decoupled from it and stay
deferred:

- [ ] Colour mapper: font RGB → `signals.type` (R16 made signals a TABLE with its
      own colour column); fill theme+tint → color_maps
      lookup; unmapped combo → flag_for_review, never ignore.
      AC: known font colors (black/FF0000/FF0432FF) map; any unmapped fill returns
      flag_for_review, never a default enum.
- [ ] Color-map calibration pass WITH professor: populate color_maps (scope
      font/fill, argb/theme+tint → target_enum); confirm gray dead/sac semantics.
      AC: color_maps covers 100% of fills present in the real workbook OR
      remaining combos have flag_for_review rows; sign-off noted in status log.
- [ ] xlsx export helper: faithful export of Breeders + Genotyping from DB, up to
      full-format parity (colors, layout, legend rows).
      AC: export → re-import of the exported file yields zero domain diffs;
      professor accepts exported file format.
- [ ] Lifecycle tables: lifecycle_events (+ sample_type / lifecycle_event enums).
      NOTE (R11-R15, 2026-09-05): breeding is NO LONGER deferred and `matings`
      no longer exists — it shipped, then split into `mates` (the couple) and
      `litters` (each cycle, carrying its own dates and outcome). Only
      `lifecycle_events` (+ its enums) stays deferred here.
      AC: lifecycle_events.event uses the lifecycle_event enum; FKs to
      mouse_meta/cages (mouse_meta, not mice — `mice` holds version rows).
