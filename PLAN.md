# PLAN — Lopez-Juarez Mouse-Colony Automation

> Completed items live in `_archive/` (cold storage — do not read unless
> investigating history). Active per-sub-phase detail lives in `docs/phases/`
> (read ON DEMAND when a stub below is insufficient; the stub is the truth).
> This doc holds the index + cross-cutting content + planned work only.

## 1. Product intent

Dr. Lopez-Juarez spends **5–10 hrs/week** hand-versioning Excel files that track his
mouse colony (Colony → mouse line → cages → slots → mice). Rhythm today:

- **Weekday:** lab staff read the latest generated Excel, do the work, produce a new
  versioned Excel by hand.
- **Weekend:** the professor closes tasks, checks notes, generates the next version.

We replace the manual versioning with a web app (PWA later) backed by a normalized
Postgres — **step-by-step, not big-bang**. Re-scoped 2026-09-04 per
`_assets/gpt_01.txt`: validate workflow value with a very small MVP first. Excel is
now the **one-way initial import source only — NO xlsx export in MVP**; the app's
task/handoff views replace the generated Excel as the working surface (Open
Question 9). The **import-error report remains a first-class P0 deliverable**.

Core needs:

1. **Ticket/task bin** — professor drops tasks → staff mark done → professor verifies
   (ticket lifecycle: open → done → verified / cancelled).
   <!-- lifecycle EXTENDED 2026-09-13 (user): todo → doing → done → verified,
   cancelled = side-exit — see §4 Task model v2. -->
2. **Append-only audit log** — who/what/when on EVERY interaction.
   <!-- APPEND-ONLY EVERYWHERE (user, 2026-09-14): EVERY update appends a NEW
   record row, never edits a record in place. So the append/version rows ARE
   the change-tracking audit — NO separate `audit_logs` write is needed for
   change tracking (the table stays only as an optional cross-table who-did-what
   substrate). Case status is already this (each transition = an appended
   immutable `tasks` row); `cases.current_status` is a DERIVED cache of those
   appends, not an exception. ~~When other case fields (due_date/assignee) become
   editable, they follow the SAME append pattern — never in-place.~~
   SUPERSEDED 2026-09-14 (user): case FIELD edits are IN-PLACE UPDATEs guarded by a
   `version` column (optimistic lock — read version, then UPDATE cases SET …,
   version = version+1 WHERE id=? AND version=:read; 0 rows => concurrent edit =>
   conflict, client re-reads). NOT append-only version rows: this keeps `cases` a
   STABLE identity so gen_key's partial-UNIQUE stays on the immutable row (no R10
   return). STATUS changes STILL append (the immutable `tasks` log). Migration 0025. -->


### Success metrics (workflow-based, not technical — gpt_01)

- Task lookup: 10 min → 30 s.
- Manual mouse search: 20 min → instant filter.
- Professor's weekly manual work: ~10 h → ≤7 h.
- Instrumented via `audit_log`, `mice` version rows and `import_batch` timestamps.

Domain semantics carried from the real workbook (meeting_02):

- Cell font color encodes state: **black = done, red = instruction, blue = plan/note**.
- **Gray fill = sac → dead**; yellow = attention/flag.
- Mouse ID grammar (rev. 2026-09-22, R3):
  `[M|F]<number><litter-code><tag-suffix><.N?>` — sex prefix, pup number,
  litter code (3 letters today, grows to up to 5 via rollover), tag suffix =
  **one `e` per ACTIVE `ear` punch row** (two ears → `ee`, §5 Q41); `toe`
  renders NOTHING, and so does `untagged` (the fourth `punch_location` value,
  decided 2026-09-22, lands with P0.7-b task 8d); optional `.N` = count of
  done/verified Tissue-collection cases (derived, never stored — see §5 Q43).
- **Pup-number `+offset` renumber (POLICY, user 2026-09-15 — RESOLVES Open
  Question 2; the old "`+` encodes multiple mice" reading was WRONG).** A `+`
  in the pup-number position (`F3+10MBC`) is ONE mouse, not many. When a mouse
  (`F3MBC`) is moved into a cage that ALREADY holds a mouse with the same
  pup_number (3), its number is bumped by an offset (+10) to avoid the
  in-cage collision → effective pup_number = 3+10 = 13. The label PRESERVES the
  `3+10` expression (not the collapsed `13`) so the renumber's provenance is
  traceable — they could just write `13`, they write `3+10` on purpose.
  Offsets ACCUMULATE across repeated transfers (`1+10`, then on a later
  transfer `1+10+20`, …) — effective pup_number = base + the SUM of the
  offset chain. Grammar: pup-number may be `<n>` or `<n>(+<offset>)+`; the
  `+` lives in the PUP NUMBER only — never in the litter code (the
  litter-code generator still NEVER emits `+`).
- Notes often embed YYMMDD dates (`260831 wean, Breed.`); red notes = instructions
  expecting a reply; blue = plans.
- Professor's weekend loop: check mouse/cage/breeding state → pick mice → decide
  moves → compute weaning/genotyping/experiment schedules → instruct staff.
- **Excel-familiar dashboard (P0-a, added 2026-09-04):** the shared status
  dashboard must offer a view that LOOKS like the current Excel sheet
  (Breeders/Genotyping grid layout), rendering normalized enums back as the
  color cues above (black=done, red=instruction, blue=plan, gray=sac/dead,
  yellow=flag) so lab members grasp it instantly. Internal data stays
  normalized (enums); this view renders enums→colors. Excel remains
  import-only — this on-screen grid is the substitute.

## 2. Architecture decisions — split out (2026-09-22)

> Current state: STABLE reference, not a task list. Stack + monorepo layout +
> raw-SQL/no-ORM + FKs-always-enforced + local-Postgres-first are DECIDED and
> shipped; the identity-colour channels are SHIPPED in the client but the
> `color_palette` / `color_assignments` / `rule_legend` tables are still
> DESIGN-STAGE (not in `packages/db/SCHEMA.md` — the mock seeds hex directly).
> Open inside §2: Q33 (slot adult capacity) and Q34 (per-slot vs per-cage).
> Testing stays SUSPENDED (user directive 2026-09-04).
> Section number and bullet order are PRESERVED in the split file, so
> citations of the form `plan §2` still resolve.
> Detail: [docs/phases/architecture.plan.md](./docs/phases/architecture.plan.md)

## 3. Roadmap

### P0 — Prototype (LOCAL ONLY) — ACTIVE

Runs fully local against local PostgreSQL. gpt_01's v0.1/v0.2/v0.3 map to
sub-milestones **P0-a / P0-b / P0-c** (scope fixed per sub-milestone).

**POLICY — MVP IS MOCK-ONLY (user, 2026-09-17).** The MVP ships on **mock data +
mock APIs**. No server, no real persistence. **Server + persistence = Phase 2.**
This RESOLVES the contradiction between this section (which listed server
endpoints under P0-a) and the standing "MVP = mock+UI workflow fidelity"
directive — the directive wins. Consequence: `TASKS` **P0.6's server-side
items are NOT on the MVP path** (endpoints, MOVE transaction, repositories,
`appendVersion`, audit writes); its mock-UI work IS. Same for P0.3/P0.4 (parsers
+ ETL) — they exist to feed a database. What MVP must prove is the WORKFLOW in
the UI, against mock stores. Do not schedule server work as MVP-blocking.

**P0-a (MVP v0.1) deliverables:**

1. One-way xlsx import — **Breeders sheet only normalized** — with
   **import-error report** (never silently drop a row); ALL 9 sheets archived
   losslessly into `raw_sheet_row`.
2. Mouse + cage records; **Dashboard** (counts + upcoming tasks); **Excel-familiar
   grid view** (Breeders-style layout, enums rendered as the workbook color
   cues — see §1); **Cage-grid view** (select mouse → detail, incl.
   **history-from-logs timeline**: audit_log + `mice`/`mates`/`tasks` version rows
   WHERE entity=mouse); **search/filter**. Live dashboard is **shareable as-is**
   (existing read path — nothing new to build).
3. **Move mouse** between cages + append move history (a new `mice` version row
   per move — R16 retired the separate `mouse_move` table).
4. Ticket/task bin (open → done → verified/cancelled) + **upcoming-task view**,
   doubling as the read-only staff-handoff view (Open Question 9). Transitions
   are **role-gated NOW** via pure `canTransition(role, from, to)`
   (@repo/domain) enforced at the service layer against `users.role` (stub
   identity, real role field) and recorded in append-only
   `tasks` version rows; Clerk (P2) only swaps identity resolution.
   <!-- lifecycle + storage UPDATED 2026-09-13 (user): todo → doing → done →
   verified (cancelled side-exit), recorded as append-only `task_events` rows
   under `cases` (task_events since RENAMED to child `tasks` — §4 Task model
   v2 REFINED 2026-09-13; UI stays task-centric). -->
5. Append-only audit log, user-aware via a STUB default user (no real auth).
6. Mock/seed data generator (anonymized, derived from real xlsx).

**P0-b (MVP v0.2):** Record Litter → auto litter-ID generation → create pup mouse
records → auto future-task dates (config-table offsets, nothing hardcoded).
"Add mouse" IS this milestone (DECIDED 2026-09-14, user), not a new phase:
EVERY mouse belongs to a litter (`mouse_meta.litter_id NOT NULL`) — a
manual/outside mouse = an `is_from_outside=true` 1-pup litter shell, so there
is ONE code path and no litter-less add. Semantics: a mouse = `mouse_meta`
(immutable identity/birth: litter_id, litter_code, pup_number, dob) + `mice`
(append-only version rows carrying the MUTABLE state — sex, cage_id/slot_id,
line_id, is_alive; creation row `prev_id=NULL` + `idempotency_key`; `mice` has
NO origin_id column, unlike mates/tasks/notes) + `mice_genes` (genotype).
`renderedId = head.sex + pup_number + litter_code` is composed at READ, never
stored (sexing U→M changes the label, metaId stays stable); genotype renders
`'?'` at zero mice_genes rows.
- **v1 (SHIPPED mock-era 2026-09-16) = SINGLE user-created add**: a new
  subscribable colony store (`lib/mockColonyStore.ts`, mirrors `mockStore.ts`
  useSyncExternalStore — the grid migrates off its static const so adds appear
  immediately) + `addMouse` + AddMouseDialog (sex default 'U', litterCode +
  pupNumber, dob, line, genotype optional → '?', cage + slot). NEW slot-label
  creation is ALLOWED (user 2026-09-14) with a GLOBAL uniqueness dedupe
  (slots.label is globally unique) — or pick an existing slot / leave
  unplaced. The full mouse_meta+mice+litter write tx is the SERVER-era swap;
  DTOs unchanged. See TASKS P0.7. Shipped with extensions (2026-09-16):
  litter-code auto-gen (`lib/litterCode.ts` + store counter), searchable
  combobox for litter/cage/slot (inline-create w/ global dedupe), inline cell
  edit (`updateMouse`/`EditableCell` + Sac), selection-tail `[+]` incl.
  `AddLineDialog`, store split (pure `lib/colonyMutations.ts`). Detail:
  TASKS P0.7 stub → `_archive/tasks.p0.7-add-mouse-v1.md`.
- **v1.1 — add-flow split into FOUR mutations (AGREED 2026-09-16, user; NOT
  built — TASKS P0.7-b step 8).** Replaces today's `addMouse` + `addLine`
  in `lib/colonyMutations.ts`:
  `addLine(lineName, cageNumber, slotLabel, mouse?)` → line+cage+slot(+mouse);
  `addCage(lineId, cageNumber, slotLabel, mouse?)` → cage+slot(+mouse);
  `addSlot(cageId, slotLabel, mouse?)` → slot(+mouse);
  `addMouse(cageId, slotId, mouse)` → mouse. Each creates what its name says
  and fills required descendants DOWN TO SLOT; mouse optional except in
  `addMouse`. INVARIANTS: line ≥ 1 cage; cage ≥ 1 slot; slot MAY be empty
  (owner-confirmed). Today's code violates the first (`addLine` makes
  `cages: []`, `colonyMutations.ts:300`) and cannot satisfy the third (new
  slots always get `mice: [mouse]`, `:167`; no `mice: []` anywhere).
  `AddMouseInput.newCageNumber`/`newSlotLabel` are REMOVED — they existed only
  because addCage/addSlot were missing. Each mutation wires to its own grid
  `[+]` rail (line/cage/slot/mouse — `TailPlus`, shipped v1); no branching at
  the call site. Owner-confirmed facts: **cage:slot is 1:N** (the sampled
  workbook's 1:1 was coincidence); **cage number SUGGESTED as `max+1`, but
  editable**; **NO Excel parallel operation — the app REPLACES the
  spreadsheet** (seed `2482`/`BIZ` once, then the app owns the counters; no
  counter-drift policy, no header-sync path — §5 Q10/Q12 UPDATED).
- **v2** = batch "Record pups" off a delivered mate (pup_number 1..N, sex 'U')
  + auto follow-up tasks (`task_offset_rules`: wean/tissue dates) + wean-flow
  update (sex/slot/genotype as append version rows).
- **v3** = pedigree (litter→mate→pups already linked) + case↔data linkage
  (Birth/delivery case → prefill Record-litter).

**P0-c (MVP v0.3):** visual cage management + drag-and-drop moves + **pending
transfers** (initiate → commit/cancel; mouse stays at origin until commit;
origin "transfer tag" + dimmed destination chip). R16/R22 REPLACED the planned
`transfer` table and `mouse_move`: the flow is now `mice.transit_status`
(`waiting` → `issued` → `moved` → `verified`), one new `mice` version row per
step, so a pending transfer is just a row that has not reached `verified` yet.

(OLD P0 "Breeders + Genotyping edit UIs" and "Excel round-trip / export" are
SUPERSEDED — the genotyping subsystem now lands **P1** (promoted 2026-09-04);
xlsx export stays deferred, see P2 and TASKS DEFERRED section.)

**P0-a gate:** import of the real workbook produces 0 silently dropped rows (all
rejects in `import_error` with provenance); re-import of the identical file (same
sha256) is a no-op; rows absent in a newer file version → `deleted_at` tombstone;
all 66 real mouse-ID fixtures parse or route to the documented disposition
(dispositions amended for `unsexed_pup` — confirm before freeze); Dashboard,
cage view, search, move+history and task views run from local seed without the
live file; every mutation audit-logged.

### P1 — Beta

- **In-app changelog:** version history + diff built over `import_batch` +
  `audit_log` + `mice` version rows (NOT excel-vs-excel file
  diffing); human-confirm of tombstone candidates (sac/move).
- **Snapshot versioning:** `snapshot` table (materialized dashboard `state`
  JSONB + high-water marks over audit_log/`mice` version rows/
  import_batch) + publish transaction (professor-published version boundary,
  weekend loop) + view-at-version (single-row read, no log-folding). Substrate
  for the changelog engine above — NOT a second change log (audit_log +
  `mice`/`mates`/`tasks` version rows + import_batch remain THE change log). Optional
  pull-forward to P0-b if the professor wants MVP-time snapshots (Open
  Question 14).
- **Version→version step-by-step replay (added 2026-09-04):** fold the logs
  between two snapshots' high-water marks into an ordered, steppable diff —
  extends the changelog engine above.
- **Pedigree/generation tree (added 2026-09-04):** family tree from
  litter.mother/father + mouse.litter_id — needs the P0-b parents parser.
- **Genotyping subsystem (PROMOTED P2→P1, 2026-09-04):** role-gated testing
  ticket — director picks mouse + markers → staff fill discovered allele per
  marker incl. (-)/?/dnw across prep-stages (>p15 vs Pup) and dates → combined
  `genotype_label` writeback (R6, §4). Built ON ticket/role/
  marker/line_marker_panel/genotyping_run/
  genotyping_result. Includes GENOTYPING sheet normalization + genotype
  tokenizer (moved from DEFERRED — see TASKS P1).
- **Per-gene 2-allele genotype model (POLICY + design, user 2026-09-15; architect
  designed):** `genes.code` = bare gene + `genes.kind`; `mice_genes.allele_a/b`
  TEXT (nullable → backfill → NOT NULL `'?'`); canonical order `f < + < - < G < … < ?`;
  transgenes stored as 2 alleles; `GeneCall {code, alleleA, alleleB, display}`,
  flat `MouseCell.genotype` composed at read; Item 4 zygosity picker; three
  professor OQs (allele order, transgene token, full vocab).
  **PARTLY OVERTAKEN 2026-09-23 by P0.7-c (`ca216c2`, TASKS P0.7 stub):** the
  bare-`genes.code` half and the two allele columns SHIPPED as migration `0029`,
  and `MouseCell.genotype` is NOT a flat string any more — it is
  `genes: GeneRef[]` composed at read by `lib/genotype.ts`, so `GeneCall` never
  landed. **The MATERNAL-FIRST decision HELD**: `0029` shipped inverted, a
  reviewer caught it, the owner ruled 2026-09-23 that 09-17 stands, and
  `11d0322` corrected `0029` in place — columns are `allele_mat`/`allele_pat`
  (names shortened from `_maternal`/`_paternal`, order as decided). `0029`
  still ships no `genes.kind`. `11d0322` also landed `genes.sort_key` and
  DROPPED `mice_genes.order_index`. Still P1 and untouched: the zygosity picker,
  the NOT-NULL promotion, transgene display, and the vocab OQs.
  <!-- DETAIL: active, read on demand -->
  Detail: [docs/phases/p1.genotyping.plan.md](./docs/phases/p1.genotyping.plan.md)
- Scheduling offset refinement (professor-confirmed `task_offset_rule` values).
- Normalize **Experimental** + **New litters** sheets (import only).
- **Authorization (data-driven permissions) — schema lands P1, switchover P2 (added 2026-09-13, user):**
  replaces the hardcoded role logic (`taskFlow.ts` `ALLOWED` matrix + the
  `actor_role` CHECK-as-gate) with two additive tables: `authorizations`
  (catalog: `resource, action, from_status?, to_status?` — e.g. task/advance/→doing)
  + `user_authorizations` (N×M: principal→authorization). Principal = `users(id)`,
  which already covers BOTH people and groups (`users.type IN ('user','group')`,
  `0002`). **Correction vs. request:** there is NO self-referential `group_id`;
  membership is the existing `group_members(group_id,user_id)` N×M join — do NOT add
  a self-FK. Effective perms = principal's own live grants ∪ its group grants
  (union-of-allow, no deny; one-hop, no group nesting). `actor_role` on
  `cases`/`tasks` STAYS as immutable audit provenance (not the gate). Admin =
  hardcoded resolver bypass (mirrors `0022` system user). Seed the staff group with
  →todo/→doing/→done, professor with →todo/→doing/→done/→verified + case/create;
  REOPEN (→todo) and CANCEL are ADMIN-only (2026-09-14).
  Rollout: P1 = tables + idempotent seed (additive, no Clerk dep); P2 = `taskFlow.ts`
  + service read resolved grants instead of `ALLOWED` (Clerk-coupled), old matrix
  removed after parity. OPEN: (a) RESOLVED 2026-09-13, ~~REVISED~~ REVISED 2026-09-14 (user):
  ~~staff must NOT have `doing→done` — staff is todo/doing only~~ → staff DOES do
  `doing→done`: staff = todo→doing + doing→done; professor = + done→verified; REOPEN
  (→todo) and CANCEL are ADMIN-only (`taskFlow.ts` updated); (b) RESOLVED 2026-09-13 (user): use TARGET-ONLY grants
  (`from_status` NULL = any source) so staff may move a task INTO their allowed statuses
  from any state (keep working / update freely) — grants are expressed by `to_status` only,
  NOT from→to pairs; (c) per-`case_type` granularity = YAGNI for now. See Open Questions.

**P1 gate:** professor can review a per-version changelog instead of eyeballing two
Excel files.

### P2 — NOT MVP

- **Offline-first PWA via a command/outbox queue (RATIFIED 2026-09-12, user —
  "offline + command outbox queue" is the last-page plan; DO NOT build now, it
  is a later SWAP).** Two halves that are ONE mechanism:
  - **Every mutation → an append-only op-log / outbox, NOT overloaded onto
    `tasks`.** `tasks` stays a WORKFLOW concept (the professor's work items); DB
    CHANGE events go to an append-only operation log. A unified "activity feed"
    can UNION tasks + op-log at read (SRP — mixing done-tasks with
    already-applied mutations makes reads messy). Existing enabler: the immutable
    `audit_logs` table (append-only, `REVOKE UPDATE,DELETE`, carrying
    `entity`/`entity_id`/`before_json`/`after_json`/`request_id`) is a candidate
    to REUSE as the outbox — OPEN (Q36) whether the outbox reuses `audit_logs`
    or is a dedicated `outbox`/`ops` table.
  - **Offline-first render + sync (local-first):** render WITHOUT an HTTP request
    from a **local snapshot in IndexedDB** (stale-while-revalidate — draw local
    immediately, refresh from server when online). The current
    `apps/colony_client_web/apis/getColonyGrid.mock.api.ts` is already a
    snapshot-shaped fetcher, so the mock→real data-source SEAM is already
    positioned for this swap — KEEP that seam. A **Service Worker** pre-caches
    the app shell (JS/CSS) so the PWA loads offline. Offline edits append to the
    **outbox (IndexedDB)** + optimistic local apply; the **Background Sync API**
    flushes the outbox on reconnect. The outbox log = the op-log from the first
    half = the offline queue: one mechanism. **Conflict detection reuses the
    existing append-only `prev_id` CAS** (the `*_prev_cas_key` unique indexes on
    `mice`/`mates`/`tasks`/`notes`): a queued mutation carries the `prev_id` it
    saw; if the server head moved, it is a conflict → surface to the user.
    Server-authoritative replay is enough for one small lab; CRDT (automerge/Yjs)
    is YAGNI unless concurrent edits to the SAME record become common (Q37).
    Candidate stack: PWA (Service Worker) + IndexedDB (snapshot + outbox) +
    Background Sync; library TBD — Dexie (simple) vs a managed sync engine
    (PowerSync / ElectricSQL / Replicache), evaluated against our custom
    append-only schema (Q38). Cautions: auth-token expiry while offline; outbox
    ordering + idempotency; schema migration of offline snapshots; storage size
    (a ~6000-mouse snapshot is small — fine).
  - **Scope discipline:** land the ONLINE path first (P0/P1); offline is a later
    SWAP enabled by keeping the data-source seam above. Explicitly P2 /
    final-phase — do NOT build now.
- Clerk auth + roles (admin / professor = read+write+verify / staff =
  read+write-status) + RLS.
- **xlsx export helper** — lands here or a dedicated later phase (PM
  recommendation: dedicated phase after auth unless professor demand pulls it
  earlier). The genotyping subsystem that used to share this bullet was
  promoted to P1 on 2026-09-04; the color→enum mapper + calibration pass
  remain deferred, DECOUPLED from it (see TASKS DEFERRED).

**P2 gate:** staff can complete a weekday cycle offline and sync; role matrix
enforced at DB level.

## 4. Data/ETL scope decisions (from ml brief rev. 2026-09-04, verified against real file)

- Normalize P0-a: **Breeders only** (header row 2, data 3+, cols A:P 1–16 — never
  crawl max_col). Column map: B Mouse line→forward-fill (resolves to
  `mouse_line` entity / `mouse.line_id`, R2 below); D Cage#→cage.cage_number
  (forward-fill); E Slot→`slot.label` under the cage (forward-fill — R1 slot
  entity below); F MOUSE ID→tiered parser;
  G GENOTYPE→mouse.raw_genotype (PLAIN string — no tokenizing in MVP;
  genotype_parsed JSONB = plain fields, NOT normalized); H DOB→YYMMDD codec;
  O Plans/Notes→raw_notes; P Parents→raw_parents (parsed in P0-b). Cols I–N
  (mate/mating/PLUG/DELIV/tissue/genotyping-dates) → raw_sheet_row only,
  surfaced P0-b.
- **ALL 9 sheets archived losslessly** into raw_sheet_row. Dplct'd breed+exp
  (1504) = DERIVED, never source of truth. GENOTYPING + Experimental NOT
  normalized in MVP (Experimental import lands P1; GENOTYPING sheet
  normalization lands P1 with the promoted genotyping subsystem).
- Idempotency (rev. 2026-09-04, surrogate identity): `import_batch` keyed by
  file_sha256 (identical file = no-op); domain upsert by NATURAL KEY — mouse
  re-import key = **(litter_id, pup_number)** PARTIAL unique
  `WHERE deleted_at IS NULL` (matches the shipped `mouse_meta_litter_pup_key`,
  SCHEMA.md:301; SUPERSEDES the old
  rendered-label-alone key; import resolves the litter DIRECTLY by letter
  code via UNIQUE(litters.mouse_letter_id) → litter row (R9); line_id used for
  disambiguation only, NOT part of uniqueness; only unparseable rows are a
  real exception — they match by raw `raw_mouse_id`;
  `mouse_label` = rendered LABEL, non-unique — R2 below);
  cage = (cage_number). Rows absent
  in a new version → `deleted_at` tombstone, human-confirmed in P1 diff;
  label/sex/state diffs on a MATCHED mouse APPEND `mouse_attr_log` rows
  (actor = import user), never tombstone+reinsert (R7 below).
- Fill colors are theme+tint (not RGB) → `color_map` table KEPT in schema for
  provenance; the color→enum mapper and the calibration pass WITH the professor
  remain deferred post-MVP, DECOUPLED from the genotyping subsystem (which was
  promoted to P1 on 2026-09-04).
- Litter-ID generation (P0-b): litter_code = GLOBAL persistent counter —
  3 letters today, grows to up to 5 via rollover (generator emits
  `^[A-Z]{3,5}$`; parser accepts `^[A-Z]{1,5}$`); seed from max-in-file **BIY**
  (header O1 "BIZ" = professor's next); roll AZZ→BAA (ZZZ→AAAA CONFIRMED
  2026-09-04, Q20 resolved — length-first ordering, ORDER BY
  length(mouse_letter_id), mouse_letter_id COLLATE "C", orders it without any
  persisted column — R9).
  Newborn pups are BARE no-sex forms (1BIZ, 2BIZ…) → parser
  gains a **`unsexed_pup` disposition (non-warn)**, which alters some of the 66
  fixture dispositions (confirm before freeze). The litter-code generator
  never emits an offset — offsets are assigned only on transfer (§1 POLICY);
  round-trip AC: parse(generate(x)) == x. Pup numbers operator-entered
  (Open Question 11).
- Auto future-task offsets (P0-b): `task_offset_rule` config table (event,
  offset_days, confirmed_by, confirmed_at) — NOTHING hardcoded. Placeholder
  defaults ALL TBD-with-professor: weaning DOB+21d; genotyping/tissue DOB+~12–15d
  (observed rows 22:+15, 27:+12). Generated tasks land in the task bin as open.
- Move rules (P0-a): append-only `mouse_move` is the location TRUTH;
  last-write-wins on the mouse.cage_id/slot_id derived CACHE (R1 below);
  client idempotency_key (UUID) with unique constraint guards double-submit;
  order by moved_at then PK; reject moves to soft-deleted/nonexistent cages.
- Versioning model (R1, 2026-09-04): a `snapshot` = the cumulative
  audit_log/mouse_move/mouse_attr_log/import_batch fold MATERIALIZED (state
  JSONB + high-water mark ids) at a professor-published boundary;
  view-at-version is a single-row read. No retroactive log edits ever
  (append-only invariant), so fold-on-read reconstruction is deferred, not
  required.
- **Schema refinements R1–R10 (architect-validated, 2026-09-04) — SUPERSEDED
  by R11–R25 (2026-09-05 → 09-07).** Still-live conclusions (all else is history):
  - R1 hierarchy colony > line > cage > slot > mouse; `slots.label` GLOBALLY
    unique (R10 composite amendment REVERSED 2026-09-12 — §5 Q19); mouse
    `cage_id`/`slot_id` = sanctioned DERIVED cache; invariant: if slot_id is
    set, slot.cage_id = mouse.cage_id.
  - R2 surrogate `id` PK (read as string); label = DERIVED non-unique
    projection — **NO UNIQUE constraint**; natural re-import key
    `(litter_id, pup_number)`; `mouse_lines` entity; `cage_number` UNIQUE alone.
  - R5 add-marker = role-gated INSERT, no schema change per marker. R6
    genotype label = derived `;`-join, NEVER overwrites `raw_genotype` (P1).
  - R8 tables PLURAL, columns/FKs SINGULAR (`cages` ⟷ `cage_id`);
    `litter_code_counter` singleton exception.
  - R9 base-26 codec stays a pure fn for GENERATION (rollover); "litter seq" =
    lab vocabulary, persisted as `pup_number` (R14 later persisted
    `litters.seq` — TASKS P0.3).
  - R10 live patterns: approximate dates = DATE + `is_*_approx` + `*_raw`;
    unresolved refs = nullable FK + raw text + import_errors warn (never drop a
    row); parents live on `litters`, not `mice`; tasks = WORK vs mates = FACT;
    service-layer invariants (pair-merge, origin-id continuity, order_index
    contiguity, littermate parent-conflict first-wins+warn); origin-id
    versioning SUPERSEDED for tasks (Task model v2 — resolves this block's "no
    UNIQUE on mutable fields" cost line), LIVE for notes/mates/mice.
  <!-- ARCHIVE: history-only -->
  Detail: [_archive/plan.r1-r10-schema-refinements.md](./_archive/plan.r1-r10-schema-refinements.md)

- **Breeding-cycle dates + tissue/genotyping placement (RATIFIED 2026-09-12,
  user — consistent with the shipped schema, not a change):**
  - **Cycle dates live on `mates`, NEVER on `mice`/`mouse_meta`.** The
    mated/last-mating date (shipped col `occurred_at` + `*_approx`/`*_raw`),
    plug check, and expected/actual delivery (`expected_delivery_on` + siblings)
    are properties of the MATING CYCLE. Editing such a date = **appendVersion**
    (copy the current head row forward, change the field, INSERT; head =
    DISTINCT ON (origin_mate_id) ORDER BY id DESC). A NEW mating cycle of the
    SAME couple = a NEW `origin_mate_id` (re-mating), **NOT** a version row —
    keep that distinction explicit. Delivery/outcome context may sit on
    `litters` (its `mate_id` back-link). PLUG has no dedicated column today
    (notes-only, Q28) — this decision fixes plug's HOME as `mates` if/when Q28
    resolves to capture it; it does not assert a column exists.
  - **Tissue & genotyping = `tasks` for the request→done→verify lifecycle;
    a dedicated table for RESULTS.** A tissue-check or genotyping request is a
    `tasks` row (task_type='Tissue'/'Genotyping'), append-only via
    `origin_task_id` (version rows = status transitions of the SAME request).
    "How many requested" = `COUNT(DISTINCT origin_task_id)` of that type for the
    mouse — tasks IS the request ledger / unique-event tracker. This ratifies
    0016 dropping `mouse_events` (dates land as tasks). Structured RESULT data
    (per-marker allele, PCR date, prep-stage, signal) does NOT go in
    `tasks.direction` jsonb — it goes in the P1 `genotyping_runs`/
    `genotyping_results`/`markers` tables, FK to mouse AND to the originating
    task (provenance). Tissue: "collected on date X" → a task (+optional note)
    suffices; a dedicated table only if structured sample data must be queried.
    <!-- UPDATED 2026-09-13 (user, Task model v2 below): the request→done→
    verify lifecycle now rides `cases` + `task_events` (case_type
    Tissue/Genotyping); "how many requested" = COUNT of live cases, not
    COUNT(DISTINCT origin_task_id). The RESULTS placement (genotyping_runs/
    genotyping_results, P1) STANDS unchanged. -->
  - **`MouseCell.dates` (grid.ts) is a VIEW model field, not a `mice` column.**
    The server RESOLVES it from mates/litters/genotyping/tasks before
    serializing; the flat view field is fine — only its PROVENANCE is those
    tables.

- **Task model v2 — CASES + TASK_EVENTS (DECIDED 2026-09-13, user; REFINED
  2026-09-13; batch-case bullet 2026-09-14):** lifecycle todo→doing→done→verified
  (cancelled side-exit); `cases` stable identity + MUTABLE `current_status` rollup;
  immutable child `tasks` status records (renamed from task_events); gen_key partial
  UNIQUE; `subject_mate_id`/`subject_slot_id`/`subject_line_id`; overdue derived at
  read; system user; two hard-coded SOP TaskGenerators; USER batch = ONE case over
  N mice via `case_mice` (0024), SOP fan-out untouched; UI stays task-centric.
  <!-- DETAIL: active, read on demand -->
  Detail: [docs/phases/p0.9.plan.md](./docs/phases/p0.9.plan.md)

- **Punch records + mouse-identity label composition (architect design
  2026-09-16 — was GATED on §5 Q39–Q45; that gate is CLOSED 2026-09-22, all
  seven answered/dissolved/closed; steps in TASKS P0.7-b):** `punches` table
  (0026, FK → mouse_meta, CHECK toe|ear|other, no UNIQUE, soft-delete); `addMouse`
  is the sole minter of the implicit `toe` punch; label = read-time projection
  `sex · pupNumber · [+offset] · litterCode · [e…]` (mid position abolished, Q39);
  pure `lib/mouseIdentity.ts` + `lib/punchMutations.ts`; five recorded conflicts
  actioned in P0.7-b steps 3/9a/9b (9 SPLIT 2026-09-22: the stored
  `MouseCell.mouseLabel` field deletion had no task → 9b). The split file also
  carries the LEGACY MOUSE-LABEL PARSE CONTRACT archived there 2026-09-22 —
  `extractLitterCode`'s body + comments, retired from code by task 9c and kept
  as the future import parser's acceptance spec.
  <!-- DETAIL: active, read on demand -->
  Detail: [docs/phases/p0.7.plan.md](./docs/phases/p0.7.plan.md)

## 5. Open Questions — split out (2026-09-22)

> Current state: 49 numbered questions, Q1–Q49, **numbering preserved in the
> split file** so citations of the form `plan §5 Q43` still resolve.
> Newest movement: **Q49 RESOLVED 2026-09-23** (owner: "yes" — pickers now sort by
> `sort_key`, one order everywhere). It had asked whether the gene PICKERS should follow
> `sort_key` too? Since `11d0322` the grid renders in `sort_key` order (PlpCre
> first) while the pickers still list catalogue-array order (Nf1 first); owner's
> call, nothing assumed. Pick ORDER itself no longer reaches the rendered string
> or the write path, so `CodeBadgeSelect`'s missing exclusivity is moot except
> for what the picker displays. Also **Q47 + Q48 ADDED 2026-09-23** — Q47 the gene/genotype
> COLOUR model, DECIDED IN PRINCIPLE by the owner (*"each gene has a color and
> +/+ will influence color but not this time"*: palette keyed by the WHOLE
> composed genotype label, zygosity = a different key, order normalised by
> `sort_key`, `WT`/`?` uncoloured, unseen genotype assigned + stored) but
> DELIBERATELY NOT IMPLEMENTED and carrying three genuinely open parts
> (palette-as-state, colour exhaustion at 13% alpha, and that it is an
> ALTERNATIVE to the per-gene-hue idea, never both); Q48 whether `mice_genes`
> should validate gene COMBINATIONS at all (`[Nf1, WT]`), now that
> `(mouse_id, gene_id)` closes only the duplicate case. **A `plan §5 Q47`
> citation at `docs/phases/p0.3.tasks.md:62` PRE-DATES Q47 and does NOT point
> at it** — annotated at the citation site, not renumbered.
> Earlier movements: **Q45 RESOLVED 2026-09-18** (offset storage = migration
> 0027 `pup_number_offsets` + `MouseCell.pupOffsets`); **Q46 DECIDED
> 2026-09-22 (owner): option C** for the `ParentCell` label → implemented by
> P0.7-b task 9d; **Q43 FULLY RESOLVED 2026-09-22 (owner): a Tissue-collection
> case does NOT mint a `toe` punch row** (*"tissue is independent each other with
> toe"*) — `punches` records identification marks only, `.N` and punch rows are
> DIFFERENT events, and it no longer gates P0.7-b task 13 (the 10+12 merge).
> **Q42 CLOSED 2026-09-22 (owner): `other` is a placeholder** — no decision
> needed, its accumulated analysis deleted on the owner's instruction (an
> explicit exception to the RESOLVED-line rule below), number kept so citations
> resolve. Q40 is DISSOLVED. **Nothing in §5 now gates current P0.7-b work.**
> Record every answer as a RESOLVED / DECIDED / DISSOLVED line UNDER its
> question — never rewrite or renumber a question.
> Detail: [docs/phases/open-questions.plan.md](./docs/phases/open-questions.plan.md)

### Schema redesign R11–R25 (2026-09-05 → 09-07) — SHIPPED

> Iterative DB redesign folds: mouse_meta/mice split, mates+litters, denormalized
> litter_code (guarded composite FK), signals table, groups/group_members,
> transit_status, prev_id CAS on the 4 versioned tables, genes/mice_genes,
> audit_logs immutability, notes reach. Migrations 0001–0020 shipped; SCHEMA.md
> regenerated. <!-- ARCHIVE: history-only -->
> Detail: [_archive/plan.r11-r25-schema-redesign.md](./_archive/plan.r11-r25-schema-redesign.md)
> Current schema is authoritative in [packages/db/SCHEMA.md](./packages/db/SCHEMA.md)
> — CORRECTED 2026-09-23 (owner: "no db yet"): there is NO database, so the
> MIGRATIONS are the contract and SCHEMA.md is a FOSSIL that stops at `0027`
> with a false "generated from the live colony_dev" banner. Detail:
> [docs/phases/p0.7-c.tasks.md](./docs/phases/p0.7-c.tasks.md).
