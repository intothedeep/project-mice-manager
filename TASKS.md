# TASKS — Lopez-Juarez Mouse-Colony Automation

> Completed items live in `_archive/` (cold storage — do not read unless
> investigating history). Active per-sub-phase detail lives in `docs/phases/`
> (read ON DEMAND when a stub below is insufficient; the stub is the truth).
> This doc holds the index + cross-cutting content + planned work only.

Task legend: `[ ]` TODO · `[~]` IN PROGRESS · `[x]` DONE.
Each task lists AC = deterministic acceptance criteria.
> Schema-evolution fold history (P0 re-scope + R1–R15) rolled off → _archive/tasks.schema-fold-preamble.md  <!-- ARCHIVE: history-only -->
> Current schema is authoritative in packages/db/SCHEMA.md, NOT restated here — but see the CORRECTION of 2026-09-23 (owner: "no db yet"): there is NO database, SCHEMA.md stops at `0027`, and its "generated from the live colony_dev" banner is false. The MIGRATIONS (`packages/db/migrations/0001`–`0030`) are the contract; SCHEMA.md is a fossil of a DB that no longer exists. Detail: docs/phases/p0.7-c.tasks.md.

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
> **CURRENT SCHEMA IS NOT DESCRIBED IN THIS DOC.** The contract is
> [packages/db/migrations/](./packages/db/migrations/) (`0001`–`0030`).
> [SCHEMA.md](./packages/db/SCHEMA.md) and [ERD.core.png](./packages/db/ERD.core.png)
> are SNAPSHOTS produced by `packages/db/scripts/{schema-doc,erd}.sh`, and as of
> 2026-09-23 they are stale: there is no database (owner: "no db yet"), and the
> snapshot stops at `0027`. Regenerate them once a database exists; until then
> read the migrations. Do not restate structure here — restating it is what
> produced the drift this stub replaces, and this paragraph itself drifted the
> same way: it claimed a "live database" for months after there was none.

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

### P0.7 Litter recording + auto tasks — P0-b (MVP v0.2) — IN PROGRESS (add-mouse v1 [x] archived · **P0.7-b DONE [x] — all 23 tasks closed and ARCHIVED 2026-09-23** · **P0.7-c genotype-as-gene-rows: 3 [x] shipped, 2 [ ] open, split to `docs/phases/p0.7-c.tasks.md`** · open: 6 base tasks [ ] + BACKLOG path-copy `moveMouse` [ ] + `SEED_COLONY` note [ ])

> Add-mouse v1 SHIPPED mock-era (archived). **P0.7-b is DONE and ARCHIVED
> 2026-09-23:** all 23 implementation tasks (1, 2, 3, 4, 5, 6, 6a, 7, 8, 8b, 8c,
> 8d, 8e, 8f, 8g, 8h, 9a, 9b, 9c, 9d, 9e, 11, 13) closed with a landing hash and
> a reviewer PASS, plus the superseded-not-shipped inline `sex` editor and the
> 10/12 merge notes. Shipped: migrations `0026`/`0028`, the `punches`
> single-source store with its dev-gated `punchId` uniqueness guard, the four add
> mutations, the always-minted never-removed `untagged` punch, the read-time
> label projection (no stored label anywhere), and the mouse-editing drawer.
> Deploy verdict 2026-09-22 (architect + reviewer): nothing found blocks MVP1.
> STILL OPEN in `docs/phases/p0.7.tasks.md`: the six base P0-b tasks (litter-code
> generator, pup-ID generator, parents parser, `task_offset_rule` + auto tasks,
> Record-Litter tx, surface cols I–N), the BACKLOG path-copy `moveMouse` (no
> date), the `NewTaskDialog`/`SEED_COLONY` note (architect's), the
> `x_`-inert-inside-`packages/` note (owner's), and the AC-defect PATTERN block,
> which stays LIVE because it is guidance for writing future ACs.
> <!-- ARCHIVE: history-only -->
> Archived detail: [_archive/tasks.p0.7-b.md](./_archive/tasks.p0.7-b.md)
>
> **P0.7-c — genotype as GENE ROWS (opened 2026-09-23).** SHIPPED [x]:
> `MouseCell.genotype` (stored composed string, same defect as the deleted
> `mouseLabel`) → `genes: GeneRef[]` composed at read by `lib/genotype.ts`,
> with migration `0029` adding NULLABLE `mice_genes.allele_pat`/`allele_mat`
> (`ca216c2`); and `parseLitterCode` accepting `WT`, a real litter code on 10 of
> the 22 seed mice that the regex rejected, breaking the Add-mouse dropdown and
> the validation gate (`3932157`). Both carry a hash but NO reviewer PASS line —
> none was supplied — and their "22 mice, 0 mismatches" equality is
> commit-reported for `3932157` but INDEPENDENTLY RE-DERIVED for `ca216c2`,
> which has a reviewer **PASS** (`mice=22 genotype mismatches=0`, gates forced
> uncached). ALSO SHIPPED `[x]` (`11d0322`, developer evidence, no independent
> reviewer pass): `genes.sort_key` + migration `0030_gene_sort_key.sql` —
> `mice_genes.order_index` DROPPED, `mice_genes_order_key` replaced by
> `mice_genes_mouse_gene_key (mouse_id, gene_id) WHERE deleted_at IS NULL`,
> `GENE_CODES` now DERIVED from the catalogue, and **the allele order corrected
> to MATERNAL-FIRST — owner ruled 2026-09-23 that the 2026-09-17 decision
> stands and `0029` had inverted it** (fixed in place; fixture rows swapped,
> not reordered, so only the meaning changed). OPEN [ ], both re-aimed as
> BEFORE-THE-FIRST-`createdb` prerequisites: `scenarios/flow-weekly-cycle.sql`
> is a trap for whoever builds the schema first (INSERTs the dropped
> `order_index`, aggregates by it, seeds the `'Nf1 f/+'` row `0030` rejects),
> with the same dead contract in `scenarios/README.md` + `p0.4.tasks.md:19`;
> and nothing seeds `genes`, so the `sort_key` values live only in the mock.
> MEMO, NOT A TASK — owner ruled 2026-09-23
> (*"whats the problem? leave a memo."*): `InGridParentCell.genotypeColor` is
> still a stored copy while the genotype string on that same cell composes at
> read, so a parent sub-cell keeps its old tint behind new text (mock-era only,
> value-correct). **THERE IS NO DATABASE — owner 2026-09-23, *"no db yet"*:**
> migrations `0001`–`0030` are paper contracts, nothing is "unapplied", and
> `packages/db/SCHEMA.md` is a FOSSIL that stops at `0027` while its banner
> still claims it was generated from a live `colony_dev` — recorded as a
> finding, NOT edited (owner deciding). STILL OPEN: `plan §5 Q49`, whether the
> gene pickers should follow `sort_key` too. Detail (split out the day it opened, docs.md §1):
> [docs/phases/p0.7-c.tasks.md](./docs/phases/p0.7-c.tasks.md)
> <!-- DETAIL: active, read on demand -->
> Detail: [docs/phases/p0.7.tasks.md](./docs/phases/p0.7.tasks.md)

> **The pre-archive stub text that stood here is preserved VERBATIM in
> `_archive/tasks.p0.7-b.md` under "TASKS.md P0.7 stub as it stood before the
> archive (2026-09-23)". Nothing was deleted; the stub above carries STATE, per
> `rules/docs.md` §1.** <!-- ARCHIVE: history-only -->

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
> progress. `.N` vs toe-punch double-representation is NOT a thing — Q43 RESOLVED 2026-09-22
> (owner): a Tissue-collection case does not mint a `toe` punch row, so the two
> describe different events.
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
