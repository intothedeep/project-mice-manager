---
name: research-methodology
description: Procedure for running a sourced research workstream (companies, schools, labs, professors, venues, papers — any entity set). Use whenever dispatched to research and write findings to an output file with citations.
---

# Research Methodology

This skill supplies the PROCEDURE. The dispatching prompt supplies the SCHEMA: entity
type, stable-key format, column set, enums, cap, precedence order for ownership, and any
files that are off-limits to read. Do not invent schema not given in the prompt.

## 1. Write-first, append-per-row (do this BEFORE searching)

Mechanics for `rules/core.md`'s "Write-first, append-verified" rule — that file owns the
principle, this section owns the procedure.

Runs die mid-pass (rate limits, timeouts). A run that has written nothing loses everything;
a run that appended as it went loses at most its last row.

- Before the first search: create the output file. Write every section heading, every
  table's header row, and `none` placeholders for empty sections.
- Write summary counts (kept/rejected/sources/unverified) as `0` at this point.
- As each entity is verified, append its row immediately. Do not hold rows in memory to
  write later. One entity verified = one write.
- Update the summary counts LAST, once, as the final edit of the pass.
- One pass, no follow-up sweeps. If time runs out, the file is already valid and partial.

## 2. Source hierarchy

Rank every source, highest first:

1. First-party / official — the entity's own page, an official posting, a government
   filing, the paper itself.
2. Aggregator / self-reported — tag `self-reported`.
3. Everything else — tag `[LOW-CONFIDENCE]` or `anecdotal`.

Never estimate, average, or compute a number yourself — only report what a source states.
Anything you infer rather than read, mark `inference`. Cached or scratch data from a prior
run is not authoritative — cite the live URL, not the cache.

## 3. Recency

Use a window relative to today, not a hardcoded year: prefer the current and prior year.
Tag older-but-in-window items `[<year>]`. Tag anything beyond the window `[STALE]`, and
pair it with either a newer confirming source or `[UNVERIFIED]`. List-type sources (a
ranked list, a released dataset) record their EDITION, not just the access date.

## 4. Deduplication

One canonical stable key per entity (lowercase, hyphenated). Exactly one owner per entity.
When the same entity could belong to more than one bucket, the prompt's precedence order
decides; if the prompt gives none, flag the overlap rather than guessing. At dispatch,
exclude entities already owned by other parallel workstreams named in the prompt. Leave
genuinely unresolved overlaps for the merge step — do not resolve them locally.

## 5. Verification enum

Every row gets exactly one: `verified` (first-party, in-window) / `partial` (secondary
source, or out-of-window but corroborated) / `unverifiable`.

## 6. Selection log

Every entity considered — kept or rejected — gets a line. Rejected entities name the
specific rule they failed. If more entities pass than a stated cap allows, drop the ones
with the fewest open/relevant items first (jobs, positions, recent output — whatever the
prompt's schema counts). Close the file with an `open_questions:` list of anything that
could not be verified.

## 7. Citing claims

Use the `source-citation` skill for the ID format and where the source table lives. Do not
restate that format here.

## 8. Scope note

Entity type is whatever the prompt names — company, school, lab, professor, venue, paper.
Do not read files the prompt marks off-limits, even if they would answer the question
faster; use only the profile/criteria text the prompt supplies verbatim.
