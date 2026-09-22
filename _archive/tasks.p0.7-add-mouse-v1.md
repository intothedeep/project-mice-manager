# Archive — 00.tasks P0.7 "Add mouse v1" (mock-era) — DONE 2026-09-16

Moved from `00.tasks.md` P0.7 on 2026-09-16 (docs.md §2/§3 — completed sub-task
of a still-open feature). The living doc keeps a stub. History-only.

## Task as it stood in the living doc (moved verbatim)

- [~] **Add mouse v1 (single, user-created) — IS roadmap P0-b "Record Litter"
      (2026-09-14, user), NOT a new phase.** EVERY mouse belongs to a litter
      (`mouse_meta.litter_id NOT NULL`); a manual/outside mouse = an
      `is_from_outside=true` 1-pup litter shell → ONE code path, no
      litter-less add.
      Semantics (design, 2026-09-14): a mouse = `mouse_meta` (immutable
      identity/birth: litter_id, litter_code, pup_number, dob) + `mice`
      (append-only version rows carrying MUTABLE state: sex, cage_id/slot_id,
      line_id, is_alive; creation row `prev_id=NULL` + `idempotency_key` —
      `mice` has NO origin_id col, unlike mates/tasks/notes) + `mice_genes`
      (genotype). `renderedId = head.sex + pup_number + litter_code` composed
      at READ, never stored — sexing U→M changes the label, metaId stays
      stable; genotype renders `'?'` when zero mice_genes rows.
      MOCK-ERA ordered steps (the full mouse_meta+mice+litter write sequence
      is the SERVER-era swap; DTOs unchanged):
      1. `lib/mockColonyStore.ts` — NEW subscribable colony store (mirrors
         `mockStore.ts` useSyncExternalStore); migrate the colony grid from a
         STATIC const to the live store so adds appear immediately.
      2. `addMouse` store action — appends a `MouseCell`.
      3. AddMouseDialog fields: sex (default 'U'), litterCode + pupNumber,
         dob, line, genotype (optional → '?'), cage + slot.
      4. Slot: NEW slot-label creation is ALLOWED (user 2026-09-14) with a
         GLOBAL uniqueness dedupe (slots.label is globally unique) — or pick
         an existing slot / leave unplaced.
      5. Toolbar/cage entry point wiring.
      Non-goals v1: batch litter generation, Excel import path,
      sexing/genotyping-at-add beyond the optional genotype field,
      edit-after-add, dead/sac-at-add.
      Phasing: v2 = batch "Record pups" off a delivered mate (pup_number
      1..N, sex 'U') + auto follow-up tasks (`task_offset_rules`: wean/tissue
      dates) + wean-flow update (sex/slot/genotype as append version rows) —
      the P0.6 "Register mouse/litter wizard" design above = this v2 batch
      path; v3 = pedigree (litter→mate→pups already linked) + case↔data
      linkage (Birth/delivery case → prefill Record-litter).
      AC (deliberate breakage, §19): add F9BCW into a cage → its cell appears
      in the grid immediately (no reload), genotype renders '?', existing
      mice unaffected; entering a NEW slot label that duplicates an existing
      label is rejected by the global dedupe; check-types 0 errors.

## What actually shipped (mock-era, apps/colony_client_web — 2026-09-16 session)

All five mock-era steps above shipped, PLUS the following extensions built in
the same session:

1. **Add-mouse modal overhaul:** litter-code auto-generation — pure bijective
   base-26 codec `lib/litterCode.ts` + store counter; `useLitterCodes`
   latest-first + `peekNextLitterCode` auto sentinel. **Searchable combobox**
   (`components/ui/combobox.tsx`) for litter/cage/slot: type-to-filter +
   "+ Add" inline-create, REPLACING the select+sentinel+revealed-input trio.
   New cage/slot/line inline-create with GLOBAL dedupe (cage_number, slot
   label, renderedId, lineName all globally unique).
2. **Inline cell edit:** `updateMouse` (renderedId global dedupe, sex-sync
   from id, genotypeColor nulled on genotype change); `EditableCell` atom —
   double-click a cell → inline edit; single-click highlight/drawer preserved
   via per-cell gesture + id-cell 200ms click-timer; **Sac** context-menu item
   (signal=dead, isAlive=false).
3. **Add affordance (option A):** selection-based tail `[+]` — each
   highlighted container shows an absolute-positioned `[+]` (zero reflow)
   meaning "append child" (slot→mouse, cage→slot, line→cage, grid→line);
   `tail()` predicate gates on the NODE selection path only (fixed a bug where
   `[+]` rode genotype/mate washes); structural `[+]` opens AddMouseDialog
   prefilled or the new `AddLineDialog`+`addLine`. Wider inter-line gaps.
4. **Store split:** pure `lib/colonyMutations.ts`
   `(state,counters,input)→{state,counters,result}`; `mockColonyStore.ts` is
   now a thin stateful shell; `lib/colonySeed.ts` holds seed-scan helpers
   (+`maxLineId`).

Earlier same session (logged separately in 01.status): live-mouse count badges
per line/cage/slot; pup-number `+offset` renumber policy; per-gene 2-allele
genotype-compose design (plan §3 P1).

## Still open (carried forward in the living-doc stub)

- Item 4 genotype-compose picker (per-gene 2-allele model, plan §3 P1) —
  genotyping allele-result capture / composeGenotype NOT built.
- `+ line` colour/validation polish — unverified, may remain.
- SERVER-era swap: the full mouse_meta+mice+litter one-tx write path (DTOs
  unchanged) — the P0.7 v1 task's stated server-era boundary.
- v2 batch "Record pups" + auto follow-up tasks; v3 pedigree/case-linkage
  (plan §3 P0-b phasing).
