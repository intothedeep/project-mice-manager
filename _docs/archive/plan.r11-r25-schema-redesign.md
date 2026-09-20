# plan archive — schema redesign R11–R25 (2026-09-05 → 09-07)

> Cold storage (docs.md §2). History-only. The CURRENT schema is authoritative
> in `packages/db/SCHEMA.md` (generated from the live DB). Cut from `00.plan.md`
> on 2026-09-12; nothing changed, only relocated.

### R11 — mouse_ids registry, litters folded into matings (2026-09-05, user)
> **FULLY SUPERSEDED by R12-R15. HISTORY ONLY.** `mouse_ids` and `matings` no
> longer exist. Read R12-R15 for the shipped design, and
> `packages/db/SCHEMA.md` (generated from the live DB) for the current
> structure.

**`litters` and `litter_code_counter` are GONE.** Two changes, both driven by
the user's reading of the workbook and confirmed against it:

1. **The letter code gets its own table, `mouse_ids` (id, code UNIQUE, seq).**
   The professor issues a code ('BCW') and writes it into every mouse label.
   MEASURED on Breeders: 37 of 54 codes are shared by 2-8 mice, and all mice
   sharing a code have an IDENTICAL date of birth (37/37, no exceptions). So
   the code names a BIRTH COHORT and belongs in one row, referenced by many
   mice — not duplicated per mouse. `seq` stores the bijective base-26 ordinal,
   which RETIRES R9's length-first ordering trick: issue order is now a plain
   `ORDER BY seq`. Allocation moved from the single-row counter to
   `CREATE SEQUENCE mouse_id_seq START 1612` (first new code = BIZ).
2. **`litters` MERGED INTO `matings`.** They were already 1:1 — the old
   `matings_baby_litter_key` enforced exactly that — and duplicated the parent
   pair (mother/father vs subject/mate). One row is now one breeding cycle
   INCLUDING its outcome: `mother_mouse_id`, `father_mouse_id`, `mated_on`,
   `expected_delivery_on`, `birth_date`, `pup_count`, `code_id`. A cycle that
   has not delivered has NULL birth columns; a cohort imported without mating
   information has NULL `mated_on`.

CONSEQUENCES: `mice.litter_id` → `mice.birth_mating_id`; the natural key
becomes `(birth_mating_id, pup_number)`; `tasks.litter_id` dropped (use
`mating_id`); the FK column on matings is `code_id`, NOT `mouse_id`, because R8
reserves `mouse_id` for FKs to `mice`. **The label 'M4BCW' is never stored** —
it is composed from `sex + pup_number + code`. Tables 21 → 20, FKs 53 → 48.

VERIFIED 2026-09-05 by deliberate breakage on a rebuilt DB: duplicate code
rejected (`mouse_ids_code_key`); 5 mice share one BCW row; duplicate
`(birth_mating_id, pup_number)` rejected (`mice_cohort_pup_natural_key`); and
the composed label round-trips to exactly 'M4BCW'.

### R12 — mouse_meta / mice split, mates + litters + pups (2026-09-05, user)
> Partly superseded: the `pups` table was folded into `mouse_meta` (R13) and
> `litters.litter_no` became `litters.litter_code` (R14). The mouse_meta/mice
> split and the mates+litters split described here STAND.

SUPERSEDES R11. `matings` and `mouse_ids` are gone; the breeding chain is now
four tables, and mouse identity is split from mouse state.

- **`mouse_meta`** (was `mouse_ids`) — what a mouse is GIVEN AT BIRTH and never
  changes: `mouse_id` (its own `^[A-Z]{1,5}$` code, UNIQUE PER MOUSE), `seq`,
  `pup_id`, `sex`, `dob`, `line_id`, raw source strings. One row = one mouse,
  forever. This is the stable identity every other table now FKs to.
- **`mice`** — the mouse's UPDATABLE state (cage, slot, status, attention),
  **APPEND-STYLE**: an update INSERTs a new row for the same `mouse_meta_id`
  rather than modifying one. Current state is the highest id per
  `mouse_meta_id` (`DISTINCT ON`, served by `mice_meta_idx`); history is free.
  CONSEQUENCE: no UNIQUE constraint can live here — every version row repeats
  its values — so all uniqueness sits on `mouse_meta`.
- **`mates`** — the COUPLE. `mother_mouse_id` + `father_mouse_id`; creating a
  mate id IS the act of pairing. One row per couple, not per cycle.
- **`litters`** — one birth cycle OF one couple: `mate_id`, `litter_no` (the
  professor's letter code, UNIQUE), `seq`, `mated_on`, `expected_delivery_on`,
  `birth_date`, `pup_count`. One mouse can have MANY litters; a litter has ONE
  couple. Cycle dates live here, not on `mates`, which is what preserves the
  repeat-cycle history the flat sheet destroys.
- **`pups`** — one pup slot within a litter, `UNIQUE (litter_id, pup_number)`.
  `mouse_meta.pup_id` links a grown mouse back to its pup slot (`UNIQUE`).

`colonies → mouse_lines → cages → slots` are unchanged. Chain is CIRCULAR
(mates → mouse_meta → pups → litters → mates), broken by CREATE-then-ALTER at
the bottom of 0002 — never by relaxing FK enforcement.

VERIFIED 2026-09-05 by deliberate breakage on a rebuilt DB: duplicate couple
rejected (`mates_couple_key`); one couple carrying two litters (BCW, BGX) with
distinct cycle dates; duplicate `(litter_id, pup_number)` rejected; duplicate
`mouse_id` rejected; a cage move appending a THIRD `mice` row while the head
query returns exactly one current state; and the cage/slot composite FK still
rejecting a slot from the wrong cage.

### R13 — pups folded in, outside mice nullable (2026-09-05, user)
> Points 1-2 of R13 (code on the mouse) were REVERSED by R14 below — the code
> is a LITTER attribute. Points 3-4 (pups folded in, nullable outside mice)
> still stand.

Amends R12.

1. **`litters.litter_no` REMOVED.** A litter is identified by its integer `id`
   alone. The professor's letter code ('BCW') is a MOUSE attribute, not a litter
   attribute — `mouse_meta.code`. `litter_no_seq` is gone; the single remaining
   allocator is `mouse_code_seq` (START 1612 → first issued code is BIZ).
2. **A mouse carries TWO identifiers, on purpose**, so the old and new systems
   can be reconciled during and after the migration:
   - `mouse_meta.id` — ours: surrogate integer, always present, always unique.
   - `mouse_meta.code` — the professor's convention. **NOT unique on its own**:
     it is shared by littermates (37 of 54 Breeders codes are shared by 2-8
     mice, all with identical DOB).
   The human label is COMPOSED, never stored: `sex || pup_number || code` →
   `'M4BCW'`. That TRIPLE is what is unique (`mouse_meta_label_key`); measured,
   173 of 173 Breeders labels are distinct.
3. **`pups` FOLDED INTO `mouse_meta`.** It held only `(litter_id, pup_number)`,
   which are mouse attributes, and splitting them off put the label's uniqueness
   across two tables where no UNIQUE could reach it.
4. **Outside mice:** `code`, `litter_id` and `pup_number` are all NULLABLE, so a
   mouse brought in from elsewhere is admitted with all three NULL. One
   asymmetry is enforced (`mouse_meta_pup_needs_litter`): a `pup_number`
   without a `litter_id` names nothing ("number 4 of what?") and is REJECTED,
   while a known litter with an unknown number IS allowed.

ACCEPTED DENORMALIZATION, recorded so it is not mistaken for an oversight:
because `code` sits on the mouse rather than the litter, two littermates could
be given different codes and no constraint would object. The ETL assigns one
code per litter and should warn when a litter's members disagree.

VERIFIED 2026-09-05 by deliberate breakage: the real BCW cohort of 5 composes to
F1BCW/F2BCW/F3BCW/M4BCW/F5BCW sharing one litter; duplicate label rejected;
pup_number reuse within a litter rejected; an outside mouse inserts with all
three NULL; `pup_number` without `litter_id` rejected; litter-known/number-
unknown accepted.

### R14 — the letter code is a LITTER attribute (2026-09-05, user)

Corrects R13 points 1-2. The professor's code ('BCW') moves BACK onto the
litter, which is where the workbook measurement always pointed: 37 of 54
Breeders codes are shared by 2-8 mice, and every mouse sharing a code has an
identical date of birth (37/37, no exceptions).

- **`litters.litter_code`** (UNIQUE) + `seq`, allocated from `litter_code_seq`
  (START 1612 → first issued code is BIZ). `mouse_code_seq` is GONE.
- **`mouse_meta.code` and `mouse_meta.seq` REMOVED.** A mouse has ONE stored
  identifier: `mouse_meta.id`, ours.
- **The professor identifies a mouse by a COMPOSED label**, never stored:
  `sex || pup_number || litters.litter_code` → `'M4BCW'`.
- Label uniqueness now falls out for free from two existing constraints —
  `litters_litter_code_key` (one code per litter) and
  `mouse_meta_litter_pup_key` (one pup_number per mouse in a litter) — so the
  R13 `mouse_meta_label_key` triple index is dropped.
- **The R13 "accepted denormalization" RISK IS GONE.** With the code stored once
  per litter, littermates cannot be given diverging codes: the column they would
  diverge in no longer exists.
- An OUTSIDE mouse has no litter, therefore no professor label at all — only
  our `id`. That is the correct reading, not a gap.

VERIFIED 2026-09-05 by deliberate breakage: one couple carrying litters BCW and
BGX with distinct cycle dates; duplicate `litter_code` rejected; the real BCW
cohort of 5 composing to F1BCW/F2BCW/F3BCW/M4BCW/F5BCW by join (including
`F3+10BCW` → `F3BCW` under the prototype leading-number rule); exactly ONE
distinct code across the cohort; and an outside mouse admitted with
`litter_id`/`pup_number` NULL.

### R15 — litter_code denormalized onto mouse_meta, guarded (2026-09-05, user)

`mouse_meta.litter_code` is a DENORMALIZED copy of `litters.litter_code`, added
so composing the professor's label costs no join:

```sql
SELECT sex || pup_number || litter_code FROM mouse_meta;   -- no JOIN
```

The litter remains the SOURCE OF TRUTH. The copy cannot drift, because it is
pinned by a composite FK — the same device already used for the cage/slot
overlap:

```sql
ALTER TABLE litters ADD CONSTRAINT litters_id_code_key UNIQUE (id, litter_code);
ALTER TABLE mouse_meta
    ADD CONSTRAINT mouse_meta_litter_code_agree_fkey
        FOREIGN KEY (litter_id, litter_code) REFERENCES litters (id, litter_code)
        ON UPDATE CASCADE;
```

- A mouse cannot claim a code its litter does not have.
- `ON UPDATE CASCADE`: correcting a litter's code rewrites every copy in that
  litter automatically — without it, the correction would simply be REJECTED.
- `MATCH SIMPLE` skips the check when `litter_id IS NULL`, so outside mice
  (no litter, no code) still insert.

This is why the denormalization is safe here and was NOT safe in R13: in R13 the
code had no litter to be pinned to.

VERIFIED 2026-09-05 by deliberate breakage: label composed with no join; a mouse
in litter BCW claiming code 'BGX' rejected; a nonexistent code 'ZZZ' rejected;
renaming the litter BCW→BCX cascaded to all 5 mice (F1BCX…F5BCX) in one
statement; outside mouse still admitted with both columns NULL.

### R16 — scenario-driven fixes (2026-09-05, user)

Seven gaps found by running the professor/staff weekly cycle as SQL
(`packages/db/scenarios/`), all fixed and re-verified there.

- **notes REDESIGNED.** `subject_mouse_id` is now NULLABLE — it was NOT NULL,
  which made litter-level notes impossible, and `no pups` is the workbook's most
  common note. CORRECTED 2026-09-05: that counted CELLS — it is ONE note in row
  489 replicated across ~1023 columns. The change still stands on room-level
  notes (Experimental rows 25-27, 'CHECK FOOD'), which have no mouse and no
  litter. Added `note_type` + `meta JSONB` (per-type
  payload) and `signal_id` FK.
- **`cell_signal` ENUM → `signals` TABLE** (id, type, color), seeded
  done/black, instruction/red, plan/blue. Signals become data: the professor can
  add one without a migration, and the colour is no longer hardcoded in the
  client.
- **Assignment:** new `groups` + `group_members`; `tasks.assigned_user_id` /
  `assigned_group_id` with a CHECK that at most one is set, plus `direction
  JSONB` for per-type instructions. The `assignables` VIEW unions users and
  groups for the picker — a view cannot be an FK target, which is exactly why
  the two real columns stay.
- **`mouse_attr_logs` DROPPED.** Redundant since R12 made `mice` append-style,
  and demonstrably a second source of truth. Replaced by `mice.is_alive` +
  `death_reason` (CHECK: a reason requires `is_alive = false`).
- **`mouse_moves` DROPPED.** Consecutive `mice` version rows ARE the move
  history. Maintaining both needed two writes per move with nothing tying them,
  and drifted in test. `reason` and `idempotency_key` moved onto `mice`;
  transfer progress is `mice.in_transit` ('init'|'moved'|'checked').
- **Outside mice get a litter** (`litters.is_from_outside`, `mate_id` NULL), so
  `mouse_meta.litter_id` and `pup_number` are NOT NULL and the natural
  re-import key covers EVERY mouse. Previously both were NULL for outside mice
  and re-import silently duplicated them.
- **`sex` moved from `mouse_meta` to `mice`.** Newborns are 'U' and are sexed
  later, so sex is mutable state; each correction is now a version row with its
  own actor and reason. COST, accepted: the professor's label
  (`sex||pup_number||litter_code`) is now a function of CURRENT state, so
  composing it needs the head row — the join that denormalizing `litter_code`
  removed comes back via `sex`.

**JSONB GUARDRAIL (applies to `notes.meta` and `tasks.direction`):** values
only, never entity references. An id buried in JSONB has no foreign key, would
survive its target being deleted, and contradicts the standing "foreign keys are
always enforced" decision. References belong in real FK columns.

P5 has no schema fix: nothing can force a child row to exist. The create-mouse
service must append the first `mice` row (cage/slot NULL = "unplaced") in the
same transaction, and location views must LEFT JOIN so an unplaced mouse is
shown rather than dropped. Recorded as a P0.4/P0.6 task.

### R17 — a group IS a user; transit_status (2026-09-05, user)

Simplifies R16's assignment design.

- **`users.type` ('user' | 'group').** Teams live in `users`, so anything
  assignable is one row in one table. `groups` keeps only GROUP METADATA
  (description), pinned to its users row by a composite FK
  `(user_id, user_type='group')` against `users UNIQUE (id, type)` — so group
  metadata cannot be attached to a person.
- **`tasks.assigned_to` — ONE FK.** This replaces R16's
  `assigned_user_id` + `assigned_group_id` + `tasks_one_assignee` CHECK + the
  `assignables` union view. All four existed only because a person and a team
  were modelled as different kinds of thing. The picker is now
  `SELECT id, display_name, type, role FROM users`.
  "My tasks" = assigned directly to me, OR to a group I belong to via
  `group_members`.
- **`mice.in_transit` → `mice.transit_status`** with the real four steps:
  `waiting` (a transfer is needed) → `issued` (requested to a specific cage) →
  `moved` (physically moved) → `verified` (confirmed by professor/manager).
  DEFAULT is `verified`, the resting state — a mouse sitting where it belongs
  is not mid-transfer, and import lands rows there directly.

VERIFIED 2026-09-05: a group and a person both assigned through the same
column; group metadata on a person REJECTED by the composite FK; "my tasks"
returning both the direct and the group-routed task; the full four-step transfer
walked on one mouse; an unknown status REJECTED.

### R18 — group assignment is a SERVICE rule; groups have no role (2026-09-05, user)

**Group eligibility is BUSINESS LOGIC in the backend, not a constraint.** When
`tasks.assigned_to` names a group, only a member of that group may work the
task. The service checks `group_members` before permitting a transition. This is
deliberately NOT a database constraint: expressing "done_by must be a member of
the group named by assigned_to" needs a cross-row trigger, and triggers that
silently reject writes are far harder to debug than a service check that can
explain itself in the response.

**Groups carry NO role.** `users.role` is now NULLABLE with
`users_role_matches_type`: a person must have a role, a group must not. The
earlier default of `'staff'` on a group row was a value that read like
permission and never was — nothing ever consults it.

**AUTHORIZATION ALWAYS READS THE ACTING PERSON'S ROLE.** A task assigned to a
group is carried out by one of its members, and `canTransition` judges THAT
member. The group answers "who may pick this up", the person answers "may this
actor make this transition" — two different questions, and conflating them is
what a role on the group would have invited.

VERIFIED 2026-09-05: a group inserted with a role REJECTED; a person inserted
without a role REJECTED; a group row shows role NULL.

### R19 — a mouse line IS a mouse line (2026-09-05, user)

`mouse_lines` is GONE: it was the same entity as `mouse_lines` under another
name. **One workbook = one colony**, and its column-B "Mouse line" values are
that colony's mouse_lines:

```
colonies   MouseRoomSheet-260823-ALJ
  mouse_lines   nNf1 flox;ccEGFP (85 mice) · pHRasG12V;ccEGFP (42) ·
                nHRasG12V;ccEGFP (30) · WTs (29) · Nf1+/- (15) ·
                Myrf (14) · pNf1 flox;ccEGFP (10)
    cages   2477, 2389, ...
      slots
```

MEASURED before merging: all 62 Breeders cages belong to exactly ONE line, none
spans two — so `cages.line_id` is correct and the hierarchy is real, not
imposed.

- `mouse_meta.line_id` → `mouse_meta.line_id`. **`litters` carries NO
  mouse line** (amended 2026-09-05, user): the programme is reachable via
  `mate_id -> mates.line_id`. See R20.
- **A mouse MAY belong to a different programme than its litter** (decided
  2026-09-05, user): pups get moved into another line's programme, so the two
  legitimately diverge. A composite guard was briefly added and then REMOVED —
  do not re-add it.
    - `mouse_meta.line_id` = the programme this MOUSE is in NOW.
    - `litters.line_id` = the programme the LITTER was bred under.
  Both keep a plain FK to `mouse_lines`, so neither can name a programme that
  does not exist. This is the one litters/mouse_meta overlap left unpinned, and
  the asymmetry is intentional: `litter_code` IS pinned (a mouse cannot rename
  its own litter), mouse line is not (a mouse can be reassigned).
- `mouse_lines UNIQUE (colony_id, name)`: a line name is unique within its
  colony, not globally, so two workbooks can each have a 'WTs'.

> **AMENDED R25 (2026-09-07, user):** `mouse_meta.line_id` MOVED to
> `mice.line_id`. Mouse line is MUTABLE (a mouse is reassigned between
> programmes), so it belongs on the append-only version row, not on immutable
> `mouse_meta`; every `mice` version row carries `line_id` forward. And
> `litters.line_id` / `mates.line_id` NEVER EXISTED — the "bred-under" line
> above was aspirational; it stays DERIVED/unhomed (no consumer). Read R25.

NOT to be confused with `mouse_genotypes`: the mouse line is the professor's
ORGANISATIONAL unit (why this mouse is kept, 7 values), the genotype is what the
individual actually is (50+ values). One line contains mice of several
genotypes, because that is what its crosses produce — the line cannot be derived
from the genotype.

VERIFIED 2026-09-05: colony → mouse line → cage chain built; a mouse claiming a
different mouse line from its litter REJECTED; a duplicate line name within one
colony REJECTED.

### R20 — the pairing carries mouse line and cage (2026-09-05, user)
> **REVERSED the same day (R21): both are derivable from the parents and were
> removed again. Read R21.**

`mates` gains `line_id` and `cage_id`; `litters.line_id` is REMOVED.

**Why cage_id is right here and was wrong before.** An earlier revision dropped
`cage_id` from the breeding table on the grounds that the WORKBOOK has no
"cage where the mating happened" column — column D is the mouse's CURRENT cage.
That reasoning was about IMPORT and does not carry to new data: going forward
the app creates pairings, and the professor picks a cage at that moment. The
value exists; it simply did not exist in the spreadsheet.

**Why litters loses its copy.** With the programme on `mates`, a litter reaches
it through `mate_id -> mates.line_id`. Storing it again on `litters` is the
same derivable-duplicate the rest of this schema has been removing.

ACCEPTED LOSS, stated so it is not discovered later as a bug: a litter with
`mate_id` NULL — historical rows whose parents are unknown, and the
`is_from_outside` shells — has NO programme of its own. Verified: such litters
report "(none)" while the mice inside them still carry
`mouse_meta.line_id`, so the information is not destroyed, only unreachable
from the litter row.

A `mates` row is one couple pointing at TWO `mouse_meta` rows (mother, father) —
not two rows per pairing.

VERIFIED 2026-09-05: a pairing recorded with both parents, programme and cage; a
litter resolving its programme and mating cage through `mate_id`; mate-less
litters showing no programme while their mice keep theirs;
`litters.line_id` confirmed gone.

### R21 — derive the pairing's programme and cage; `mice.effective_at` (2026-09-05, user)

Reverses R20. `mates` carries NEITHER `line_id` NOR `cage_id`.

- **PROGRAMME** = `mouse_meta.line_id` of either parent. Unambiguous:
  measured on Breeders, all 39 resolvable pairs mate WITHIN one line and **0
  cross lines**, so mother and father never disagree.
- **CAGE AT PAIRING TIME** = the parent's `mice` version that was current then.
  Recoverable precisely because `mice` is append-style. A stored `cage_id` would
  have frozen the pairing cage and then gone stale as the mice moved.

**`mice.effective_at` ADDED — a real bug found while proving the above.**
The first derivation returned the WRONG cage. Cause: `created_at DEFAULT now()`
takes **transaction start** time, not statement time, so every row written in
one transaction shares a timestamp and cannot be ordered against the others.
Confirmed directly: `now()` returned an identical value twice across a 0.2s
sleep while `clock_timestamp()` advanced.

This is not academic — **the ETL imports the whole workbook in ONE
transaction**, so every imported `mice` row would have carried the same
`created_at` and no historical state could ever have been reconstructed from
imported data.

    created_at    when the ROW WAS WRITTEN (audit: when did we learn this)
    effective_at  when the STATE BECAME TRUE (domain: when did it happen)

Time-travel queries MUST read `effective_at`; `mice_effective_idx`
`(mouse_meta_id, effective_at DESC)` serves them. The ETL sets `effective_at`
from the workbook's own dates.

VERIFIED 2026-09-05, all inside ONE transaction (the ETL's own conditions):
2 rows sharing 1 distinct `created_at` but 2 distinct `effective_at`; the cage
as of 2026-08-10 resolving to 2477 while the current cage is 2482.

### R22 — the pairing is a CYCLE with an append-only status log (2026-09-05, user)

**`mates` is ONE ROW PER MATING CYCLE, not per couple.** When a pair mates
again, a NEW `mates` row and a NEW `litters` row are created; the previous cycle
keeps its own rows. The old `mates_couple_key` UNIQUE (mother, father,
raw_label) enforced one row per pair and made a second pairing of the same two
mice IMPOSSIBLE — verified by deliberate breakage before removal. Do not re-add
it. `mates` : `litters` is now 1:1, enforced by `litters_mate_key`.

**NO cycle progress on `litters` AT ALL.** `mated_on` and its approx/raw
siblings are gone, `expected_delivery_on` moved to `mates`, and `birth_date` is
gone too — the `delivered` row in `mate_status_logs` already holds that date in
`occurred_at`, together with the actor and the `~` approximate flag that a bare
DATE could not carry. `litters` keeps only what the cycle PRODUCED:
`litter_code`, `seq`, `pup_count`, `is_from_outside`.
`pup_count` stays because it is a real outcome and is NOT recoverable from the
log.

**`mates` IS the log — VERSIONED-APPEND (amended 2026-09-05, user).** The
separate `mate_status_logs` table is GONE. `mates` carries `origin_mate_id` and
one ROW PER STATE, exactly as `tasks`/`notes` already work: the first row points
at itself, advancing the pairing INSERTs a new row sharing that origin, and the
current state is the newest row. Stages:

| status | 한국어 | meaning |
|---|---|---|
| `pending` | 합사전 | ordered; the two are not yet in one cage |
| `cohoused` | 합사 | moved together into one cage |
| `awaiting` | 임신 준비 | co-housed, watching for a plug / signs |
| `pregnant` | 임신확인 | pregnancy confirmed |
| `delivered` | 출산확인 | delivery confirmed |

Current status is the newest row (`DISTINCT ON (origin_mate_id) ... ORDER BY
origin_mate_id, occurred_at DESC, id DESC`), served by `mates_origin_idx`.

**`litters.mate_id` must name an ORIGIN row, and that is ENFORCED.** A litter
belongs to the CYCLE, not to one transient state of it. The composite FK
`(mate_id, mate_id) REFERENCES mates (id, origin_mate_id)` admits only rows
where `id = origin_mate_id` — Postgres accepts a column repeated in the key, and
the effect is that a plain reference to any mid-history row is rejected.
Verified: pointing a litter at the 'delivered' row failed with
`litters_mate_is_origin_fkey`.

WHY VERSION ROWS AND NOT COLUMNS. A `status` column plus four stage timestamps
was built first and then replaced. The timestamps could not record WHO advanced the
pairing, could not survive a stage being entered TWICE (pregnancy suspected,
ruled out, confirmed again — the second write overwrote the first), and could
not hold a reason. Keeping both a history and the timestamps would have recreated
the two-sources-of-truth bug that removed `mouse_attr_logs` (scenario P3), so
status lives ONLY on the version rows.
A separate `mate_status_logs` table was then built and ALSO removed: with
`mates` versioned, the log WAS the mates rows, and one table does the job that
two were doing.

`occurred_at` is when the stage HAPPENED, not when the row was written — the
same distinction as `mice.effective_at`, for the same reason (`now()` is
transaction-start time). `is_occurred_at_approx` carries the workbook's `~`
(no copulatory plug seen, so the date is estimated).

**Co-housing is VERIFIED, NOT CONSTRAINED.** Once cohoused — and still at
delivery — both parents' current `mice` rows share mouse line, cage and slot.
Checking that compares head-of-history rows across two mice, which a CHECK
cannot express and a trigger could only reject silently; the service runs the
query and can name the parent in the wrong cage. Query in
`packages/db/scenarios/flow-mating.sql`.

This is the third rule of that shape (with group eligibility and the
unplaced-mouse rule): cross-row conditions live in the service, single-row and
referential ones live in the schema.

VERIFIED 2026-09-05 by walking the whole flow: seven transitions recorded
INCLUDING a reversal (pregnant → awaiting → pregnant) with each actor and note
preserved; current status resolving to the newest row; an invalid status
rejected; both parents sharing one cage/slot/mouse line at co-housing and again
at delivery; and the same couple re-mating into a second `mates` + `litters`
pair while the first cycle kept its own history.


### R23 — versioned-append writes must copy the head row (2026-09-05, user)

Applies to all four versioned-append tables: `mice` (`mouse_meta_id`), `mates`
(`origin_mate_id`), `tasks` (`origin_task_id`), `notes` (`origin_note_id`).

An append INSERT that omits a column receives its DEFAULT — usually NULL — and
because the newest row IS the current state, the omitted value is DESTROYED.
Silently: no error, no log, no trace. Measured:

- marking a task `done` without carrying the row forward erased `assigned_to`
  and `subject_cage_id`;
- advancing a pairing to `pregnant` erased `mother_mouse_id`,
  `father_mouse_id` and `expected_delivery_on`;
- recording a death erased `cage_id` and `sex`, so the mouse vanished from its
  cage;
- editing a note's body erased the `litter_id` it belonged to.

This differs from UPDATE, where untouched columns simply stay.

**NO SCHEMA CONSTRAINT CAN CATCH IT.** A NULL `cage_id` is also the legitimate
"unplaced" state a new mouse needs (P5), and a NULL `assigned_to` the legitimate
"unassigned" state a task starts in. An omission and an intention are
indistinguishable to a CHECK. A trigger that back-filled NULLs from the previous
row would break the real cases where clearing a value IS the change.

DECIDED: handled in BUSINESS LOGIC — an `appendVersion(table, logicalId,
changes, actor)` repository helper that reads the head row, copies every column
forward, applies the changes and inserts. Nothing writes these tables directly.
Recorded as a P0.6 task.

This is the fourth rule of this shape, alongside group eligibility, the
unplaced-mouse rule and co-housing verification: cross-row and intent-dependent
conditions live in the service; single-row and referential ones live in the
schema.

### R24 — the colony subdivision is named `mouse_lines` (2026-09-05, user)

`subcolonies` is RENAMED to `mouse_lines`, and `subcolony_id` to `line_id`
everywhere (`cages`, `mouse_meta`). The entity is unchanged — R19 established
that a colony's subdivision IS a mouse line — this is naming only, using the
professor's own word rather than an invented hierarchy term:

```
colonies      MouseRoomSheet-260823-ALJ
  mouse_lines   nNf1 flox;ccEGFP · pHRasG12V;ccEGFP · WTs · Myrf · ...
    cages         2477, 2389, ...
      slots
```

Also DROPPED: `subcolonies UNIQUE (id, colony_id)`. It existed only to be the
target of a composite FK pinning a mouse to its litter's line, and that guard
was removed when a mouse was allowed to belong to a different line than its
birth litter. Nothing referenced it any more.

`mouse_lines UNIQUE (colony_id, name)` stays: a line name is unique within its
colony, not globally, so two workbooks can each have a 'WTs'.

VERIFIED 2026-09-05: schema rebuilt from empty; `cages.line_id` and
`mouse_meta.line_id` are the only FKs into it; all three scenario files re-run
with only their intended rejections.

### R25 — schema review pass: genes, notes reach, task/audit hardening (2026-09-07, user)

> WRITTEN + SCRATCH-VERIFIED (2026-09-07): migrations 0009-0019 apply cleanly
> from empty and three deliberate-breakage probes pass (CAS collision on `mice`,
> `audit_logs` UPDATE rejected, zero-target + mouse+litter notes both insert).
> The DEV DB is NOT yet migrated (that apply is destructive — the user's call),
> and SCHEMA.md/ERD regen waits on it. Method is forced by the runner: migrations
> are checksum-guarded and append-only (`packages/db/src/migrate.ts`), so R25 is
> NEW files that ALTER/DROP; it never edits 0001-0008. Fable research backed the
> tasks/notes/audit calls.

A design-review pass over the whole schema. Nine changes plus two resolved
tensions; each records its consequence rather than leaving it silent.

1. **`slots.label` → GLOBAL partial unique** (drop `(cage_id, label)`).
   CONSEQUENCE / future-import BLOCKER: label 'F5' occurs in cages '2413' AND '4'
   in the real workbook (see 0002:210-212), so the deferred import CANNOT proceed
   without a relabel. Accepted only because import is out of scope this prototype.
2. **`sex` → the `sex` ENUM on `mice`** (was TEXT CHECK). Sex STAYS on `mice`,
   not `mouse_meta`: newborns are 'U' and are sexed later, so it is mutable state
   and each correction is a new version row (scenario P7). The enum was until now
   unused as a column type; 0001's "enforced at mouse_attr_logs" note is stale
   (that table is gone).
3. **`mouse_meta.line_id` → `mice.line_id`** — see the AMENDED R25 note under
   R19. `litters.line_id`/`mates.line_id` never existed; bred-under stays derived.
4. **Import provenance REMOVED everywhere** (`import_batch_id`, `source_sheet`,
   `source_row` off every domain table) and the import machinery mothballed
   (`import_batches`, `raw_sheet_rows`, `import_errors`, `color_maps` DROPPED).
   0006 stays byte-identical on disk (missing-file guard) and is inert. Import is
   not built this version.
5. **`genes` NEW** — `(id, code, label, description)`; `code` holds the WHOLE
   marker byte-for-byte incl. zygosity ('Nf1 f/+'), the simplest lossless choice.
   `description` not `desc` (reserved word). Partial-unique on `code`.
6. **`mouse_genotypes` → `mice_genes`** — `marker_text` replaced by
   `gene_id → genes(id)`; `mouse_id`(→mouse_meta.id) and `order_index` kept.
   Genotype = `string_agg(genes.code ORDER BY order_index)`.
7. **`mouse_events` DROPPED** (with its `mouse_event_kind` enum). Tissue-collection
   / genotyping dates now land as DONE `tasks` rows (`task_type`
   'tissue_collection'/'genotyping', date in `due_date`/`done_at`). ACCEPTED
   LOSSES: no `~` approx flag, no `raw_value` byte-preservation, no
   `(mouse_id,kind,occurred_on)` dedup — multi-date cells become multiple rows.
8. **Optimistic concurrency = `prev_id` + `UNIQUE (origin_*_id, prev_id)`** on ALL
   FOUR versioned tables (tasks, notes, mates, mice). NO separate `version`
   integer — the head row id IS the token; the client submits `expected_head_id`
   and a stale edit collides on the unique (DB-level compare-and-swap), 409 on
   conflict. Same hazard family proved on all four tables in commit c895a2a. The
   creation row has `prev_id NULL` and is pinned instead by its self-FK origin.
9. **`audit_logs` → append-only immutable**: DROP `updated_at`/`deleted_at` + the
   set_updated_at trigger, `REVOKE UPDATE, DELETE`. **SANCTIONED soft-delete
   exception (§22.4):** an immutable audit log is the one table that must not
   carry a tombstone. ADD `request_id`, `on_behalf_of_id`. Writes happen in the
   SERVICE LAYER inside the same transaction as the domain change (no triggers).
   For the four versioned tables, store a version-row POINTER, not a duplicated
   before/after diff (the version row already holds full state).

RESOLVED TENSIONS:
- **notes reach (A):** attachable to 6 entities — add nullable FKs `colony_id`,
  `cage_id`, `line_id`, `slot_id` alongside the existing `subject_mouse_id` and
  `litter_id`. **NO `num_nonnulls = 1` CHECK** (Fable proposed it; overruled by
  this repo's own data): room-level notes have ZERO targets ('CHECK FOOD') and a
  note legitimately names a mouse AND its litter (subject + context). Zero-or-more,
  mirroring the deliberately-unconstrained `tasks` subject columns (Q31). Append
  invariant (service-enforced): target FKs are identical across a note's origin
  chain — a note cannot move what it is attached to.
- **tasks subjects (B):** whether `tasks` gains the same expanded subjects
  (colony/line/slot) to match `notes` is DEFERRED to Dr. Lopez-Juarez (Q31 —
  the real per-type subject rule needs her).
