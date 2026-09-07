# Workflow scenarios — schema fitness check (R25)

Purpose: prove the R25 schema can carry Dr. Lopez-Juarez's actual weekly routine
BEFORE building on it. Everything here is EXECUTABLE, not prose — the findings
below were produced by running these files, not by reading the DDL.

```bash
pnpm --filter @repo/db db:reset
psql -d colony_dev -f packages/db/scenarios/flow-weekly-cycle.sql
psql -d colony_dev -f packages/db/scenarios/flow-probes.sql
psql -d colony_dev -f packages/db/scenarios/flow-mating.sql
```

All scripts end in ROLLBACK — they leave no rows behind. Re-run after any
migration change; a scenario that stops working is a regression.

## R25 schema changes reflected in these files

1. **mouse_events GONE** — tissue-collection / genotyping are DONE `tasks` rows
   (`task_type = 'tissue_collection'` / `'genotyping'`, date in `due_date`/`done_at`).
2. **mouse_genotypes → mice_genes** — `marker_text` replaced by `gene_id BIGINT → genes(id)`.
   A mouse genotype string = `string_agg(g.code, ';' ORDER BY mg.order_index)`.
   `genes.code` holds the whole marker including zygosity (e.g. `Nf1 f/+`).
3. **Import provenance REMOVED** — `import_batch_id`, `source_sheet`, `source_row`
   are gone from all tables. `import_batches`, `raw_sheet_rows`, `import_errors`,
   `color_maps` tables are dropped.
4. **line_id moved mouse_meta → mice** — every `mice` version row carries `line_id`.
5. **mice.sex is now the `sex` ENUM** (values still `'M'`/`'F'`/`'U'`).
6. **prev_id CAS on tasks/notes/mates/mice** — each has `prev_id` + unique index
   `(<origin_col>, prev_id) WHERE deleted_at IS NULL`. Faithful version-appends set
   `prev_id = head.id`. Creation rows keep `prev_id NULL`.
7. **notes** gained `colony_id`/`cage_id`/`line_id`/`slot_id` nullable FKs.
   No exactly-one CHECK — zero and multiple targets are both legal.
8. **audit_logs** no longer has `updated_at`/`deleted_at`; has `request_id` and
   `on_behalf_of_id`; UPDATE/DELETE are REVOKEd FROM PUBLIC (immutable).
9. **slots.label is globally unique** — scenarios use `cage_number||'-'||label`
   patterns to avoid collisions between cages.

## Scenarios

Grounded in `_assets/meeting_02.txt` (weekday staff execute / weekend professor
closes) and the real workbook, not invented.

| # | Actor | Scenario |
|---|---|---|
| S1 | ETL | Import a breeder pair with genotype (via `genes`+`mice_genes`), DOB, cage and slot |
| S2 | Professor | Pair two mice → couple + expected litter + "check plug" task |
| S3 | Staff | Pregnancy question as a red (instruction) note |
| S4 | — | Delivery: litter confirmed, 5 pups created, newborns sex=U |
| S5 | Staff | Sex determined at weaning: U → M |
| S6 | Staff | Wean: move 3 pups to a new cage |
| S7 | Staff | Tissue collection date recorded as a DONE `tasks` row (task_type='tissue_collection') |
| S8 | Both | Task lifecycle open → done → verified (with prev_id CAS) |
| S9 | Professor | Assign a task to a named staff member |
| S10 | Anyone | Cage-grid view: current ALIVE mice per cage |
| S11 | Staff | Mark a mouse dead (full-state append with prev_id) |

## Probes and what each verifies

### flow-probes.sql

| Probe | Intent | Expected outcome |
|---|---|---|
| PROBE 1 | Partial-row INSERT loses cage+sex in latest mice row | Demonstrated (not a constraint violation — NULL is legal for unplaced mice) |
| PROBE 2 | Correct full-state append with prev_id | Latest head shows cage+sex+is_alive correctly |
| PROBE 3 | `created_at` = txn wall-clock; `effective_at` for time-travel | 1 distinct created_at, 2 distinct effective_at |
| PROBE 4 | Idempotency key dedupe | **INTENDED REJECTION**: `unique_violation` on `mice_idempotency_key` |
| PROBE 5 | mouse_meta requires litter_id | **INTENDED REJECTION**: `not-null violation` on `mouse_meta.litter_id` |
| PROBE 6 | mates: partial append loses parents + expected_delivery_on | Demonstrated; correct CAS append restores them |
| PROBE 7 | tasks: partial append loses assignee + cage + direction | Demonstrated; correct CAS append restores them |
| PROBE 8 | notes: partial append loses litter target | Demonstrated; correct CAS append restores it |
| **PROBE 9 (R25)** | **CAS collision**: two appends with same prev_id | First succeeds; **INTENDED REJECTION** on second: `unique_violation` on `mice_prev_cas_key` |
| **PROBE 10 (R25)** | **notes reach**: room/multi-target/cage notes all legal | All three INSERT → accepted (no exactly-one CHECK) |
| **PROBE 11 (R25)** | **audit_logs immutability** | INSERT succeeds as owner. UPDATE succeeds as owner (bypasses REVOKE FROM PUBLIC). In production a non-owner app role receives `ERROR 42501 permission denied`. No separate role created (cluster-level side effect). |

### flow-mating.sql

| Step | Verified |
|---|---|
| pending → cohoused → awaiting → pregnant → awaiting → pregnant → delivered | All transitions insert and display correctly |
| Co-housing query | Both parents share exactly one cage/slot/line after move |
| Reverting pregnant → awaiting | History preserved; current status reflects latest row |
| Still co-housed at delivery | Verified |
| Invalid status 'married' | **INTENDED REJECTION**: `mates_status_check` constraint |
| Re-mating same couple → new `mates` + new litter | Both `BCW` and `BGX` litters show birth_date from `delivered` rows |

## Status: all PASS as of R25 (2026-09-07)

Every scenario and probe passes with ONLY its intended rejections. The R25
changes (genotype via genes table, prev_id CAS, notes multi-target, audit
immutability) are all exercised.

## Historical problems (R16, now all RESOLVED)

| Problem | Fix | Re-verified |
|---|---|---|
| P1 litter/room notes | `subject_mouse_id` nullable; `note_type` + `meta` JSONB; `signals` table | 'no pups' on a litter, 'CHECK FOOD' with no subject, both render their colour |
| P2 no assignee | A GROUP IS A USER (`users.type`); `groups` holds group meta; ONE `tasks.assigned_to` FK | task assigned to a group and to a person through the same column |
| P3 two state sources | `mice.is_alive` + `death_reason`; `mouse_attr_logs` DROPPED | alive+death_reason REJECTED by CHECK |
| P4 no key without litter | outside mice get a litter (`litters.is_from_outside`); `litter_id`/`pup_number` NOT NULL | re-insert REJECTED by `mouse_meta_litter_pup_key` |
| P5 invisible mice | state row created at birth with cage/slot NULL | unplaced mouse visible with `cage_id` NULL |
| P6 cache drift | `mouse_moves` DROPPED — a move IS a `mice` version row | one insert per move |
| P7 sex overwritten | `sex` moved to `mice` | F→M kept as two rows with actor and reason |
