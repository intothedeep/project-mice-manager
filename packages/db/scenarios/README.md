# Workflow scenarios — schema fitness check

Purpose: prove the schema can carry Dr. Lopez-Juarez's actual weekly routine
BEFORE building on it. Everything here is EXECUTABLE, not prose — the findings
below were produced by running these files, not by reading the DDL.

```bash
createdb colony_dev && pnpm --filter @repo/db db:migrate
psql -d colony_dev -f packages/db/scenarios/flow-weekly-cycle.sql
psql -d colony_dev -f packages/db/scenarios/flow-probes.sql
```

Both scripts end in ROLLBACK — they leave no rows behind. Re-run them after any
migration change; a scenario that stops working is a regression.

## Scenarios

Grounded in `_assets/meeting_02.txt` (weekday staff execute / weekend professor
closes) and the real workbook, not invented.

| # | Actor | Scenario |
|---|---|---|
| S1 | ETL | Import a breeder pair with genotype, DOB, cage and slot |
| S2 | Professor | Pair two mice → couple + expected litter + "check plug" task |
| S3 | Staff | Pregnancy question as a red (instruction) note |
| S4 | — | Delivery: litter confirmed, 5 pups created, newborns sex=U |
| S5 | Staff | Sex determined at weaning: U → M |
| S6 | Staff | Wean: move 3 pups to a new cage |
| S7 | Staff | Tissue collection date recorded |
| S8 | Both | Task lifecycle open → done → verified |
| S9 | Professor | Assign a task to a named staff member |
| S10 | Anyone | Cage-grid view: current mice per cage |
| S11 | Staff | Mark a mouse dead |

## Flows and what happened

Legend: OK = carried by the schema · **FAIL** = rejected or wrong result.

| Flow | Result |
|---|---|
| S1 import → `mouse_meta` + `mice` + `mouse_genotypes` | OK |
| S2 pairing → `mates` + `litters` + `tasks` | OK |
| S3 mouse-level note → `notes` | OK |
| S3b **litter-level note ("no pups")** | **FAIL** — `notes.subject_mouse_id` is NOT NULL |
| S4 delivery → `litters` outcome + 5 `mouse_meta` | OK |
| S5 sex correction U→M, label recomposes to `M1BIZ` | OK, but no history (P7) |
| S6 wean → `mouse_moves` + `mice` append | OK |
| S7 `mouse_events` | OK |
| S8 task open→done→verified via `origin_task_id` | OK |
| S9 **assign task to staff** | **FAIL** — no such column |
| S10 cage grid via DISTINCT ON | OK |
| S11 mark dead | OK but written to the WRONG place (P3) |

## Status: all 7 RESOLVED (2026-09-05, R16)

Re-run after the fixes: every flow above passes, including the two that failed
outright. The problem write-ups below are kept because they record WHY each
change exists — deleting them invites the same design back.

| Problem | Fix | Re-verified |
|---|---|---|
| P1 litter/room notes | `subject_mouse_id` nullable; `note_type` + `meta` JSONB; `signals` table | 'no pups' on a litter, 'CHECK FOOD' with no subject, both render their colour |
| P2 no assignee | A GROUP IS A USER (`users.type`); `groups` holds group meta; ONE `tasks.assigned_to` FK | task assigned to a group and to a person through the same column; group meta on a person REJECTED |
| P3 two state sources | `mice.is_alive` + `death_reason`; `mouse_attr_logs` DROPPED | alive+death_reason REJECTED by CHECK |
| P4 no key without litter | outside mice get a litter (`litters.is_from_outside`); `litter_id`/`pup_number` NOT NULL | re-insert REJECTED by `mouse_meta_litter_pup_key` |
| P5 invisible mice | state row created at birth with cage/slot NULL | unplaced mouse visible with `cage_id` NULL |
| P6 cache drift | `mouse_moves` DROPPED — a move IS a `mice` version row; `transit_status` waiting→issued→moved→verified | one insert per move; full 4-step transfer walked; unknown status REJECTED |
| P7 sex overwritten | `sex` moved to `mice` | F→M kept as two rows with actor and reason |

## Problems found

Ordered by how much damage they do, not by how hard they are to fix.

### P1 — Litter-level notes are impossible (BLOCKER)
`notes.subject_mouse_id` is `NOT NULL`, so a note about a LITTER with no
specific mouse is rejected. This is not an edge case: **`no pups` appears 1023
times** in the workbook — the single most common note in the entire file. Also
affects room-level notes ("check food", Experimental rows 25-27).
Fix: make `subject_mouse_id` nullable; a note carries a mouse, a litter, or
neither.

### P2 — Tasks cannot be assigned to anyone (BLOCKER)
`tasks` has `created_by`, `done_by`, `verified_by` — who DID it — but nothing
for who it is FOR. The product's stated core is a ticket bin the professor
drops work into for staff to pick up. Today every task is unassigned.
Fix: `assigned_to BIGINT REFERENCES users (id)`.

### P3 — Mouse state lives in two places at once
`mice.status` / `mice.attention` and `mouse_attr_logs (field, value)` both claim
to hold mutable state. Measured: after writing 'dead' through `mouse_attr_logs`,
the cage grid reading `mice.status` reported **0 dead** while the log reported
**1**. Whichever a reader picks, the other is wrong.
Fix: pick one. `mice` version rows already give per-field history, which is what
`mouse_attr_logs` existed for — it looks redundant now, but deleting a table is
not a call to make silently.

### P4 — Mice with no litter have NO uniqueness at all
The natural key is `(litter_id, pup_number)`, both NULL for outside mice and for
imported breeders whose litter is unknown. Measured: inserting `F1BAL` twice
gives **2 rows**, no constraint objects. Every re-import of the same workbook
duplicates them.
Fix: a partial unique on `raw_mouse_id WHERE litter_id IS NULL` gives them the
same re-import protection the old `mice_pooled_raw_key` gave pooled rows.

### P5 — A mouse with no `mice` row is invisible everywhere
Nothing requires a state row. Measured: 4 mice in `mouse_meta`, **0** state
rows, and all 4 absent from the cage grid and every location query. Newborn pups
land in exactly this state — created at birth, not yet placed.
Fix: the birth service must append an initial `mice` row (mother's cage), or
location views must LEFT JOIN and show "unplaced" rather than dropping the row.

### P6 — `mouse_moves` and `mice.cage_id` can disagree
Two writes are required per move and nothing ties them. Measured after recording
a move without appending the state row: **cache says cage 2475, move history
says 2482.** The cage/slot composite FK does not help — each row is internally
consistent, they just describe different cages.
Fix: one service does both in one transaction; the plan already calls
`mice.cage_id` a cache rebuilt from `mouse_moves`, so the rebuild path must
exist and be run.

### P7 — Sex is overwritten with no history
Newborns are `U` and get sexed later, so this UPDATE is routine — and it
CHANGES THE PROFESSOR'S LABEL (`U1BIZ` → `M1BIZ`). Two consequences: the old
value is gone (`mouse_meta` is documented as birth-given and immutable, but sex
demonstrably is not), and anything that recorded the old label no longer
resolves.
Fix: either move `sex` out of `mouse_meta` into the versioned `mice` rows, or
log the change. Needs a decision, not a default.

## Not problems (checked, fine)

- `litters.mate_id` is nullable → historical litters with unknown parents import
  cleanly.
- Empty cages simply do not appear in the grid aggregate; that is a query
  concern (LEFT JOIN from `cages`), not a schema one.
