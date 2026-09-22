# DESIGN — CRUD + Colour assignment/admin + Colour-free-on-delete

> Standalone RFC / review artifact (cold storage, gitignored). NOT one of the three living
> docs. Nothing here changes app code, `PLAN.md`, `TASKS.md`, or `STATUS.md`.
> Research date 2026-09-12. Cites the live schema (`packages/db/SCHEMA.md`), plan §2/§4/§5,
> and the mock client seam.

## 0. Ground truth used (files read)

- `packages/db/SCHEMA.md` — the LIVE schema (regenerated from `colony_dev`).
- `PLAN.md` §2 (identity colours, palette/assignment tables — DESIGN-STAGE), §4 (R7/R10
  versioning), §5 (Q34 slot-vs-cage, Q35 allocation scope).
- `apps/colony_client_web/lib/mockStore.ts`, `lib/gridMove.ts`,
  `apis/getColonyGrid.mock.api.ts` — the current mutation + DTO seam.
- `packages/types/src/grid.ts`, `src/task.ts` — the read DTOs.
- `.claude/CLAUDE.md` (layering, soft-delete, tx-in-service), `.claude/rules/python.md`
  (controllers→services→repositories — note: the fixed stack is the TS monorepo
  `apps/colony_server`, controllers→services→repositories per plan §2; the layering rule is
  what governs, not the language).

### 0.1 Versioned vs flat — the fact table this whole doc rests on

From `SCHEMA.md`, exactly FOUR tables carry the append-only version pattern
(`origin_*_id` and/or `prev_id` + a `*_prev_cas_key` partial-unique index):

| table   | logical-id anchor        | CAS index (`WHERE deleted_at IS NULL`)        |
|---------|--------------------------|-----------------------------------------------|
| `mates` | `origin_mate_id` (+`prev_id`) | `mates_prev_cas_key (origin_mate_id, prev_id)` |
| `notes` | `origin_note_id` (+`prev_id`) | `notes_prev_cas_key (origin_note_id, prev_id)` |
| `tasks` | `origin_task_id` (+`prev_id`) | `tasks_prev_cas_key (origin_task_id, prev_id)` |
| `mice`  | `mouse_meta_id` (+`prev_id`)  | `mice_prev_cas_key (mouse_meta_id, prev_id)`   |

Everything else is a **flat soft-delete table** (`deleted_at` tombstone, edited in place with
`UPDATE`): `colonies`, `mouse_lines`, `cages`, `slots`, `genes`, `mice_genes`, `litters`,
`mouse_meta`, `signals`, `groups`, `group_members`, `users`. `audit_logs` is immutable
append-only (no `deleted_at`).

Two consequences that drive Topic 1:

1. **`mice` has NO `origin_mouse_id`.** `mouse_meta` IS the logical anchor. So a mouse's
   BIRTH FACTS (dob, pup_number, litter_code, raw_*) live in flat `mouse_meta` and are edited
   in place; its LIFE STATE (cage_id, slot_id, sex, is_alive, transit_status, attention) lives
   in versioned `mice`, and every change is a new `mice` row with `prev_id` = current head.
2. **Append-only ENFORCEMENT was dropped 2026-09-05** (plan §4 R10 tail): version rows still
   accumulate, but the tables are MUTABLE with `deleted_at`. `reject_mutation()` triggers are
   gone. This means an in-place `UPDATE ... SET deleted_at` on a head row is now schema-legal —
   which is decisive for the delete mechanism below.

"Head row" read pattern (no convenience views — removed 2026-09-05):
`SELECT DISTINCT ON (origin_task_id) * ... ORDER BY origin_task_id, id DESC` (served by
`tasks_origin_idx`); analogous for the other three. `mice` uses `mouse_meta_id`.

---

## TOPIC 1 — CRUD for line / cage / slot / mouse / mice-bulk

### 1.1 Current state

- **Mutations today are client-only and in-memory.** `lib/gridMove.ts::moveMouse` mutates a
  `structuredClone` of the `ColonyGrid` and returns the new tree; its header comment already
  documents the intended real behaviour ("INSERTs a new `mice` version row with the new
  cage_id/slot_id (prev_id = current head, CAS)"). `lib/mockStore.ts` holds tasks/upcoming in a
  module-level array behind `useSyncExternalStore`; `setTaskStatus`/`addTask` mutate and
  `emit()`. There are NO create/delete paths for line/cage/slot/mouse yet — only move + task
  status/create.
- **The read seam is snapshot-shaped.** `getColonyGrid.mock.api.ts` returns a whole
  `ColonyGrid` and is deliberately named as the future real fetcher; its comment states the
  mock→real swap is a single-file change. DTOs (`grid.ts`) are explicitly post-head-resolution
  ("No version/prev_id/deleted_at leak to the client").
- **No `colony_server` exists yet** (plan §2 describes it: controllers → services (tx boundary
  via `withTransaction`) → repositories (executor param `Pool | PoolClient`) → `@repo/db`).

### 1.2 Per-entity CRUD design

**Line (`mouse_lines`) — flat.** UNIQUE `(colony_id, name) WHERE deleted_at IS NULL`.
- Create: INSERT. Update: `UPDATE name`. Delete: `UPDATE deleted_at = now()`.
- Validation on delete: BLOCK if any live head `mice` row references it via `mice.line_id`
  (or via `cages.line_id` → live cages). Recommend **block, not cascade** (see 1.4).

**Cage (`cages`) — flat.** UNIQUE `(cage_number) WHERE deleted_at IS NULL`.
- Create/update/delete = INSERT / UPDATE / tombstone.
- Delete validation: BLOCK if any live head `mice` row with `cage_id = X AND is_alive` — you
  cannot dissolve a cage that still physically holds live mice. Also cascade-tombstone its
  `slots` (a slot has no meaning without its cage) — this cascade is safe because it is
  purely structural, no data loss of animals.

**Slot (`slots`) — flat. THE CONSTRAINT DISCREPANCY (top open question).**
- `SCHEMA.md` line 314: `slots_label_key ON slots (label) WHERE deleted_at IS NULL` —
  **GLOBALLY unique label** (matches the task brief and `grid.ts` GridSlot comment
  "GLOBALLY-UNIQUE slot label ... NOT scoped by cage").
- BUT plan §4 R10 says Q19's global-unique was **empirically FALSIFIED** — label `F5` appears
  in cages `2413` and `4` in the real workbook — and the constraint was "AMENDED to partial
  UNIQUE `(cage_id, label) WHERE deleted_at IS NULL`". **The live DB still has the GLOBAL
  index; the amendment never landed (or was reverted).** The first real import will
  `UNIQUE`-violate on the second `F5`.
- Also present: `slots_id_cage_key (id, cage_id)` — the composite target for the
  cage/slot-divergence guard FK (a mouse can't claim cage A while sitting in a slot of cage B).
- Create-slot: INSERT (mirrors `gridMove.ts`'s `newSlotLabel` path, which today invents a
  surrogate id). Under the GLOBAL index, "create slot A8" fails if A8 exists anywhere.
- **Recommendation:** resolve the discrepancy before any real import. Either ship the R10
  amendment (migrate `slots_label_key` → `(cage_id, label)`) or re-confirm global with the
  professor and reject the workbook's duplicate. This is a hard blocker for Topic 1 slot CRUD.

**Mouse (`mouse_meta` flat + `mice` versioned) — the split matters.**
- **Create** = INSERT one `mouse_meta` (birth facts) + INSERT the FIRST `mice` head row
  (`prev_id = NULL`, life state). Requires a `litters` row: manual/ad-hoc mice with no real
  litter use the existing escape hatch `litters.is_from_outside = true`. Note the first head's
  `(mouse_meta_id, NULL)` pair is NOT deduped by the CAS index (SQL NULLs are distinct), so
  duplicate-create races are caught by `mouse_meta_litter_pup_key` / `mice_idempotency_key`,
  not by CAS — CAS only guards SUBSEQUENT edits (1.5).
- **Edit birth fact** (dob, pup_number, raw_genotype): `UPDATE mouse_meta` in place (flat).
- **Edit life state** (move cage/slot, sex correction, mark dead, attention, transit): INSERT
  a new `mice` row copying the current head forward with the field changed and
  `prev_id = <head.id>`. The `mice_prev_cas_key (mouse_meta_id, prev_id)` gives optimistic
  concurrency: if another writer already appended off that same head, the partial-unique index
  rejects the second INSERT → 409 conflict (see 1.5).
- **Delete a mouse:** see the CAS-tombstone trap in 1.3 — this is NOT simply "insert a row with
  deleted_at set".

**Mice-bulk create** (ties to the planned Excel importer — reference, do NOT rebuild it):
- One `withTransaction` for the whole batch = all-or-nothing (tx boundary in the SERVICE layer
  per plan §2 / CLAUDE.md). Repositories take the `PoolClient` executor param.
- **Double-submit guard already exists:** `mice.idempotency_key uuid`, `mice_idempotency_key`
  unique WHERE not null. The client sends a per-row (or per-batch) UUID; a retried batch
  no-ops on the conflicting keys.
- **Partial-failure reporting:** reuse the importer's `import_errors` pattern (plan §4:
  `import_errors` is a MUTABLE table with `entity`/`entity_id` so triage can navigate to the
  offending row, plus a `resolved_at`). For an interactive bulk-create that is all-or-nothing,
  the transaction aborts and the response returns a per-row error list in the SAME shape
  (`{rowIndex, entity, entity_id, message}`) — do not silently drop a row (plan §1 P0-a gate:
  "0 silently dropped rows"). Do not re-design the importer; the bulk endpoint is a thin
  interactive front that borrows its error contract.

### 1.3 Delete mechanism — the CAS-tombstone trap (versioned tables)

For the four versioned tables, a naive "delete = INSERT a version row with `deleted_at`
already set" is **UNSAFE**. The `*_prev_cas_key` indexes are partial `WHERE deleted_at IS
NULL`, so a row inserted WITH `deleted_at` set does not participate in the CAS index. A
concurrent editor whose version-INSERT carries the same `prev_id` then still succeeds — the
delete is silently lost, and there are now two live-vs-dead heads racing.

Three candidate mechanisms:

1. **In-place `UPDATE deleted_at` on the current head row.** Now schema-legal (append-only
   enforcement dropped 2026-09-05). Simplest; the head query `DISTINCT ON ... ORDER BY id
   DESC` then must additionally filter `WHERE deleted_at IS NULL` (or mask at read). CAS stays
   coherent because no new row is added off the head. **RECOMMENDED** — it matches how flat
   tables already delete, keeps one uniform "tombstone = deleted_at" story, and avoids the
   trap. Cost: it mutates a version row in place (acceptable now that immutability is gone;
   `audit_logs` still records before/after).
2. **Tombstone as a NEW row inserted with `deleted_at` NULL first + a delete marker, then
   masked** — pointless complexity; you would immediately have to null-out the CAS anyway.
   Rejected.
3. **Serializable re-check inside the service txn** — read head, verify `prev_id`, insert.
   Works but pushes concurrency correctness into app code that the partial-unique index was
   built to enforce for free. Only needed if we insist deletes be full version rows for audit
   symmetry — and `audit_logs` already gives that symmetry.

**Decision proposed:** deletes (and un-deletes) on versioned tables = in-place
`UPDATE deleted_at` on the head, inside the service transaction, with an `audit_logs` row
(`action='delete'`, before/after JSON). Flat tables already work this way.

**Residual delete-vs-edit race — mechanism 1 needs a slice of mechanism 3 for deletes.** The
`*_prev_cas_key` index only rejects a DUPLICATE `(origin, prev_id)` pair; it does NOT require
`prev_id` to point at a still-live row. So while we tombstone the head, a concurrent editor can
INSERT a new version with `prev_id = head` and succeed — the head query then returns that new
live row and the delete is silently lost. To close this, the delete service must, inside its
transaction: (a) `UPDATE ... SET deleted_at = now() WHERE id = :expectedHeadId AND deleted_at
IS NULL` (0 rows → 409, the head already moved), AND (b) assert no row exists with
`prev_id = :expectedHeadId` (else 409). The recommendation stands; it is just qualified with
this explicit re-check on the delete path.

### 1.4 Cascade vs block on delete

Repo rule: explicit > implicit (CLAUDE.md priority order). **Recommend BLOCK** for
animal-bearing deletes:
- Delete cage while it holds live mice → **reject** with a clear error listing the live mice;
  the operator must move/sac them first. (Structural children — its slots — cascade-tombstone,
  since a slot cannot outlive its cage and holds no animal data itself.)
- Delete line while it has live cages/mice → **reject**.
- Delete slot while it holds live mice → **reject** (or auto-move to "no slot", `slot_id` is
  nullable — but that is an implicit move; prefer reject + explicit move).
Cascade-deleting animals is exactly the implicit data-destroying behaviour the soft-delete
rule guards against.

### 1.5 Optimistic-concurrency conflict (versioned tables)

The client already receives head-resolved DTOs with no `prev_id`. For an edit the server must
know which head the client saw. Two options: (a) client echoes the head `id` it read; (b)
server reads current head at write time and trusts last-write. Recommend (a) — the mutation
carries `expectedHeadId` (= `prev_id`); the INSERT relies on `mice_prev_cas_key` to reject a
stale write; on `unique_violation` the service returns **409 with the fresh head** so the UI
can rebase. This is the SAME `prev_id`-CAS mechanism the P2 offline outbox will reuse (plan §3,
Q37) — designing it now is forward-compatible, not throwaway.

### 1.6 API surface (controllers → services → repositories)

```
POST   /lines                 createLine
PATCH  /lines/:id             updateLine
DELETE /lines/:id             deleteLine            (block if live children)
POST   /cages                 createCage
PATCH  /cages/:id             updateCage
DELETE /cages/:id             deleteCage            (block if live mice; cascade slots)
POST   /cages/:id/slots       createSlot            (label-uniqueness per Topic-1 discrepancy)
PATCH  /slots/:id             updateSlot
DELETE /slots/:id             deleteSlot            (block if live mice)
POST   /mice                  createMouse           (mouse_meta + first mice head; needs litter)
PATCH  /mice/:metaId          updateMouse           (birth fact = UPDATE meta; life state = new mice row + CAS)
DELETE /mice/:metaId          deleteMouse           (UPDATE deleted_at on head, 1.3)
POST   /mice:bulk             bulkCreateMice        (one withTransaction; idempotency_key; import_errors-shaped report)
POST   /mice/:metaId/move     moveMouse             (existing gridMove semantics → new mice head row)
```
- **Service layer** owns `withTransaction` and all invariants that cannot be DB constraints
  (slot.cage_id == mouse.cage_id on move; block-on-live-children; CAS conflict → 409).
- **Repository layer** functions each take an executor (`Pool | PoolClient`), raw SQL, no tx.
- **Client seam:** today's `getColonyGrid.mock.api.ts` + `lib/mockStore.ts` are replaced by
  React-Query hooks (`hooks/`) wrapping fetchers in `apis/*.api.ts` (`[method][Name].api.ts`,
  per `rules/nexjts.md`). `gridMove.ts::moveMouse` stays as the OPTIMISTIC local apply
  (React-Query `onMutate`), the server confirms/rebases. Nothing in the grid render changes —
  the DTO contract in `grid.ts` is already the post-resolution shape.

### 1.7 Topic 1 open questions

- **Q-slot-label (NEW, top-3):** live DB has GLOBAL-unique `slots.label`; plan R10 says it was
  amended to `(cage_id, label)` after empirical falsification. Which is authoritative? Blocks
  slot CRUD + first real import.
- Confirm delete = in-place `UPDATE deleted_at` on versioned heads (1.3) is acceptable given
  audit_logs provides the trail (append-only enforcement already dropped).
- Bulk-create granularity of `idempotency_key`: per-row or per-batch?
- Manual mouse create without a real litter: always `is_from_outside=true`, or a dedicated
  "unknown litter" sentinel?

---

## TOPIC 2 — Colour assignment + palette-admin page

### 2.1 Current state

- **Palette/assignment tables are DESIGN-STAGE — NOT in `SCHEMA.md`.** Plan §2 defines them:
  `color_palette(token, hex UNIQUE, channel)` (one hex = one meaning) and
  `color_assignments(channel, key, token)` `UNIQUE(channel, key)`, keyed on the CATEGORY
  (canonical genotype string / **mate-group id**), never per-mouse. Plan §2: a **mate group =
  father-fanout** — all `mates` rows sharing a father form ONE group, so the mate key is the
  father's `mouse_meta` id, NOT a single mate row's `origin_mate_id`. A female mated to two
  males belongs to two father-groups, hence carries two hexes (confirmed in the mock: F9AYL has
  `MATE.gA` + `MATE.gB`).
- **The mock resolves hex directly** (`getColonyGrid.mock.api.ts`: `GENO` map + `MATE` map);
  DTOs carry resolved hex (`MouseCell.genotypeColor`, `MouseCell.mates[].color`,
  `GridLine.nominalGenotypeColor`). WT / `'?'` → `null` = neutral default cell (only mutants
  carry a hue). The `'line'` channel is RETIRED (2026-09-12) — genotype colour is the sole
  line-rail hue. So the live channels are `genotype` and `mate`.
- Allocation rule (plan §2): pick the next palette token whose hex is not already referenced by
  a live assignment in the uniqueness scope:
  ```sql
  SELECT token FROM color_palette p
  WHERE NOT EXISTS (
    SELECT 1 FROM color_assignments a
    WHERE a.token = p.token AND a.deleted_at IS NULL   -- Topic 3: MUST filter deleted
      [AND a.channel = :channel]                        -- Q35: per-channel vs palette-wide
  )
  ORDER BY p.sort LIMIT 1;
  ```

### 2.2 Proposed DDL (design-stage; lands with `colony_server`)

```sql
CREATE TABLE color_palette (
  token       text PRIMARY KEY,           -- stable id, e.g. 'teal-600'
  hex         text NOT NULL,              -- '#0d9488'
  channel     text NOT NULL,              -- text + CHECK, not a PG enum (extensible)
  sort        int  NOT NULL,              -- allocation order
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz,                -- retire a palette entry
  CONSTRAINT color_palette_channel_chk CHECK (channel IN ('genotype','mate'))
);
CREATE UNIQUE INDEX color_palette_hex_key ON color_palette (hex) WHERE deleted_at IS NULL;

CREATE TABLE color_assignments (
  id          bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  channel     text NOT NULL,
  key         text NOT NULL,              -- canonical genotype string | father mouse_meta id (mate-group)::text
  token       text NOT NULL REFERENCES color_palette(token),
  actor_id    bigint NOT NULL REFERENCES users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz
);
-- PARTIAL unique so a retired (soft-deleted) assignment can be RE-created for the same key:
CREATE UNIQUE INDEX color_assignments_key ON color_assignments (channel, key)
  WHERE deleted_at IS NULL;
```
Note: `UNIQUE(channel, key)` must be **partial** `WHERE deleted_at IS NULL`, or re-assigning a
key after retiring it is impossible (same soft-delete bug class the R10 fold fixed on
`cages`/`slots`/`mouse_lines`/`litters`).

### 2.3 Assignment on a new key

When a new gene/genotype/mate first needs a colour, the service runs the allocation query
(2.1) inside `withTransaction`, INSERTs the `color_assignments` row (actor stamped), and writes
`audit_logs`. WT / `'?'` genotype → NO assignment (null = neutral). Same `withTransaction`
must hold the SELECT + INSERT so two concurrent allocations cannot pick the same token (or rely
on the `color_palette_hex_key` + a serializable retry).

### 2.4 Palette-admin page (VIEW + EDIT / reassign / retire)

A single table view — one row per `color_palette` token:

| token | hex (swatch) | channel | assigned key | in-use count |
|-------|--------------|---------|--------------|--------------|

`in-use count` = number of LIVE entities currently rendering that colour, per channel. Sketch:

```sql
-- genotype channel: live mice whose current head genotype maps to this assignment's key
SELECT a.token, a.channel, a.key, count(*) AS in_use
FROM color_assignments a
JOIN <live-head-mice-with-genotype> m ON m.canonical_genotype = a.key
WHERE a.channel = 'genotype' AND a.deleted_at IS NULL
GROUP BY a.token, a.channel, a.key;
-- mate channel: count distinct live mates rows in the father-fanout group keyed by father mouse_meta id
```
(The genotype→canonical-string resolution is the same the read path uses; do not build a new
count engine — join against the live heads.)

Admin actions + API:
```
GET   /palette                     listPalette            (token/hex/channel/assigned-key/in-use)
PATCH /palette/:token   { hex }    updatePaletteHex       (recolour — changes every entity on that token at once)
PATCH /palette/:token   { token }  renamePaletteToken     (careful: token is the FK target)
DELETE /palette/:token             retirePaletteToken     (soft-delete; blocked if in-use > 0?)
PATCH /assignments/:id  { token }  reassignKey            (point a genotype/mate at a different token)
```
- Changing `hex` on a token recolours EVERY entity using it in one write (the whole point of
  keying by category, not per-mouse — plan §2: "recolour = one row").
- Reassign = update `color_assignments.token` for that key. Must respect the allocation
  invariant (target token not already live-used in scope) unless the admin deliberately
  overrides (Q35 determines whether cross-channel reuse is allowed).
- Keep this a plain table page — do NOT build an admin framework (out of scope).

### 2.5 Topic 2 open questions

- **Q35 (allocation scope, top-3):** is hex-uniqueness PER-CHANNEL or PALETTE-WIDE? Sets the
  `[AND a.channel = :channel]` clause. Per-channel lets a genotype and a mate-group reuse one
  hex; palette-wide forbids it. Confirm with the professor (plan §5 Q35).
- Can an admin retire a token that is still in-use (> 0), forcing those entities to reallocate,
  or block retire until unused?
- Rename semantics: `token` is a FK target — rename = update palette + cascade, or forbid
  rename and only allow retire+recreate?

---

## TOPIC 3 — Free a colour on delete

### 3.1 The crux: entity-keyed vs categorical-keyed assignment

A first instinct is that mate is entity-keyed (1:1, free eagerly) and only genotype is
categorical. **That instinct is wrong** — BOTH live channels are keyed by a CATEGORY that is
shared across many rows, so neither frees on a single-entity delete:

- **`channel = 'genotype'` → keyed by a CATEGORICAL string** (canonical genotype, e.g.
  `'Nf1 f/+'`) SHARED across many mice. Deleting ONE mouse must NOT free the colour — other
  live mice still render it. Frees only when **NO live mouse renders that genotype anymore**.
- **`channel = 'mate'` → keyed by the father-fanout GROUP id** (father `mouse_meta` id), which
  spans MANY `mates` rows. Deleting one `mates` row (one mating cycle) must NOT free the
  colour — other live matings share that father-group. Frees only when the father's **LAST live
  mating is deleted**. So mate is categorical too, NOT the clean 1:1 case.

This actually SIMPLIFIES the recommendation: the SAME mechanism applies uniformly to both
channels — a live-usage count check.

**Recommendation — eager-with-count-check for BOTH channels.**
- On delete (mouse for genotype; mating for mate), after tombstoning the entity:
  `SELECT NOT EXISTS (<any live row still using this key>)` — for genotype, live mouse with
  that canonical genotype; for mate, live `mates` row sharing that father-group. If none,
  soft-delete the `color_assignments` row (`UPDATE ... SET deleted_at = now()`) in the same
  transaction.
- The alternative — **lazy** (never proactively free; let the ALLOCATION query 2.1/3.2 exclude
  assignments whose key has no live usage) — is a viable simpler delete path, but leaves the
  palette admin's "in-use = 0 yet still assigned" rows looking like garbage until GC'd.
- **Recommend eager-with-count-check** — it keeps `color_assignments` honest (no zombie rows),
  makes the palette-admin in-use count trustworthy, and localises the logic in the delete
  service (where the transaction already is). Both count queries are cheap against the
  live-head index.

### 3.2 The allocation query MUST filter `deleted_at IS NULL`

Whichever strategy, the `NOT EXISTS` allocation query (2.1) must filter
`a.deleted_at IS NULL`, or a freed colour never returns to the pool. This is stated in plan §2
("filtered to `deleted_at IS NULL`") but bears repeating as an invariant:

> INVARIANT: a hex is FREE iff no `color_assignments` row references its token with
> `deleted_at IS NULL` in the uniqueness scope.

### 3.3 Audit trail

Every assignment soft-delete writes an `audit_logs` row (`entity='color_assignment'`,
`entity_id`, `action='free'`, before/after JSON, `actor_id`) — `audit_logs` is the immutable
who/what/when trail (SCHEMA.md; plan §1 core need 2). This gives the "why did this colour come
back to the pool" trail without a bespoke log.

### 3.4 Topic 3 open questions

- **Genotype-free semantics (top-3):** confirm that a genotype colour frees only when the LAST
  live mouse of that genotype is deleted (eager-with-count-check), vs. lazy GC. This is the
  crux the prompt flagged.
- Does deleting a mouse's genotype (via genotype correction on `mouse_meta`) also trigger a
  free-check on the OLD genotype string? (Genotype edits, not just mouse deletes, change
  live-usage counts.)
- Interaction with Q35: if scope is per-channel, freeing a genotype hex does not free it for
  the mate channel — the "free pool" is per-channel too.

---

## Phased recommendation

- **P0-a / now (design-stage, lands with `colony_server`):**
  - Resolve the **slot-label discrepancy** (Topic 1, top open Q) BEFORE first real import.
  - Ship flat-table CRUD (line/cage/slot) + mouse create/edit/delete with the **in-place
    `UPDATE deleted_at` head-tombstone** mechanism (1.3) and **block-on-live-children** (1.4).
  - Move already has a defined server contract (`gridMove.ts` comment) — formalise it as the
    first versioned-write with `prev_id` CAS + 409 rebase (1.5).
  - Client seam: swap mock store → React-Query hooks + `.api.ts` fetchers; keep `moveMouse` as
    optimistic local apply.
- **P0-b:** bulk mice-create endpoint reusing the importer's `import_errors` contract +
  `idempotency_key`; land the `color_palette` / `color_assignments` DDL and the allocation
  service (replaces the mock `GENO`/`MATE` maps behind the same DTO).
- **P1:** palette-admin page (Topic 2) once colours are DB-backed; colour-free-on-delete
  (Topic 3) wired into the delete services with the count-check.
- **P2 (already planned):** the same `prev_id`-CAS conflict path (1.5) becomes the offline
  outbox conflict detector (plan §3, Q37) — no rework.

## Top 3 open questions for the professor / user

1. **Slot-label uniqueness:** live DB has GLOBAL-unique `slots.label`
   (`SCHEMA.md` L314), but plan R10 says it was amended to `(cage_id, label)` after the real
   workbook had `F5` in two cages. Which is authoritative? Blocks slot CRUD + first import.
2. **Q35 — colour-allocation scope:** per-channel or palette-wide hex uniqueness? Sets the
   allocation query's channel clause and whether genotype/mate can share a hex.
3. **Genotype-colour free semantics:** confirm a genotype colour returns to the free pool only
   when the LAST live mouse of that genotype is gone (eager-with-count-check recommended), vs.
   lazy allocation-time GC.
