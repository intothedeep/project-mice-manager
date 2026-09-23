# ARCHIVE — P0.7-b add-flow split + punch records + label projection

> History only (`rules/docs.md` §3 read guard). Archived 2026-09-23 from
> `docs/phases/p0.7.tasks.md` (§2) once P0.7-b's last implementation task closed.
> Holds the COMPLETED P0.7-b detail: steps 1, 2, 3, 4, 5, 6, 6a, 7, 8, 8b, 8c,
> 8d, 8e, 8f, 8g, 8h, 9a, 9b, 9c, 9d, 9e, 11 and 13, the superseded inline `sex`
> editor, the 10 and 12 merge notes, the deploy verdict, the closing review's
> record-only findings, and the `TASKS.md` P0.7 stub as it stood before the
> archive. NOT archived and still LIVE in the phase file: the six base P0-b
> tasks, the BACKLOG path-copy `moveMouse` item, the `NewTaskDialog`
> `SEED_COLONY` note, the `x_`-inert-in-`packages/` note, and the AC-defect
> PATTERN block (guidance for future ACs, not a record of finished work).

## SPLIT-DEFERRED note (spent — the split happened 2026-09-23)

> **SPLIT DEFERRED — decided 2026-09-22, main session; recorded so it is not
> forgotten.** This file is **1890 lines** (re-counted 2026-09-22 after the
> 6a/7/8d/8e/8f closes; it was 1671 before them and "~1140" when this note was
> first written — DRIFT rule: fix the referent when you touch it),
> far past `rules/docs.md` §1's 400 HARD line,
> and a further split WAITS until P0.7-b closes. Splitting mid-flight would move
> files out from under in-progress tasks (live 2026-09-22: 6a/7/8d/8e/8f CLOSED
> `[x]` with 11 and 13; step **6 stays `[~]`, BLOCKED-BY new 8g**; 8g, 8h and one
> backlog item OPEN), and §2
> forbids archiving a task set while any of its tasks is open. Revisit the moment
> P0.7-b's last `[ ]` closes.

## P0.7-b preamble, as it stood at the archive

**P0.7-b — Add-flow split (v1.1) + punch records (AGREED / architect-designed
2026-09-16; plan §3 P0-b v1.1, §4 punch-records bullet, §5 Q39–Q45). ORDERED —
build top-down. **DONE: steps 1, 2, 3, 4, 5, 8, 8b, 8c, 9a, 9b, 9c, 9d, and —
closed 2026-09-22 — 11 (`28d38df` + `5f4586d`) and 13 (`91bb988`, all 12 ACs).**
**DOC LAGS SOURCE, stated once so nobody reads these as unbuilt: 6a, 6, 7 and 8d
have LANDED in source 2026-09-22 (13's reviewer drove the real punch store end to
end, which is only possible if they did) but still show `[ ]`/`[~]` here — their
ticks and close notes are OWED by the pass that carries each reviewer verdict.
This pass does not tick them; every `[x]` in this file carries a hash and a
PASS.**
**NEW 2026-09-22, both OWNER-DECIDED, ONE developer does them IN THIS ORDER:
8e (`punches` becomes the SINGLE SOURCE; `MouseCell.punches` derived from it —
*"refactor this. I like this simplification."*) THEN 8f (`untagged` ALWAYS minted
and NEVER removed — *"we never delete a untagged record…"*, which CLOSES the
zero-active-punches FLOOR by construction).**
**Step 4 (the professor GATE) is CLOSED 2026-09-22 — it holds nothing:** Q39
RESOLVED 2026-09-16, Q40 DISSOLVED 2026-09-16, Q41 RESOLVED 2026-09-16, Q43 main
RESOLVED 2026-09-16 + narrow RESOLVED 2026-09-22 (*"tissue is independent each
other with toe"* — a Tissue-collection case does NOT mint a `toe` punch row),
Q44 ANSWERED 2026-09-16, Q45 RESOLVED 2026-09-18, Q42 CLOSED 2026-09-22 (owner:
`other` is a placeholder, nothing to decide). No open question gates P0.7-b any
more; task **13** (the 10+12 merge) is blocked by step 7 and task 11 only.
~~**IN FLIGHT right now (developers dispatched 2026-09-22): step 6**
(`lib/punchMutations.ts`) **and NEW step 11 — REMOVE inline cell editing.**~~
**[STALE 2026-09-22: 11 is CLOSED and step 6 has landed in source — see the
DOC-LAGS-SOURCE note above.]**
The inline `sex` editor shipped (`b5a990b`), got its reviewer pass (**PASS**,
interaction layer NOT VERIFIED), and is now **SUPERSEDED, not shipped**: the
OWNER DECIDED 2026-09-22 to remove the whole inline-edit mechanism — *"lets
simplify we will remove cell click edit feature from now on > work this first no
more cell direct update. delete all related code."* / *"we use a edit modal or
mouse drawer to update a mouse data"*. The earlier "the control goes in the
MOUSE-DETAIL DRAWER, not the grid cell" ruling was SUPERSEDED with it (the owner
reopened the surface as "edit modal **or** mouse drawer") — and **the architect
has now RULED 2026-09-22: the surface IS the DRAWER and the edit surface is
P0.7-b.** The "do not carry 'drawer' forward as decided" note written earlier
today is therefore SPENT. **MERGED 2026-09-22, OWNER DECIDED (*"merge into one
task"*): step 10 and task 12 are ONE task — NEW **13**, the mouse-editing drawer
— because they are the same surface and 12's punch row only pointed at 10's
section. 13 carries the full design of both; 10 and 12 keep merge notes at their
old positions and no checkbox.
**DELIBERATE GAP, not a regression, REAFFIRMED by the owner 2026-09-22:**
the owner chose removal FIRST as its own task and the replacement edit surface
LATER, explicitly accepting a window in which NO mouse field can be edited in the
app, and REAFFIRMED that order 2026-09-22 — no stopgap control is being restored.
SETTLED; do not re-raise it. Whoever reads this next must not "fix" that gap by
reinstating a control.
**Step 6 is now BLOCKED-BY the NEW step 6a** (punch history
contract), opened 2026-09-22 when the owner ruled **option B** on the punch
tombstone conflict: `MouseCell.punches` stays ACTIVE ROWS ONLY and a removed row
is tombstoned in a separate append-only PUNCH LOG. The in-flight step-6 work
REBASES onto 6a, it does not restart. Step 7 BLOCKED-BY 6; **task 13 BLOCKED-BY
7 + 11 only** (6a is inherited through 7; Q43-narrow was answered 2026-09-22 and
is no longer a blocker). Also open: **9e — DELETE the dead code (owner DECIDED
2026-09-22)**: `nextLitterCode`, `getMouseDetail.mock.api.ts` and the
`MouseDetail`/`GeneCall`/`HistoryEvent` types that die with it; SEQUENCED after
**6a and** step 6 (all three touch `packages/types/src/index.ts`). **CLOSED 2026-09-22: 11 — REMOVE inline cell
editing (`[x]`, `28d38df` + `5f4586d`; its AC (5) RESTATED — see the SEVENTH
OCCURRENCE in the PATTERN block) and 13 — the MOUSE-EDITING DRAWER (`[x]`,
`91bb988`, all 12 ACs; 13 shipped while 11 was still `[~]`, an L4 SEQUENCING SLIP
remedied by 11's close and recorded on both tasks).**
NEW 2026-09-22: 8d — the `untagged` punch location (`[ ]`, migration `0028` +
`PunchLocation` + `MouseSpec.initialPunchLocation` defaulting to `untagged` +
fixture mice; SEQUENCED AFTER 6a and 6).** Plus one recorded-only, no-AC item at the end (`NewTaskDialog` importing
`SEED_COLONY`), which the system-architect owns. Mock-era, no server writes.**

## Tasks (as closed)

- [x] 1. Migration `0026_punches.sql` (0025 = current highest): `punches(id,
      mouse_id FK → mouse_meta(id) — NOT `mice`, which holds version rows;
      punch_location TEXT CHECK IN ('toe','ear','other'); effective_at — when
      the punch physically happened, DISTINCT from created_at = tx-start time;
      actor_id FK users(id); note; created_at; updated_at; deleted_at)`;
      partial index `(mouse_id) WHERE deleted_at IS NULL`; NO UNIQUE on
      (mouse_id, location); NO DB trigger. Add = INSERT; remove = set
      `deleted_at` (§22.4). Then regenerate `packages/db/SCHEMA.md` + ERD via
      `packages/db/scripts/{schema-doc,erd}.sh`.
      AC (deliberate breakage, §19): INSERT with punch_location='nose' is
      rejected by CHECK; mouse_id pointing at a `mice.id` that is not a
      `mouse_meta.id` is rejected by FK; two live rows with the same
      (mouse_id, 'toe') BOTH insert; an UPDATE setting deleted_at succeeds and
      the row drops out of the partial index; SCHEMA.md regenerated shows the
      table + partial index.
- [x] 2. `@repo/types`: `PunchLocation` (`'toe' | 'ear' | 'other'`), `PunchRef`
      (id, location, effectiveAt, note?), `MouseCell.punches: PunchRef[]`
      (ACTIVE rows only). `MouseCell` does NOT gain a stored label — the label
      stays a read-time projection (plan §3 P0-b `renderedId` rule). Seed
      fixtures (`lib/colonySeed.ts` / getColonyGrid mock) get exactly one
      `toe` punch per mouse.
      AC: check-types 0 errors; every seed mouse has `punches.length === 1`
      with location 'toe'; no DTO gains a label/renderedLabel/mouseLabel field.
- [x] 3. **BLOCKER FIX** — `lib/litterCode.ts:71` `extractLitterCode`: today
      `/^[MFU]\d+([A-Z]{3,5})$/` rejects BOTH `M6BFAe` and `M6eBFA`, so every
      ear-punched mouse is silently dropped from `useLitterCodes` and from
      `advanceLitterCounter` — the auto litter code can then COLLIDE with a
      real one. Tolerate `+offset` in the pup-number position and `e` in
      EITHER position. Unblocked NOW — do FIRST among code changes, before any
      punch renders.
      AC: `extractLitterCode` returns 'BFA' for each of `M6BFA`, `M6BFAe`,
      `M6eBFA`, `M6+10eBFA` and `null`/undefined for junk (`=>`); with a colony
      whose ONLY BFA mouse is ear-punched, `peekNextLitterCode` yields BFB,
      never BFA; check-types 0 errors.
- [x] 4. **GATE — professor (a message, not work) — CLOSED 2026-09-22, it holds
      nothing.** It carried plan §5 Q39–Q45; every item is now answered or
      withdrawn: Q39 (`e` position) RESOLVED 2026-09-16 — mid position abolished;
      Q40 (both positions at once) DISSOLVED 2026-09-16 by the Q39 answer;
      Q41 (two ear punches) RESOLVED 2026-09-16 — `ee`, the suffix is a COUNT;
      Q43 (tissue re-clip vs toe punch) RESOLVED 2026-09-16 (main) and 2026-09-22
      (narrow, owner: a Tissue-collection case does NOT mint a `toe` punch row);
      Q44 (cage-column section headers) ANSWERED 2026-09-16 — visual device, no
      model layer; Q45 (`+offset` storage home) RESOLVED 2026-09-18 — migration
      0027 `pup_number_offsets` + `MouseCell.pupOffsets`; Q42 CLOSED 2026-09-22
      (owner: `other` is a placeholder, nothing to decide).
      NOT a remainder of this gate, recorded so it is not lost: Q39 still carries
      a small UI-placement recommendation (WHERE the "transferred then tagged"
      colour renders — the `e` glyph, not the cell). That is a rendering choice
      for whoever builds the glyph, not a professor question, and it never gated
      anything here.
- [x] 5. `lib/mouseIdentity.ts` — pure `buildMouseLabel(parts)` (was spec'd as
      `composeMouseIdentity`; shipped name matches the `mouseLabel` DTO field). Grammar
      (REVISED 2026-09-16, Q39 RESOLVED — the mid position is ABOLISHED, there
      is NO `earSuffixPosition` parameter): `sex · pupNumber · [+offset] ·
      litterCode · [e…]`. `toe` renders NO suffix; each ACTIVE `ear` punch row
      renders one `e`, so both ears → `ee` (Q41). "Transferred THEN tagged" is
      a DERIVED COLOUR on the `e`, not a position — recommend colouring the
      glyph only, never the cell (the genotype colour already fills it).
      `.N` stays outermost in `composeMouseLabel` → `M6BFAe.2` needs no change
      to `lib/mouseLabel.ts`. COMPOSE emits tail only; PARSE must still accept
      the legacy mid form (`F10+1earAYY`) — hand-written cage cards and the
      workbook contain it. NOT blocked by the GATE any more.
      AC: `M6BFA`, `M6BFAe`, `M6BFAee`, `M6+10BFAe` reproduced byte-exact from
      fixture inputs; no store/Date access (pure); a mouse with only a `toe`
      punch renders identically to a mouse with zero punches; removing one of
      two ear punches shortens the label by exactly one character.
      DEPENDS-ON: `+offset` has no storage home yet (plan §5 Q45) — the
      `M6+10…` forms cannot render from stored data until that lands.
      DONE 2026-09-18: `+offset` storage landed (0027 `pup_number_offsets`,
      `MouseCell.pupOffsets`). AC verified by probe: all 4 forms byte-exact +
      `M6+10+20BFA`, toe-only == zero punches, 2→1 ear = −1 char; all 21 mock
      fixtures' `mouseLabel` == `buildMouseLabel(parts)` (fixed metaId 201
      `F10BEVe` — its `e` had no ear punch row; added punchId 22). Unused
      `effectivePupNumber` dropped (re-add with the transfer-offset rule).
- [x] 6a. **DONE 2026-09-22 (`c68dd5a`), reviewer PASS — ALL criteria met.** Verified at HEAD
      `23474e7` by a CLOSING review that drove the real compiled pure layer with
      41 probes (including 400 randomised add/remove operations); the LANDING
      commit for this task is not recorded here — the close pass had no hash for
      it, and inventing one would be worse than the gap. Criteria as met:
      `MouseCell.punches`' doc-comment says ACTIVE rows only and cites plan §4;
      **`grep deletedAt packages/types/src/grid.ts` = 0**; `PunchRow` exists,
      carries `deletedAt` and is re-exported from `packages/types/src/index.ts`
      (it landed as `PunchHistoryEntry` and was renamed to `PunchRow` by the
      2026-09-22 vocabulary rename, `9c9e4fd`/`da1e73b`); the grid.ts header
      sentence names history DTOs in the SNAKE form; the `maxPunchId` comment
      exists and names id-reuse as the reason; `deletedAt` greps 0 in
      `lib/mouseIdentity.ts`; check-types + lint 0.
      **Punch history contract — NEW 2026-09-22, OWNER DECIDED option B.**
      Owner's words, verbatim, so attribution sits on the task and not only in
      STATUS: *"B: correct. because we can update punch record's deleted_at."*
      THE CONFLICT THIS CLOSES: four places already said the grid payload is
      ACTIVE ROWS — `p0.7.plan.md:34` (`punches: PunchRef[]` **active rows
      only**), `0026_punches.sql`'s partial index `WHERE deleted_at IS NULL`
      (which only makes sense if the payload is active rows),
      `packages/types/src/grid.ts`'s header ("No version/prev_id/deleted_at leak
      to the client"), and `rules/core.md` ("never hard-DELETE … mask at read").
      Step 6's in-flight implementation flipped `MouseCell.punches` to carry
      tombstones, contradicting all four. B RESTORES the existing contract; it
      does NOT change it — **plan §4 stays EXACTLY as written, do not edit it.**
      A removed punch is tombstoned in an append-only PUNCH LOG and served by its
      own selector, mirroring how the drawer already gets case history via
      `useTaskLog()`.
      BASELINE — state it so nobody later reads this as deleting a shipped field:
      `PunchRef.deletedAt` and the `MouseCell.punches` tombstone comment exist
      ONLY IN THE UNCOMMITTED WORKING TREE as of 2026-09-22 (`M
      packages/types/src/grid.ts`). Nothing committed carries them.
      SCOPE — FIVE pieces, nothing else:
      (a) `packages/types/src/grid.ts` header: an ADDITIVE sentence saying that
      HISTORY surfaces are separate, explicitly-named DTOs/selectors and that
      `deleted_at` appears only there. **Write the SNAKE form `deleted_at` (as the
      existing header already does), never `deletedAt`** — step 6's AC greps the
      camel form in this file and must stay falsifiable.
      (b) `MouseCell.punches` reverted to ACTIVE-ONLY wording, citing plan §4.
      (c) `PunchRef.deletedAt` REMOVED from the grid DTO.
      (d) a NEW `PunchRow` DTO in `packages/types` carrying `deletedAt`
      — **in its OWN file under `packages/types/src/`, NOT in `grid.ts`** (same
      reason as (a): `grid.ts` must be able to grep clean).
      (e) the store state shape `{ grid, punches }`, plus a comment on
      `colonySeed.ts maxPunchId` recording WHY it counts EVERY punch row
      INCLUDING tombstones: ids are never reused, so a counter seeded from active
      rows alone would re-issue the id of the highest punch the moment that punch
      is removed. CONSTRAINT, not a design (the architect owns the how): today
      `maxPunchId` scans `m.punches`, which under B is active-only — the seed
      counter must read the source that holds EVERY row including tombstones
      (under B that is `punches`), or the mandated comment is false the day it
      is written.
      (f) `lib/mouseIdentity.ts` `mouseLabelOf`'s `deletedAt` filter comes OUT.
      **It belongs HERE, not in step 6** — it is the mechanical consequence of
      (c): the moment `PunchRef.deletedAt` is gone the filter does not typecheck,
      so leaving it to a step BLOCKED-BY this one would make 6a's own
      check-types criterion unmeetable. (Under the active-only contract the
      filter is dead code anyway.)
      BLOCKS: 6 (and therefore 7 and 13). BLOCKED-BY: nothing.
      AC: `MouseCell.punches`' doc-comment says ACTIVE rows only and cites plan
      §4; grep `deletedAt` under `packages/types/src/grid.ts` returns **0**
      (baseline: the uncommitted tree has 2 matching lines — the
      `PunchRef.deletedAt` field block and `MouseCell.punches`' tombstone
      comment);
      `PunchRow` exists, carries `deletedAt`, and is re-exported from
      `packages/types/src/index.ts`; the grid.ts header sentence names history
      DTOs and uses the snake form; the `maxPunchId` comment exists and names
      id-reuse as the reason; **grep `deletedAt` in `lib/mouseIdentity.ts`
      returns 0 — `mouseLabelOf` reads `punches` directly**; check-types + lint
      0 errors across the monorepo.
- [x] 6. **DONE — CLOSED 2026-09-23 (landed `96f5a8d`), reviewer PASS.** Its ONE
      open clause — "every other mouse is reference-equal" — was UNMET from 8e
      (`20e020d`) until **8g** (`0a95e34`) restored it; the reviewer re-verified
      EVERY other step-6 criterion PASS in the same run, so this task closes on
      8g's landing with NO criterion carried forward (§7: no sibling task owed).
      HISTORY, kept because it explains the gap between the landing commit and
      the close: the clause HELD at `96f5a8d`, where `addPunch` mapped
      `m.metaId === input.metaId ? { ...m, punches } : m`; 8e replaced that with
      `projectPunches`, which spread EVERY line, cage, slot and mouse
      unconditionally. **8e did not decide this** — its shape text says
      `grid.punches` "becomes a PROJECTION", never "rebuild every object" — so 8e
      was never un-ticked and this clause was never RETIRED (RETIRED is the device
      for a CLOSED task: 8b→11, 8d→8f). It kept its checkbox until 8g closed it.
      **IN PROGRESS — developer dispatched 2026-09-22; REBASED onto 6a
      2026-09-22 (owner option B).** The in-flight work is NOT
      wasted and does not restart: `punchMutations.ts`'s structure, the
      pure-layer / no-`Date` discipline, the INJECTED `deletedAt` and the
      no-op-on-unknown-id behaviour all SURVIVE the rebase; what changes is
      WHERE the tombstone lands (the punch log, not `MouseCell.punches`). NOT
      CARRIED HERE — `lib/mouseIdentity.ts` `mouseLabelOf`'s `deletedAt` filter
      also has to go, but it is **6a's scope (f)**: under the active-only
      contract it is dead code, and 6a's own (c) makes it untypeable, so it
      cannot wait for a step that 6a blocks.
      `lib/punchMutations.ts` — pure `addPunch` / `removePunch` (NEW module;
      NOT added to `colonyMutations.ts`). **Line-count history, corrected
      2026-09-22:** that file was 485 lines before 8b and is **307** after
      (`da51a75`); the "309 lines" written here 2026-09-16 and the "485 … past the
      400 HARD line" written earlier today are both stale. The NEW-module
      requirement STANDS on SRP alone — punch mutations are a different
      responsibility from the add/update mutations, and the line count was never
      the reason. **Remove = tombstone the RECORD, never hard-delete it —
      SCOPED 2026-09-22, because "never splice" read as absolute and that reading
      is what produced the schema flip.** The tombstone lives in the append-only
      punch LOG (`deletedAt` set there); splicing the row out of the VIEW
      (`MouseCell.punches`) is exactly what `rules/core.md`'s "mask at read"
      means here, and is REQUIRED, not forbidden.
      BLOCKED-BY: **[AS OF the morning of 2026-09-22 — SUPERSEDED the SAME DAY
      by option B: BLOCKED-BY 6a, see this task's head. The Q40 reasoning below
      is kept because it is WHY 8c ran first, not because it is the current
      blocker.] nothing — the old `GATE (Q40 …)` clause is STALE and is
      corrected here 2026-09-22.** Q40 (both `e` positions at once → one extra
      column?) was DISSOLVED 2026-09-16 by the Q39 resolution (plan §5 item 40),
      so no open question decides the record shape. SEQUENCED after 8c: `addPunch`
      allocates from `Counters.nextPunchId`, which 8c lands (creation needs it
      first). That is an ordering, not a gate. **SEQUENCING SATISFIED 2026-09-22:
      8c shipped (`4d5870e`) and `Counters.nextPunchId` exists — `addPunch` reads
      it, defines no counter of its own.**
      **AC — REWRITTEN 2026-09-22. The previous AC IS THE DEFECT** (see SIXTH
      OCCURRENCE in the PATTERN block below): it said the removed row "survives
      with deletedAt set" in a pure function whose entire output is `ColonyGrid`,
      where the only place a row can survive is `MouseCell.punches` — so the AC
      silently mandated the schema change it was never authorised to make. For
      the record: the developer had no other reading available and FLAGGED the
      contradiction rather than hiding it; that was correct on both counts.
      AC: `addPunch` returns a colony where exactly ONE mouse has
      `punches.length + 1` and every other mouse is reference-equal
      **[MET 2026-09-23 by 8g (`0a95e34`) — reuse verified at ALL FOUR levels
      (mouse, slot, cage, line) and asserted on COUNTS, so a "mouse reused but
      slot rebuilt" defect could not hide. Broken by 8e (`20e020d`) between
      `96f5a8d` and 8g; never retired, never reworded]**, AND one row
      is appended to `punches`; `removePunch` leaves that mouse with one FEWER
      entry in `punches` WHILE `punches` holds the same `punchId` with
      `deletedAt` set; `punchId` is never reused after a removal (remove the
      highest id, then add — the new id is strictly greater); inputs are never
      mutated; an unknown or already-removed punch id is a no-op returning the
      input unchanged; grep `deletedAt` under `packages/types/src/grid.ts`
      returns **0** (this is the falsifiable guard that option B actually landed
      — keep it); check-types + lint 0 errors.
- [x] 7. **DONE 2026-09-22 (`9748ab1`), reviewer PASS — ALL criteria met.** Verified at HEAD
      `23474e7` by the same closing review (41 probes, 400 randomised add/remove
      operations, real compiled pure layer); landing commit not recorded — see
      6a's close note for why no hash is guessed. Criteria as met: seed equality
      holds AS AN EQUALITY — **44 active rows == the summed fixture
      `punches.length`** — with ZERO seeded rows carrying `deletedAt`; the store
      defines NO punch counter of its own (`nextPunchId` has exactly one
      definition site, 8c's); both wrappers are ONE LINE each; `usePunches`
      returns a removed entry with `deletedAt` while the mouse's active
      `punches` no longer holds that `punchId`.
      **L4 SEQUENCING NOTE, stated not papered over:** 7 closes while its
      BLOCKED-BY (step 6) stays `[~]`. 7 wraps the mutations step 6 SHIPPED; 6's
      one open clause is 8g's, not 7's — nothing in 7's AC depends on it.
      `lib/mockColonyStore.ts` — two thin wrappers over step 6 (store stays a
      thin shell). **AMENDED 2026-09-22: this step NO LONGER claims the
      `nextPunchId` counter.** 8c lands the counter (`Counters.nextPunchId` +
      the `maxPunchId(SEED_COLONY) + 1` seed) because CREATION needs it first;
      step 7 CONSUMES it unchanged and adds no counter of its own. Two
      checkboxes must not own one deliverable. BLOCKED-BY: 6.
      **SCOPE GROWS 2026-09-22 (owner option B, step 6a):** this step also owns
      (a) SEEDING `punches` from the `SEED_COLONY` fixtures and (b) a
      `usePunches(metaId)` selector MIRRORING the existing `useTaskLog` — under
      B the drawer's punch history comes from the log, never from
      `MouseCell.punches`.
      AC: two consecutive `addPunch` calls yield distinct ids; the store defines
      NO punch counter of its own (`nextPunchId` is read from the counters 8c
      seeded — grep shows exactly one definition site); subscribers re-render
      exactly once per call; no punch logic lives in the store file;
      **seed equality (assert the equality, NOT a literal — the seed max moves):
      `punches.length` equals the SUM of `punches.length` over every mouse in
      `SEED_COLONY`, and ZERO seeded entries carry `deletedAt`**; `usePunches`
      on a mouse with one removed punch returns that entry with `deletedAt` set
      while that mouse's `punches` no longer contains that `punchId` (assert
      against the FIELD — a label assertion is ambiguous here, since removing an
      `ear` punch does change the label and removing a `toe` punch does not).
- [x] 8. Add-flow split — replace today's `addMouse` + `addLine` with the FOUR
      mutations (plan §3 P0-b v1.1): `addLine(lineName, cageNumber, slotLabel,
      mouse?)` → line+cage+slot(+mouse); `addCage(lineId, cageNumber,
      slotLabel, mouse?)` → cage+slot(+mouse); `addSlot(cageId, slotLabel,
      mouse?)` → slot(+mouse); `addMouse(cageId, slotId, mouse)` → mouse. Each
      creates what its name says and fills required descendants DOWN TO SLOT;
      mouse is optional except in `addMouse`. `addMouse` is the SOLE minter of
      the implicit `toe` punch (it is the sole `metaId` allocator, so
      once-and-only-once is structural — NOT a DB trigger; a future import path
      must not double-write it). Retire `AddMouseInput.newCageNumber` /
      `newSlotLabel`. Wire each grid `[+]` rail (line/cage/slot/mouse —
      `TailPlus` in `ColonyGridView.client.tsx`) to ITS OWN function, no
      branching at the call site. Cage number is SUGGESTED as `max+1` but
      editable. Pulls `colonyMutations.ts` back under 300 lines.
      AC: `addLine(...)` yields exactly 1 cage holding exactly 1 slot (the
      `cages: []` at `colonyMutations.ts:300` is gone); `addSlot` without
      `mouse` yields `mice: []` (an EMPTY slot renders, no crash); every mouse
      created via `addMouse` has exactly one 'toe' punch and no other code path
      creates a punch; grep `newCageNumber|newSlotLabel` across
      `apps/colony_client_web` returns 0 hits; `colonyMutations.ts` < 300
      lines; each of the four `[+]` rails calls exactly one mutation; the cage
      dialog pre-fills `max+1` and accepts an edited number; check-types +
      lint 0 errors.
      **AC PARTIALLY MET — TWO criteria, recorded 2026-09-22.** Every other
      criterion above shipped and is verified. Step 8 stays `[x]` because its
      four mutations shipped and un-ticking would hide that; each unmet
      criterion is carried forward as its own task (§7).
      (i) `colonyMutations.ts < 300 lines` was NOT met at close (386 lines
      then, per STATUS 2026-09-16) and was deferred in a STATUS clause ("step 9
      gutting updateMouse should get it there") with NO task carrying it. 9a did
      not deliver it: the file is 485 lines today (488 before 9b) and 9a REMOVED
      ~33 — it is not the cause. → carried forward as **8b**.
      (ii) "every mouse created via `addMouse` has exactly one 'toe' punch and
      no other code path creates a punch" was NEVER IMPLEMENTED — confirmed
      empirically 2026-09-22 by a reviewer running the real `addMouse(...)`,
      which returns a mouse with `punches: []`; no `PunchRef`-creating code
      exists anywhere outside the mock fixtures. WHY IT HID: step 5's AC
      requires "a toe-only mouse renders identically to a zero-punch mouse", so
      the label projection masks a missing toe punch BY CONSTRUCTION — no
      rendering check can ever catch it, only direct `punches` inspection can.
      That is why several reviews passed over it. → carried forward as **8c**.
- [x] 8b. **DONE 2026-09-22 (`da51a75`), reviewer PASS.** Shipped: the file split
      along its responsibility seams into `colonyMutations.ts` **307** lines +
      NEW `updateMouse.ts` (107) + NEW `colonyMutationHelpers.ts` (114);
      behaviour-neutral, no signature or call-site change; the
      `editable-cell.tsx:11-12` stale-comment fold-in is done.
      **AC MET — via its SECOND branch, recorded here so it is not re-litigated.**
      The AC reads "`wc -l lib/colonyMutations.ts` < 300, **OR** this task carries
      a written justification and the file is < 400". 307 is NOT under 300 and
      307 IS under 400, so the second branch is the one that is satisfied.
      THE WRITTEN JUSTIFICATION (this is it): each add mutation's INPUT TYPE is
      coupled to the function directly below it, so lifting the four add
      mutations apart to chase the last 7 lines would cut exactly the artificial
      seam this task warned against. `updateMouse` and the shared helpers were the
      real seams and they left. Do not reopen this for 7 lines.
      CONSEQUENCE for 8c's AC (5), which names "the file that defines `addMouse`":
      the add mutations STAYED in `colonyMutations.ts` per that justification, so
      that file is still the one-and-only mint site the AC points at.
      Original scope, for the record: Split `lib/colonyMutations.ts` — carries step 8's unmet criterion (i),
      `< 300 lines` (485 lines 2026-09-22, after 9b; `rules/development/code.md`
      §Structure: 300 soft, 400 HARD review line — this is past the hard line).
      Split along responsibility seams (the four add mutations vs `updateMouse`
      vs the shared helpers), or write in this task why a seam would be
      artificial. Behaviour-neutral: no signature or call-site change.
      UNBLOCKED 2026-09-22: its blocker 9b is DONE (`8ae117e`) — the
      creation-site and edit-site label writes it would have split around are
      gone.
      INTERACTION WITH 8c — **RULED 2026-09-22: 8c FIRST, then 8b.** 8c adds the
      toe-punch mint to `addMouse`, which lives in this same file; doing the
      content change before the split means the split moves finished code and
      stays behaviour-neutral, and 8c's anchors (the `punches: []` line and the
      comment above it) are still where 8c's text says they are. 8c is blocked by
      nothing, so nothing is gained by inverting the order.
      Fold in while the file's neighbourhood is open: the stale comment at
      `components/ui/editable-cell.tsx:11-12` still cites "the click-timer vs.
      dblclick conflict on the id cell", which 9a removed when the label cell
      went read-only — delete that sentence (comment-only, no behaviour).
      AC: `wc -l lib/colonyMutations.ts` < 300, or this task carries a written
      justification and the file is < 400; no symbol exported by the old file
      loses a consumer (no unused exports — quality gate); grep
      `click-timer|dblclick conflict` in `components/ui/editable-cell.tsx`
      returns 0; check-types + lint 0 errors; the grid still adds a line, cage,
      slot and mouse and still edits genotype + DOB inline.
      **NOTE 2026-09-22 (DRIFT remedy, not a re-opening): the last clause —
      "still edits genotype + DOB inline" — was TRUE at close (`da51a75`) and is
      RETIRED by task 11, which removes inline cell editing entirely. Do NOT
      re-run it; 8b stays `[x]`.**
- [x] 8c. **DONE 2026-09-22 (`4d5870e`), reviewer PASS. AC MET IN FULL —
      including the owner's headline formulation.** VERIFIED: 25 mice in the
      colony after creating through the store, NONE with zero punches; all 26
      `punchId`s pairwise DISTINCT; the first minted id is **23**, exactly one off
      the seed max of 22; every minted punch is `'toe'` with a non-empty ISO
      `effectiveAt`; `addSlot` without a mouse mints nothing and leaves
      `nextPunchId` unchanged; `'toe'` greps to exactly ONE non-fixture file (the
      `addMouse` definition site — still `lib/colonyMutations.ts` after 8b); the
      divergence comment is gone. §19 DELIBERATE BREAKAGE done: reverting the mint
      reproduced the failure on exactly the four newly created mice, and restoring
      it passed again.
      Original scope, for the record: Mint the implicit `toe` punch in `addMouse` — carries step 8's unmet
      criterion (ii). CONFIRMED EMPIRICALLY 2026-09-22: a reviewer ran the real
      `addMouse(...)` and got a mouse with `punches: []`; no `PunchRef`-creating
      code exists outside the mock fixtures, so "the SOLE minter of the implicit
      toe punch" was never built. `addMouse` is the sole `metaId` allocator, so
      minting there keeps once-and-only-once STRUCTURAL (no DB trigger — a
      future import path must not double-write it).
      MASKED BY CONSTRUCTION: step 5's AC requires a toe-only mouse to render
      identically to a zero-punch mouse, so NO rendering check can detect this;
      only direct inspection of `punches` can. Write this task's AC against the
      field, never against a label.
      INTERIM DIVERGENCE (live today): seed fixtures carry one `toe` punch each,
      user-created mice carry none, and `MouseCell.punches` is REQUIRED since
      9b. The correct-but-unowned comment in `lib/colonyMutations.ts` above
      `punches: []` (opens "Toe-punch minting on creation is step 8's own AC,
      still unmet" — `:110-112` today, but 8b may move it, so the PHRASE is the
      locator, not the line) says exactly this; per `rules/docs.md` §7 that
      comment is a deferral in code form and is legitimate ONLY because this
      task now exists — it goes away when this task closes.
      **BLOCKED-BY: NOTHING (RULED 2026-09-22 — this REVERSES the earlier "OPEN,
      architect owns it" note and step 6's stale gate clause).** Reasoning,
      recorded because it contradicts what the file used to imply: step 6 named
      `BLOCKED-BY: GATE (Q40 …)`, but **Q40 was DISSOLVED 2026-09-16** (plan §5
      item 40 — the Q39 resolution abolished the mid `e` position, so "both
      positions at once" cannot arise and no extra column is needed). Of the
      still-open gate questions NONE touches a punch-id counter: **Q42** (since
      CLOSED 2026-09-22 as a placeholder) never reached the counter, and creation
      only ever mints `toe`; **Q43's**
      open remainder was whether a Tissue-collection case ALSO mints a toe row —
      a DIFFERENT mint site, ANSWERED NO by the owner 2026-09-22, which does not
      disturb this ruling. Step 4's minimum
      condition ("nothing starts until Q39 is answered") is met. 8c therefore
      lands `Counters.nextPunchId` itself; steps 6/7 consume it.
      SEPARATE, never gated this task: plan §5 Q43's narrower sub-question — does
      a Tissue-collection case ALSO mint a `toe` punch row? — gated task 13
      (formerly step 10) and was ANSWERED NO by the owner 2026-09-22. 8c covers
      the creation path only, and is unaffected either way.
      SCOPE — THREE PIECES, nothing else:
      (a) `lib/colonySeed.ts`: `maxPunchId(grid)` beside `maxMetaId` (`:11`),
      same shape — scan `m.punches`, return the highest `punchId`. Seed max is
      **22**, so the first minted id is **23**.
      (b) `lib/colonyMutations.ts`: add `nextPunchId: number` to `Counters`
      (`:28`); `addMouse` builds the cell with a `toe` punch and returns
      `nextPunchId: nextPunch + 1` exactly as it already returns
      `nextMetaId: nextMeta + 1` — anchor on that RETURN PHRASE, not a line
      number (`:179` is `const nextMeta = counters.nextMetaId`, the read, not the
      return). DELETE the `punches: []` line and the
      stale three-line comment above it — anchor on its phrase "Toe-punch minting
      on creation is step 8's own AC", NOT a line number (8b may move it, and 8c
      runs first).
      (c) `lib/mockColonyStore.ts`: `nextPunchId: maxPunchId(SEED_COLONY) + 1` in
      the counter seed block. The store stays a thin shell — no punch logic.
      DATE INJECTION — say it explicitly or a developer will guess:
      `PunchRef.effectiveAt` is REQUIRED (`packages/types/src/grid.ts`) and the
      mutation layer is PURE (no `Date`). Add `punchEffectiveAt: string` (ISO) to
      `MouseSpec` (`colonyMutations.ts:38`) so it rides the existing `mouse?`
      param — **no change to any of the four mutation signatures**; callers pass
      `TODAY` from `@/lib/dueDates` (`:5`, already imported by
      `AddMouseDialog.client.tsx:20`). Do NOT reuse `spec.dob`: a mouse entered
      weeks after birth would get a toe punch dated to its birth, and
      `effective_at` means WHEN THE PUNCH PHYSICALLY HAPPENED (step 1). The
      shipped field is `punchId`, not `id` — step 2's text says `PunchRef (id, …)`
      and is stale.
      AC — **headline criterion, the owner's own formulation (2026-09-22), kept
      verbatim because it is simpler and harder to slip past than "exactly one
      toe punch":**
      > every mouse in the colony has at least one punch, therefore every mouse
      > has a punchId
      Every criterion below inspects the `punches` FIELD, never a rendered
      string — step 5's AC requires a toe-only mouse to render identically to a
      zero-punch mouse, so the projection masks this defect BY CONSTRUCTION and
      no rendering check can ever catch it.
      AC (direct field inspection, §19):
      (1) HEADLINE — after creating SEVERAL mice THROUGH THE STORE (a line, a
      cage, a slot-with-mouse and a bare `addMouse`, not a single call), walking
      the WHOLE colony shows every mouse has `punches.length >= 1` and every
      punch has a `punchId`. Colony-wide and after-the-fact: a per-call check
      would pass even if a second path also minted.
      (2) all `punchId`s in the whole tree are PAIRWISE DISTINCT (this is the
      criterion that catches a second allocator).
      (3) each minted punch has `location === 'toe'` and a non-empty ISO
      `effectiveAt`.
      (4) `addSlot(cageId, label)` with NO mouse mints nothing and leaves
      `nextPunchId` UNCHANGED.
      (5) exactly ONE mint site: grep `['"]toe['"]` across
      `apps/colony_client_web` SOURCE, excluding `.next/` and excluding
      `apis/*.mock.api.ts` (the fixture legitimately carries 21 occurrences),
      returns hits in exactly ONE file — the file that defines `addMouse`
      (`lib/colonyMutations.ts` today; name the file by its `addMouse`
      definition, since 8b may move it). VERIFIED 2026-09-22: today the fixture
      is the ONLY source file with a `'toe'` literal, so this AC is falsifiable,
      not vacuous.
      (6) grep `Toe-punch minting on creation is step 8's own AC` repo-wide
      returns 0 — the divergence comment is deleted (phrase, not line number).
      (7) §19 DELIBERATE BREAKAGE: delete the mint from `addMouse`, re-run
      criterion (1), WATCH IT FAIL (a user-created mouse comes back with
      `punches: []`), restore the mint, watch it pass.
      (8) check-types + lint 0 errors.
- [x] 8d. **DONE 2026-09-22 (`7d94b06`), reviewer PASS.** Verified at HEAD `23474e7` by the
      closing review; landing commit not recorded (see 6a). Two of its criteria
      are **RETIRED, not passed** — AC (3)'s "creating with `toe` chosen yields
      `toe`" clause and AC (6)'s "no location literal in `buildMouseCell`" are
      ACTIVELY CONTRADICTED by the shipped 8f design (creation is always
      `untagged`, minted from a literal at one site), and they are already
      annotated RETIRED in place below — they were NOT re-run and are NOT
      claimed as passes. **AC (1) could not be re-run:** there was no live
      Postgres this session, so `0028`'s CHECK behaviour was established by
      READING the migration file, not by a probe — recorded as file-read, and
      the §19 rollback-tx probe stands owed if the owner wants it proven
      against a live DB. Everything else passed on the field, per its own
      wording.
      **`untagged` punch location — OWNER DECIDED 2026-09-22 (ADOPT + the
      default). NEW 2026-09-22.** Owner verbatim: *"when babies came to us, they
      might not have a tag, so we can create a punch with new enum type:
      untagged?"* / *"add this type into enum for punchs table."* **The creation
      default is now `untagged`, not `toe`.**
      ~~`untagged` is an ORDINARY FOURTH VALUE of `punch_location` — nothing
      special: no sentinel semantics, no coexistence rule, no auto-tombstone, no
      unique index, no nullability change.~~ **[SUPERSEDED 2026-09-22 BY THE
      OWNER, as to the COEXISTENCE clause only — see task 8f. `untagged` is
      ALWAYS minted at creation, COEXISTS with real tags, and is NEVER
      tombstoned. The rest of the sentence still holds: no unique index, no
      nullability change, no DB trigger. 8d STAYS `[x]`-eligible on what it
      shipped; 8f carries the change.]** `effective_at` = when the observation
      was true; `actor_id` = who recorded it.
      NOT TOUCHED: step 6's `+1` AC (nothing is injected into its pure
      `addPunch`); `0026_punches.sql:24-25` (the deliberately ABSENT
      `UNIQUE (mouse_id, location)`); 6a scope (e)'s `maxPunchId` comment.
      **SEQUENCED AFTER 6a AND step 6 — an ORDERING, not a gate.** It edits
      `packages/types/src/grid.ts`, which 6a rewrites and step 6 is in flight
      beside. (9e is sequenced after 6a + 6 for the same reason; no 8d↔9e order
      is implied.)
      SCOPE — FOUR PIECES, nothing else:
      (a) NEW `packages/db/migrations/0028_punch_location_untagged.sql` (**0027 is
      the current highest — verified 2026-09-22**): DROP and re-ADD the
      `punch_location` CHECK as `('toe','ear','other','untagged')`.
      **VERIFY THE CONSTRAINT NAME FIRST, do not assume it** — `SCHEMA.md` lists
      INDEXES only, not check constraints (verified: zero hits for the name), so
      run `SELECT conname FROM pg_constraint WHERE conrelid='punches'::regclass
      AND contype='c';` first; EXPECTED `punches_punch_location_check`. Then
      regenerate `SCHEMA.md` + ERD with `packages/db/scripts/{schema-doc,erd}.sh`.
      (b) `packages/types/src/grid.ts`: `PunchLocation` gains `'untagged'`
      (`:33` today). `PunchRef` is UNCHANGED.
      (c) `lib/colonyMutationHelpers.ts`: `MouseSpec` gains
      `initialPunchLocation: PunchLocation`, riding the existing `mouse?` param
      EXACTLY as `punchEffectiveAt` already does (`:36`) — **no change to any of
      the four mutation signatures.** `buildMouseCell` (`:45`) mints
      `location: spec.initialPunchLocation`; the `'toe'` literal LEAVES that
      function, and the comment above it (`:52-54`, "mints an implicit 'toe'
      punch") is REWORDED in the same diff so it neither claims an unconditional
      toe mint nor leaves a quoted literal behind. `addMouse` remains the SOLE
      mint site — that part of 8c's design is unchanged.
      `AddMouseDialog.client.tsx` gains a punch-location select **defaulting to
      `untagged`**; it is the ONLY `MouseSpec` construction site (verified
      2026-09-22: `:331`, the single object literal carrying `punchEffectiveAt`),
      so no other caller needs the new field.
      (d) `apis/getColonyGrid.mock.api.ts`: the 21 existing `toe` rows STAY; ADD
      1–2 `untagged` fixture mice with NEW punch ids, so the fourth value has live
      seed coverage. **This moves the seed `maxPunchId` off 22** — 8c's closed
      record says "seed max 22 → first minted 23" AS OF ITS CLOSE and is history;
      step 7's AC already asserts the EQUALITY (`punches.length` == sum of
      `punches.length`), NOT the literal, so nobody re-hardcodes 23.
      RENDERING: `toe` renders nothing. `untagged` renders nothing.
      `lib/mouseIdentity.ts` needs **ZERO** changes (it counts only
      `location === 'ear'`).
      ~~STILL OPEN, not decided here: task 13's zero-active-punches FLOOR (may a
      mouse reach zero ACTIVE punches at all?).~~ **[CLOSED 2026-09-22 BY THE
      OWNER — there IS a floor, and it is structural: the always-minted,
      never-tombstoned `untagged` row means a mouse can never reach zero active
      punches. See task 8f.]**
      BLOCKED-BY: nothing. SEQUENCED AFTER: 6a, 6.
      AC — **every criterion inspects the `punches` FIELD, never a rendered
      string:**
      (1) the live CHECK accepts an INSERT with `punch_location='untagged'` and
      still REJECTS a junk value (§19, in a ROLLBACK tx, as `0026`'s probes ran).
      (2) check-types accepts `location: 'untagged'` on a `PunchRef`; §19 probe
      for exhaustiveness — temporarily write a `switch` over `PunchLocation` that
      OMITS the `untagged` arm, watch check-types FAIL, then remove the probe.
      (3) creating a mouse through the store with the dialog DEFAULT yields
      exactly ONE punch, `location === 'untagged'`, with a non-empty ISO
      `effectiveAt`; ~~creating with `toe` chosen yields `location === 'toe'`.~~
      **[The `toe`-chosen clause is RETIRED by task 8f, which removes the
      punch-location select entirely — creation is ALWAYS `untagged`. Do NOT
      re-run it; 8d is not un-ticked. Same device as 8b's RETIRED-by-11 note.]**
      (4) `mouseLabelOf` returns the SAME string for an untagged-only mouse and a
      toe-only mouse.
      (5) after all FOUR add mutations, walking the whole colony shows every mouse
      with `punches.length >= 1`.
      (6) ~~`buildMouseCell` contains NO location literal at all.~~ **[RETIRED by
      task 8f: the mint is UNCONDITIONAL again, so `'untagged'` is expected to be
      a literal at the one mint site. 8f replaces this with a one-mint-site grep
      in 8c's form. Do NOT re-run it; 8d is not un-ticked.]**
      (7) check-types + lint 0 errors across the monorepo.
- [x] 8e. **DONE 2026-09-22 (`20e020d`), reviewer PASS — ALL criteria met.**
      Verified at HEAD `23474e7` by the closing review. ONE append path
      (`mintPunch`) and no write to `state.punches` outside the pure layer;
      `findMintedPunch` greps **0**; the creation punch is present in `punches`
      AND in the mouse's active `punches` through ALL FOUR add rails;
      `grep deletedAt packages/types/src/grid.ts` = 0; seed equality holds (44
      active == summed fixture `punches.length`, zero seeded tombstones); ids
      never reused; check-types + lint 0.
      **CONSEQUENCE RECORDED, not a defect of 8e:** `projectPunches` rebuilds
      every line/cage/slot/mouse unconditionally, which breaks step 6's still-open
      "every other mouse is reference-equal" clause. 8e's shape text says
      `grid.punches` "becomes a PROJECTION" and never authorised rebuilding every
      object, so this is NOT un-ticked — new task **8g** restores the clause.
      **`punches` becomes the SINGLE SOURCE for punches — OWNER DECIDED
      2026-09-22, NEW 2026-09-22.** Owner verbatim: *"refactor this. I like this
      simplification."*
      WHAT IT CLOSES: task 13's closing review found `punches` has **TWO
      WRITERS** — `punchMutations.addPunch`, and `mockColonyStore.commitIfOk`'s
      `findMintedPunch` back-fill for CREATION mints. Correct today, but it rests
      on a HEURISTIC ("if `nextPunchId` advanced, find the punch at the
      pre-commit id"), so a future mutation minting TWO punches in one call would
      SILENTLY LOSE ONE. That is the failure mode this refactor removes.
      WHY IT IS WORTH DOING TO CODE THAT LANDED HOURS AGO: it matches what the
      REAL SERVER does — ONE `punches` table, TWO queries, one with
      `WHERE deleted_at IS NULL` (which is exactly what `0026_punches.sql`'s
      partial index exists for) and one without. The current two-array shape is
      what made the log's COMPLETENESS depend on a heuristic.
      SHAPE:
      (a) `punches` holds EVERY row, active and tombstoned, carrying
      `deletedAt`.
      (b) `grid.punches` becomes a PROJECTION off it: filter `deletedAt`, map to
      `PunchRef`.
      (c) the SECOND WRITER DISAPPEARS — `commitIfOk`'s `findMintedPunch`
      back-fill and its `nextPunchId`-advanced heuristic are DELETED.
      (d) FIXTURES DO NOT CHANGE SHAPE — punches stay NESTED inside mice as seed
      INPUT; the store NORMALISES on init.
      **THE DTO CONTRACT DOES NOT CHANGE.** `MouseCell.punches` stays ACTIVE-ONLY
      with no `deletedAt`, exactly as 6a set it. This is a STORE-INTERNAL
      refactor, NOT a schema change — 6a's guard must still hold afterwards, and
      it is repeated in the AC below for that reason.
      BLOCKED-BY: nothing. **SEQUENCED BEFORE 8f** (same files; the refactor
      gives 8f a cleaner base, and ONE developer does both in that order).
      **BASELINE GREPPED 2026-09-22, stated so this AC is not misread as
      already-satisfied-by-magic (same device as 6a and 11): a developer is
      implementing this WHILE this task is being written, and the working tree
      ALREADY shows the refactored shape** — `mockColonyStore.ts:70-78` carries
      `punches` as the single source with `grid` built by `projectPunches(...)`,
      `:161-165` records that the creation punch is minted straight into
      `punches` by the pure layer so "there is no separate seam to close here any
      more", and **`findMintedPunch` already greps to 0 in source**. The criteria
      below are the CLOSING check on that diff, not a fresh discovery.
      AC — **every criterion inspects the FIELD or greps SOURCE, never a rendered
      string** (`untagged` and `toe` both render nothing):
      (1) EXACTLY ONE WRITER to the punch store: grep shows no second append
      path, and `findMintedPunch` returns **0** repo-wide (baseline above: already
      0 in the working tree — the falsifiable half is the "no second append path"
      clause, checked by reading `commit`/`commitIfOk` for any write to
      `state.punches` outside the pure layer).
      (2) a mouse created through EACH of the four add rails
      (`addLine`/`addCage`/`addSlot`-with-mouse/`addMouse`) has its CREATION
      punch present in `punches` **and** in its active `punches`.
      (3) `grep deletedAt packages/types/src/grid.ts` still returns **0** (6a's
      guard — the falsifiable proof this stayed store-internal).
      (4) SEED EQUALITY still holds: the ACTIVE count in `punches` equals the
      SUM of `punches.length` over every mouse in `SEED_COLONY`, and ZERO seeded
      entries carry `deletedAt` (assert the EQUALITY, not a literal — 8f moves
      the seed max).
      (5) `removePunch` still leaves the mouse one FEWER active entry WHILE the
      log holds that `punchId` with `deletedAt` set; `punchId` is never reused.
      (6) check-types + lint 0 errors across the monorepo.
- [x] 8f. **DONE 2026-09-22 — was ISSUE on AC (8), FIXED in `23474e7`, now
      CLOSED.** The closing review found AC (8) unmet: the `'untagged'` entry in
      `PUNCH_LOCATION_OPTIONS` was named as a hit that must be gone and was still
      there. The fix MOVED the constant into `PunchSection` rather than filtering
      it — 8f had deleted the dialog's select, leaving `AddMouseDialog` defining
      an option list it no longer used and EXPORTING it to a sibling, which the
      review had separately flagged as a quality-gate smell (the
      "a dialog is a constants provider for its siblings" finding on task 13).
      **One move resolves both.** Today `PUNCH_LOCATION_OPTIONS` greps 0 and
      `PunchSection.client.tsx:15` owns `ADDABLE_LOCATIONS = ['toe','ear','other']`.
      **AC (8) closed by NAMING the survivors, as the criterion requires
      (re-grepped this pass, `['"]untagged['"]` over `apps/colony_client_web`
      `*.ts`/`*.tsx`):** `lib/colonyMutations.ts` (the ONE mint site `:128` + its
      comment `:120`), `lib/punchMutations.ts` (`:64` add-refusal, `:112`
      remove-refusal), `apis/getColonyGrid.mock.api.ts` (the per-mouse fixture
      rows), `app/PunchSection.client.tsx:137` (renders nothing for it), and
      `app/AddMouseDialog.client.tsx:343` (a COMMENT recording that the location
      is no longer a caller choice). The dialog default and the
      `PUNCH_LOCATION_OPTIONS` entry — the two hits the criterion required gone —
      are both gone. Every other criterion PASS at HEAD `23474e7`.
      **`untagged` ALWAYS EXISTS and is NEVER REMOVED — OWNER DECIDED
      2026-09-22, NEW 2026-09-22.** Owner verbatim: *"we never delete a untagged
      record. we keep together and if we see 1 active tag with untagged then we
      can target which mouse is not tagged."*
      THE MODEL, recorded plainly:
      - Creating a mouse **ALWAYS** mints an `untagged` punch record. It is NOT a
        choice.
      - Real tags (`toe`, `ear`) are added BESIDE it. The `untagged` record
        **COEXISTS** and is **NEVER tombstoned**.
      - A mouse "NEEDS TAGGING" when its ONLY active punch is the `untagged` one.
        **This is a DERIVED DEFINITION, recorded — NOT scoped work here.** No
        indicator, badge or filter is in this task's scope; it is the owner's
        evident next want and gets its own task if they ask for it.
      - **THIS CLOSES THE ZERO-ACTIVE-PUNCHES FLOOR BY CONSTRUCTION** — a mouse
        can never reach zero active punches, so the floor is structural rather
        than a rule someone must remember to enforce at removal time. It was the
        architect's to rule on; the OWNER has now settled it. Task 13's OPEN
        section and 8d's "STILL OPEN" clause are both closed against this.
      **WHAT THIS CHANGES vs 8d, and why 8d is not un-ticked:** 8d made the
      creation location a CHOICE defaulting to `untagged`; it is now ALWAYS
      `untagged`. Per this file's precedent (step 8 → 8b/8c, 8b's RETIRED-by-11
      note), **8d keeps what it shipped** — the migration, the `PunchLocation`
      value, the dialog wiring and the fixture row all STAND — and this NEW task
      carries the change. 8d's ACs (3)-second-clause and (6) are annotated RETIRED
      in place, not deleted.
      ~~**DOC-LAGS-SOURCE NOTE, stated so this task is not misread:** 8d LANDED in
      source 2026-09-22 (main session) but still shows `[ ]` here — its tick and
      close note are OWED by the pass that carries its reviewer verdict. Same
      device the task-13 blocker note used for step 7. This task does not tick it.~~
      **[RESOLVED 2026-09-22: 8d is ticked `[x]` with its close note. The debt
      this note recorded is paid.]**
      SCOPE — FOUR PIECES, nothing else:
      (a) CREATION ALWAYS MINTS `untagged`: `buildMouseCell` mints
      `location: 'untagged'` unconditionally. Whether
      `MouseSpec.initialPunchLocation` is DELETED or kept unused is the
      developer's call under "no dead code" — the AC is written to be falsifiable
      EITHER WAY.
      (b) the `AddMouseDialog.client.tsx` PUNCH-LOCATION SELECT **GOES** (added by
      8d; it is the only `MouseSpec` construction site).
      (c) `untagged` rows CANNOT BE REMOVED — `removePunch` must not tombstone an
      `untagged` row, and task 13's drawer punch section must offer NO remove
      affordance on it. **HOW the refusal is expressed (silent no-op vs
      `{ok:false}`) is NOT decided here — the architect's, and the AC only
      requires the row to SURVIVE.**
      (d) SEED FIXTURES gain an `untagged` row PER MOUSE, so the invariant holds
      in SEED DATA too and not only for mice created in-app. **This is the piece
      that matters most:** a fixture that never reaches a path is exactly what
      hid 8c's defect for three reviews.
      (e) **THE DRAWER'S ADD-PUNCH PICKER MUST NOT OFFER `untagged` — a COLLISION
      FOUND BY GREP THIS PASS, recorded not designed.** Task 13 shipped
      `app/PunchSection.client.tsx`, whose add picker maps
      **`PUNCH_LOCATION_OPTIONS`** imported from `AddMouseDialog.client`
      (`:10`, `:62`, `:68`), and that list INCLUDES `'untagged'`
      (`AddMouseDialog.client.tsx:64`). So today a user can ADD a SECOND
      `untagged` row by hand — which contradicts the owner's model, where
      `untagged` is MINTED, never chosen. The picker must stop offering it.
      **Whether the mutation layer ALSO refuses a hand-added `untagged` (belt and
      braces) is the ARCHITECT'S, not decided here** — the AC below only requires
      that the picker does not offer it.
      NOTE while (b) and (e) are both open: `PUNCH_LOCATION_OPTIONS` currently
      lives in `AddMouseDialog.client` and is consumed by `PunchSection` — the
      "a dialog is a constants provider for its siblings" finding recorded on task
      13. Deleting the dialog's select (b) must not orphan the list its sibling
      imports. Where the constant ends up is the developer's call under SRP; it is
      recorded here only so the two edits are not made in ignorance of each other.
      MOCK-COVERAGE GAP, RECORDED NOT CLOSED (owner 2026-09-22: "leave it as it
      is. leave a note."): no fixture mouse carries **two `ear` punches**, so the
      `ee` form Q41 resolved has NO seed coverage. Deliberate, not an oversight —
      leave a short comment saying so beside the punch fixtures, and add nothing.
      The zero-punch gap from the same finding is IMPOSSIBLE under this model.
      (Mock HISTORY stays runtime-only — the owner decided no seeded tombstones,
      and that is unchanged.)
      BLOCKED-BY: nothing. **SEQUENCED AFTER 8e** (same files; 8e removes the
      second punch writer first).
      AC — **EVERY criterion inspects the `punches` FIELD or greps SOURCE, NEVER
      a rendered string: `untagged` and `toe` BOTH render nothing, so no rendering
      check can see any of this** (8c's lesson, FOURTH OCCURRENCE):
      (1) after creating mice through ALL FOUR add rails, walking the whole colony
      shows EVERY mouse carrying an ACTIVE punch with `location === 'untagged'`,
      each with a non-empty ISO `effectiveAt`.
      (2) EVERY mouse in `SEED_COLONY` likewise carries an active `untagged` row
      (the fixture half of the same invariant — the piece that would otherwise
      never reach the path).
      (3) adding a `toe` or `ear` punch leaves the `untagged` row ACTIVE and
      untouched — COEXISTENCE asserted on the field, not inferred.
      (4) `removePunch` on an `untagged` `punchId` leaves that mouse's `punches`
      UNCHANGED **and** leaves NO `deletedAt` on that row in `punches`. §19
      DELIBERATE BREAKAGE: attempt it, observe the row survive.
      (5) task 13's drawer punch section renders NO remove affordance on an
      `untagged` row (established by READING the JSX — the standing no-browser
      caveat applies, say so rather than claiming a click).
      (6) NO mouse in the colony has ZERO active punches, after any sequence of
      adds and removes (the FLOOR, asserted after the fact, colony-wide).
      (7) the punch-location SELECT is gone: grep `initialPunchLocation` over
      `apps/colony_client_web` SOURCE (excluding `.next/`) shows **NO `MouseSpec`
      construction site passing a location** — falsifiable whether the field is
      deleted or kept. **BASELINE GREPPED 2026-09-22: 3 hits —
      `AddMouseDialog.client.tsx:356` (the construction site, which must go),
      `colonyMutations.ts:125` (the mint read) and
      `colonyMutationHelpers.ts:53` (the `MouseSpec` field declaration).**
      (8) ONE MINT SITE, `untagged` form (mirrors 8c's AC (5)) — **and it is NOT
      "exactly one file": naming the survivors is the whole point, because an
      "exactly ONE file" wording would be unmeetable the day it is written, which
      is the SEVENTH-occurrence mistake on the very task that records it.**
      **BASELINE GREPPED 2026-09-22**, `['"]untagged['"]` over
      `apps/colony_client_web` SOURCE excluding `.next/`: `AddMouseDialog.client.tsx`
      `:64` (inside `PUNCH_LOCATION_OPTIONS`), `:209` (comment), `:211` +
      `:265` (the select's default state); `colonyMutationHelpers.ts:52`
      (comment); `getColonyGrid.mock.api.ts:762` (8d's fixture row).
      AFTER 8f the literal must survive ONLY at NAMED sites: the MINT in
      `buildMouseCell`, the fixtures, and — if they name the literal — the removal
      guard and the picker's exclusion. Every OTHER hit above is gone (the dialog
      default and the `PUNCH_LOCATION_OPTIONS` entry in particular). List the
      surviving files explicitly in the close note rather than asserting a count.
      (9) NOT AN AC — the `ee` fixture is deliberately NOT added (owner). The
      only check here is that a comment beside the punch fixtures records the
      missing `ee` seed coverage as deliberate.
      (10) the drawer's ADD-PUNCH picker does NOT offer `untagged`: the option
      list `PunchSection.client.tsx` maps (`PUNCH_LOCATION_OPTIONS` today) does
      not contain it, so no hand-added second `untagged` row is reachable from the
      UI. Established by READING the list and the JSX — no browser, same standing
      caveat.
      (11) check-types + lint 0 errors across the monorepo.
- [x] 8g. **DONE 2026-09-23 (`0a95e34`), reviewer PASS — ALL criteria met.**
      Reuse was verified at ALL FOUR levels, not just the mouse: after `addPunch`,
      exactly ONE mouse, ONE slot, ONE cage and ONE line differ, each on the
      target's path — asserted on COUNTS, so a "mouse reused but slot rebuilt"
      defect could not hide behind a passing mouse-level check. SEED ALIASING
      confirmed REAL AND SAFE (AC (4)): the store's init expression returns
      `SEED_COLONY` itself, and the fixture is DEEP-EQUAL UNCHANGED after adds,
      removes, four rail creations and a `moveMouse`. `mice.map(` = 2, both
      unrelated.
      **SCOPE, stated because the title reads wider than the task is:** 8g covers
      `addPunch` / `removePunch` — the projection path step 6's clause lives on.
      `addMouse` / `addSlot` / `addCage` / `addLine` STILL spread lines and cages
      broadly; no criterion here or in step 6 ever claimed otherwise, so nothing
      is carried forward (§7) — it is record-only, alongside the BACKLOG
      path-copy `moveMouse` item.
      Original scope, for the record: **Restore step 6's "every other mouse is
      reference-equal" — NEW 2026-09-22.** Step 6's AC says an `addPunch` must return a colony in
      which exactly one mouse changed and **every other mouse is reference-equal**.
      `projectPunches` currently rebuilds every line, cage, slot and mouse
      unconditionally, so it does not hold. 8g makes it hold. That is the whole
      task — no other justification is in scope and none is wanted.
      HISTORY, for whoever reads the diff: the clause HELD at step 6's own commit
      `96f5a8d` (`addPunch` mapped
      `m.metaId === input.metaId ? { ...m, punches } : m`) and was broken by 8e
      (`20e020d`). 8e never decided this — its shape text says `grid.punches`
      "becomes a PROJECTION", never "rebuild every object" — so 8e is NOT
      un-ticked and step 6 is NOT retired; step 6 stays `[~]` and 8g is its
      blocker.
      **THE GUARANTEE IS BOTTOM-UP, and all five rules are required:**
      - a MOUSE keeps its reference when its projected `PunchRef[]` is
        VALUE-EQUAL to the one it already holds;
      - a SLOT keeps its reference when every mouse in it was reused;
      - a CAGE keeps its reference when every slot in it was reused;
      - a LINE keeps its reference when every cage in it was reused;
      - the ROOT may also be reused — harmless, because `commit` compares the
        `ColonyState` object.
      **SEED-ALIASING COST — stated, not hidden.** With reuse, the INITIAL
      projection returns `SEED_COLONY` itself, so the first snapshot ALIASES the
      fixture. That is safe today because every mutation is
      immutable-by-construction and `moveMouse` clones before splicing — but
      `mockColonyStore.ts` says "never mutate SEED_COLONY arrays", so it is an
      **AC, not an assumption** (AC (4) below).
      BLOCKED-BY: nothing. BLOCKS: step 6. SEQUENCED AFTER 8f (same files).
      AC — asserted on OBJECT IDENTITY in a temporary dev PROBE, the device
      8d's AC (2) already used (write it, observe it, REMOVE it — §19 deliberate
      breakage, not a test file and not a test runner):
      (1) after `addPunch` on one mouse: that mouse's object is NEW, and EVERY
      other mouse object in the colony is `===` its pre-call object; likewise
      every slot, cage and line that contains no changed mouse.
      (2) the containment rules hold in BOTH directions on the changed path: the
      slot/cage/line CONTAINING the changed mouse are new objects, and no
      sibling slot/cage/line is.
      (3) `removePunch` satisfies (1) and (2) identically; a no-op call (unknown
      id, already-removed id, or an `untagged` id refused by 8f) returns a state
      in which EVERY mouse, slot, cage and line is `===` its pre-call object.
      (4) SEED ALIASING IS SAFE, asserted not assumed: take a `structuredClone`
      of `SEED_COLONY` before a probe sequence of adds, removes and a
      `moveMouse`, run the sequence, then assert `SEED_COLONY` still deep-equals
      that clone.
      (5) every existing punch criterion still holds unchanged — step 6's
      remaining clauses, 8e's AC (2)/(4)/(5), 8f's AC (1)/(6) — value-correctness
      is not traded for identity.
      (6) check-types + lint 0 errors across the monorepo.
- [x] 8h. **DONE 2026-09-23 (`0a95e34`), reviewer PASS, with a correction landed
      in `517d8a0`.** The guard THROWS on a duplicate `punchId` and on
      `max(punchId) >= nextPunchId`, at `commit()` AND at init, and is INERT under
      `NODE_ENV=production` (verified by re-running the probe there). `517d8a0`
      also fixed a counter that ADVANCED on a REJECTED write.
      **WHAT THE GUARD DOES NOT DO — recorded because two sentences of this task
      overstated it and are now fixed:** the single-writer property is **ENFORCED,
      not STRUCTURAL.** A hand-built `[...state.punches, row]` carrying a unique
      id and an advanced counter still COMMITS, leaving the log and the grid
      divergent — the guard checks the LOG'S INTERNAL CONSISTENCY, never that a
      write came through the one path.
      **RECORD-ONLY, no AC and no task (dispositions named so nobody re-opens them
      as defects):** `commit()` is BYPASSED by `updateMouse` and `applyColonyMove`,
      so the guard never sees their output — they carry `punches` through
      unchanged and cannot corrupt the log, but they are two UNGUARDED PATHS. And
      the uniqueness half's promised MVP2 role (validating server responses) holds
      in DEV BUILDS ONLY, which its comment does not say.
      Original scope, for the record: **`punchId` uniqueness guard at `commit()` — NEW 2026-09-22.**
      `mintPunch` OWNS the `{ grid, punches }` re-derivation, and `commit()`
      gains a DEV-GATED DUPLICATE-`punchId` GUARD. This is the same species as
      `addPunch`'s `untagged` refusal: a STORE-LEVEL REJECTION OF A PROGRAMMER
      ERROR, not a test.
      **REJECTED OPTION, recorded with its reason so it is not re-proposed — a
      BRANDED `punchId` type.** It is genuinely structural, but it lands a
      MOCK-ERA-ONLY invariant in `packages/types`, and it needs blessed casts at
      `seedPunches` and again at the MVP2 deserialiser — where the SERVER owns
      uniqueness and the brand degrades to an explicit cast site. Not worth that
      price for this.
      **THE GUARD HAS TWO HALVES WITH DIFFERENT LIFESPANS — record it, because
      one of them is disposable and the other is not:**
      - UNIQUENESS of `punchId` across `punches` SURVIVES MVP2 and then
        validates SERVER RESPONSES.
      - `max(punchId) < nextPunchId` is **MOCK-ERA ONLY** — it constrains the
        mock's own counter and has no meaning once the server allocates ids.
      BLOCKED-BY: nothing. SEQUENCED AFTER 8g (same files).
      AC — dev-gated behaviour observed via a temporary dev PROBE (8d AC (2)'s
      device: write, observe, remove; §19 deliberate breakage, never a test file
      or a test runner):
      (1) ~~`mintPunch`~~ **[CORRECTED 2026-09-23: the symbol is
      `deriveColonyState` — that is the actual single re-derivation site;
      `mintPunch` was named here without being grepped, the PATTERN block's own
      defect shape]** is the only place that re-derives `{ grid, punches }` —
      no other function returns both.
      (2) §19: hand-construct a state whose `punches` holds a DUPLICATE
      `punchId`, pass it through `commit()` in dev, WATCH IT REJECT; remove the
      duplicate, watch it pass.
      (3) §19: hand-construct a state where `max(punchId) >= nextPunchId`, pass
      it through `commit()` in dev, watch it reject.
      (4) the guard is DEV-GATED — the production path does not run it, and the
      gate is visible in source at one place.
      (5) the two halves are DISTINGUISHABLE in source: the mock-era-only
      `max(punchId) < nextPunchId` half carries a comment saying so, so MVP2 can
      delete exactly it and keep uniqueness.
      (6) no normal add/remove/create sequence trips either half.
      (7) check-types + lint 0 errors across the monorepo.

## Deploy verdict + closing-review record-only findings (2026-09-22)

**DEPLOY VERDICT — 2026-09-22, ARCHITECT AND REVIEWER AGREE: NOTHING FOUND IN
THIS CLOSING PASS BLOCKS MVP1.** Every finding is VALUE-CORRECT at HEAD
(`23474e7`); the only observable is re-render count on a demo-sized colony.
8g and 8h are CONTRACT work, not incident response. Recorded here so the state
is legible to whoever picks this up next: the punch family is shippable as it
stands.

**RECORD-ONLY FROM THE 2026-09-22 CLOSING REVIEW — no AC, no task, dispositions
named so nobody re-opens them as defects:**
- **`punches` / `punches` NAMING COLLISION now inside task 7's AC text** (and
  8e's AC (4)): `ColonyState.punches` and `MouseCell.punches` DELIBERATELY share
  a name (the table vs that mouse's active rows projected out of it, decided in
  the 2026-09-22 rename), so the seed-equality criterion now literally reads
  "`punches.length` equals the sum of `punches.length`". Both ACs were VERIFIED
  as intended (44 == 44) and the text is deliberately LEFT AS IS — record-only.
- **`colonySeed.maxPunchId`'s comment says the counter's source "moves to the
  log"** — a move that DID NOT HAPPEN (the single source is `punches`, and the
  word "log" did not survive the rename). The comment's LOAD-BEARING half (ids
  are never reused, so a counter seeded from active rows alone re-issues the
  highest id the moment that punch is removed) is TRUE and is what 6a's AC
  required. Record-only.
- **8f's scope text names "the mint in `buildMouseCell`"**, but the mint lives
  in `addMouse` via `mintPunch` (`colonyMutations.ts:123-128`). Scope prose,
  not an AC; the one-mint-site criterion was verified against the real site.
- **8d's "regenerate SCHEMA.md + ERD" scope item WAS NOT RUN** — and it would
  have been a NO-OP DIFF anyway, since `SCHEMA.md` records INDEXES and not CHECK
  constraints (the same fact 8d's own scope (a) states as the reason to query
  `pg_constraint`). Record-only; re-run it whenever a live DB is next up.
- **MVP-ladder L3:** the mock fixture is isolated by FILENAME
  (`apis/getColonyGrid.mock.api.ts`) rather than by its own DIRECTORY, and its
  header calls it "anonymised-but-realistic" — the OPPOSITE of the ladder's
  "mock data must be unmistakable / marked values" (`CLAUDE.md` §System build
  phasing). Pre-existing, same class as the `NewTaskDialog` L3 note already
  recorded below. Record-only; the architect owns any ruling.

## Step 9 split rationale (2026-09-22)

**SPLIT 2026-09-22 (scope-verify) — the "is still a STORED field" tense below is
AS OF THE SPLIT; 9b deleted the field on 2026-09-22 (`8ae117e`). Kept as the
split's rationale, not as current state. Step 9 as written covered only the
MUTATION side. `MouseCell.mouseLabel` was then still a STORED field (`packages/types/src/grid.ts:100`)
written at creation (`colonyMutations.ts:88`) and overwritten on edit (`:342`),
while plan §"Label = read-time projection" requires `MouseCell` have "NO stored
label" — that deletion had NO task. Step 9 → 9a (mutation-side) + 9b (type +
call-site migration). Note: the shipped DTO field is `mouseLabel`, NOT
`renderedId` (renamed at step 5) — `renderedId` greps to 0 already, so the old
AC was vacuous; ACs below name the shipped symbols. Line refs replaced by
symbol refs (`:202-229` now points at `addSlot` after step 8).**

## Label-projection tasks 9a–9e

- [x] 9a. Label projection — mutation side. **DONE 2026-09-22 (`a4c4089`),
      reviewer PASS.** Shipped: `UpdateMousePatch.mouseLabel` dropped together
      with the `sex` back-inference and the `extractLitterCode` re-derivation;
      the colony-wide `mouseLabelSet` uniqueness check removed and
      `mouseLabelSet` itself deleted (no unused export left); the grid's label
      cell is read-only. `MouseCell.mouseLabel` deliberately still exists —
      that is 9b. DROP `mouseLabel` from
      `UpdateMousePatch` (`colonyMutations.ts` `UpdateMousePatch` /
      `updateMouse`: free-text label edits back-infer `sex` from the first
      character and re-derive `litterCode` via `extractLitterCode(newId)`, which
      fights a punch-derived label); REMOVE the colony-wide string-uniqueness
      check on that label (the `mouseLabelSet(state)` branch in `updateMouse` —
      contradicts plan §4 R2 "NO UNIQUE constraint"; identity is `metaId`); the
      grid's label cell (`ColonyGridView.client.tsx` `EditableCell
      value={mouse.mouseLabel} onCommit={(next) => onUpdate({ mouseLabel: next })}`)
      becomes READ-ONLY — do NOT widen the patch type to keep it editable.
      Then `mouseLabelSet` (`colonySeed.ts:100`) loses its only consumer: delete
      it or leave a named one (quality gate: no unused exports). BLOCKED-BY: 5.
      AC: `UpdateMousePatch` has no `mouseLabel` key (check-types proves it);
      two live mice composing to the same label BOTH persist and BOTH render;
      grep `patch.mouseLabel|mouseLabelSet` in `lib/colonyMutations.ts` returns
      0; grep `mouseLabelSet` repo-wide is either 0 hits or 1 definition + ≥1
      live consumer, never a definition alone; no call site passes `mouseLabel`
      to `onUpdate`; check-types + lint 0 errors.
      **MEMO 2026-09-22 — the OWNER ASKED FOR A MEMO, NOT A FIX. No task is
      opened and no rules change is proposed; this is recorded so it is not
      re-derived later.** The anti-re-widening guard above greps
      **`lib/colonyMutations.ts`** — but **8b MOVED `updateMouse` and
      `UpdateMousePatch` into `lib/updateMouse.ts`** (`da51a75`), and NO AC
      anywhere greps that file. So the guard is **VACUOUS TODAY**: re-adding a
      label field to `UpdateMousePatch` would trip nothing, and 9a's whole point
      (the label is an OUTPUT, never an input) would silently regress.
      Same shape as the FIRST occurrence in the PATTERN block (a grep outlived
      its referent) — there by a RENAME, here by a FILE MOVE.
      CANDIDATE REMEDY, recorded not adopted: a COMPILE-TIME guard in
      `lib/updateMouse.ts` instead of a grep — e.g.
      `type NoLabelKey<T> = 'mouseLabel' extends keyof T ? never : T;` applied to
      `UpdateMousePatch` — which SURVIVES a file move in a way a grep AC does
      not, as 8b just demonstrated. Whoever picks this up decides scope; it is
      not scoped here.
- [x] 9b. Label projection — type + call-site migration. **DONE 2026-09-22
      (`8ae117e`), reviewer PASS.** Shipped: `MouseCell.mouseLabel` deleted;
      `MouseCell.punches` now REQUIRED; ten render sites compose through a NEW
      `mouseLabelOf(mouse)` helper in `lib/mouseIdentity.ts` (reviewer ruled the
      helper IN SCOPE — it puts the active-ear-punch filter in exactly one
      place); `gridFilter` matches a COMPOSED label; `colonySeed` /
      `mockColonyStore` read `m.litterCode` directly; the 21 `MouseCell`-level
      `mouseLabel:` fixture lines deleted while the 8 `ParentCell` ones stay.
      VERIFIED: all 21 seed mice compose byte-identically to their old stored
      strings (offsets and ear suffix included); `updateMouse(603,{sex:'F'})`
      renders `F5BFA`; `peekNextLitterCode` returns `BGY` both sides; search
      still matches `BFA` and `M6`.
      **AC MET in full** (including its own escape hatch: zero
      `extractLitterCode` consumers survived, and the AC said do NOT delete it,
      flag to the architect — that is what happened). What is unmet is a REPO
      QUALITY GATE, not a 9b criterion: `rules/development/code.md`'s "no dead
      code / unused exports" now fails for `extractLitterCode`. Per
      `rules/docs.md` §7 it is carried forward as its own task, **9c**.
      Original scope, for the record: DELETE
      `MouseCell.mouseLabel` from `packages/types/src/grid.ts` (plan: "`MouseCell`
      … NO stored label"); make `MouseCell.punches` REQUIRED and drop its stale
      "does not mint punches yet" comment (step 8 now mints — this finishes
      step 2's spec, not new scope); every render site composes instead:
      `ColonyGridView.client.tsx` (grid cell, ctx-menu, selection summary,
      NewTaskDialog/MoveMenu label payloads), `MouseDetail.client.tsx`,
      ~~`MouseCaseDrawer.client.tsx`, `TasksView.client.tsx`~~ **[CORRECTED
      2026-09-22 — neither file holds a `MouseCell`; both render PERSISTED
      SNAPSHOT strings (`target.label`, `task.subjectLabel`), so neither was a
      migration site and the developer correctly left them alone. The two names
      were written into this task without being opened — see the file-name
      variant in the PATTERN block above.]** via
      `buildMouseLabel(parts)` (+ `composeMouseLabel` for `.N`); `gridFilter.ts`
      matches the query against a composed label, not a stored one;
      `mockColonyStore.ts:100` and `colonySeed.ts:88` read `m.litterCode`
      DIRECTLY instead of `extractLitterCode(m.mouseLabel)` (parts exist — stop
      parsing); the ~30 `mouseLabel` lines in `getColonyGrid.mock.api.ts` are
      deleted from the fixtures. SAFE because step 5's DONE probe verified all
      21 mock fixtures satisfy `mouseLabel === buildMouseLabel(parts)` — the
      fixture edit is mechanical. OUT OF SCOPE: `ParentCell.mouseLabel`
      (grid.ts:65) has no parts to compose from, and case/task DTO label
      snapshots are references, not projections — both keep their string; see
      ARCHITECT QUESTION below. BLOCKED-BY: 9a.
      AC (deliberate breakage, §19): `MouseCell` has no `mouseLabel` key and
      `punches` is non-optional (check-types proves both); check-types + lint 0
      errors across the monorepo; every grid cell renders the same label string
      it rendered before the change for all 21 seed mice; **projection probe
      (REWRITTEN 2026-09-22 — the old wording, "editing `sex` via inline edit
      changes the rendered label immediately", was IMPOSSIBLE to satisfy:
      there is NO inline sex editor. `sex` was only ever reachable by
      back-inference from a typed label, which 9a removed, and
      `app/MouseDetail.client.tsx:125-126` renders sex read-only. The probe is
      therefore store-level; `UpdateMousePatch.sex` already exists,
      `colonyMutations.ts:74`):** calling `updateMouse(603, { sex: 'F' })` —
      seed mouse metaId 603, `U5BFA`, pupNumber 5, litterCode BFA, no offsets,
      one `toe` punch so no suffix (`getColonyGrid.mock.api.ts:580-592`) —
      makes its grid cell AND its drawer render `F5BFA` on the next render,
      with no label field written anywhere (no assignment to a `mouseLabel`
      property survives in `colonyMutations.ts`); `peekNextLitterCode` on the seed colony returns the SAME code
      before and after; the grid search box still matches `BFA` and `M6`;
      grep `extractLitterCode` — every SURVIVING consumer parses an
      EXTERNALLY-sourced string (import / hand-entered / cage card), never a
      `MouseCell`; if ZERO survive do NOT delete it, flag to architect (steps 3
      and 5 require the legacy-form parser to keep existing). `parseLitterCode`
      is the base-26 codec, unrelated — do not touch it.
      (Do NOT assert "grep `mouseLabel` returns 0" — `ParentCell.mouseLabel` and
      the `@/lib/mouseLabel` module legitimately survive.)
      ARCHITECT QUESTION — ROUTED, ANSWERED, and now **DECIDED**: plan §5 Q46,
      **owner picked option C on 2026-09-22** (discriminated union; in-grid
      parent composes from its `MouseCell`, outside parent keeps a renamed
      `snapshotLabel`). Implementation = task **9d** below. Non-blocking: 9a/9b
      did not depend on the answer.
- [x] 9c. **DONE 2026-09-22 (`15194aa`), reviewer PASS. AC MET IN FULL.**
      `extractLitterCode` is out of the code, including the two now-false
      references in `lib/litterCode.ts`'s own header comment. THE KNOWLEDGE MOVED
      FIRST, as the task required: its regex, its six tolerated forms and its
      three-instance bug-class history now live in `docs/phases/p0.7.plan.md`
      under "Legacy mouse-label parse contract (retired from code 2026-09-22)",
      and byte-identity was established by DIFFING the doc's code fence against
      the commit's deleted lines — not by eye. `peekNextLitterCode` returns `BGY`
      on the seed colony both before and after. `parseLitterCode` /
      `formatLitterCode` kept their live consumers; `nextLitterCode`'s
      pre-existing zero-consumer state was flagged, not silently deleted, and is
      now carried by task **9e**.
      Original scope, for the record: **RETIRE `extractLitterCode` — OWNER DECIDED 2026-09-22.** Not "keep
      it for a future consumer": the function LEAVES the code, after its
      knowledge is moved. This carries the repo quality gate
      (`rules/development/code.md`, "no dead code / unused exports") that 9b's
      close left unmet (`rules/docs.md` §7): 9b removed its last two consumers
      (`mockColonyStore` and `colonySeed` now read `m.litterCode` directly).
      THE DECIDING FACT (this overrides 9b's "do NOT delete it" escape hatch,
      which assumed a live legacy-parse path): plan §5 Q39 requires PARSE to
      accept the legacy mid form because those strings reach us "via import and
      via inline edit" — but the INLINE-EDIT path was DELETED by 9a, and there
      is NO TypeScript import path in this repo at all (`grep raw_mouse_id` over
      `*.ts/*.tsx` returns 0; the P0.4 importer is server-era and unbuilt). And
      when an importer does arrive, a parser shared by importer and client
      belongs in `packages/domain` (pure, client-bundlable — plan §2 layout),
      NOT in an app lib.
      **BEFORE DELETING, THE KNOWLEDGE MOVES — this is the first half of the
      task, not a note.** Copy the function body and its ENTIRE comment block
      VERBATIM into `docs/phases/p0.7.plan.md` under the heading "Legacy
      mouse-label parse contract (retired from code 2026-09-22)", preserving the
      six tolerated forms (`M6BFA`, `M6BFAe`, `M6eBFA`, `M6+10eBFA`,
      `F10+1earAYY`, plus `M1+10+20AZZ`) and the three-instance bug-class
      history. That block IS the acceptance spec the future import parser must
      satisfy. (Written 2026-09-22 by this planning pass — the developer's job
      is to VERIFY it is byte-identical to the code before cutting, and to
      correct the block if it is not.)
      ALSO DELETE: the two now-false references to the function in the file's own
      HEADER comment (`lib/litterCode.ts:13-17`, "extractLitterCode below
      tolerates all of that…") — a header describing a function that is gone is
      the same drift class this task closes.
      RING-FENCED, DO NOT TOUCH: `parseLitterCode` / `formatLitterCode` /
      `nextLitterCode` — the bijective base-26 codec is LIVE and unrelated. The
      module `lib/litterCode.ts` STAYS; only the one function leaves it.
      SCOPING FACT (not a rule, and not the removal path here): both apps'
      `tsconfig.json` carry `exclude: ["**/x_*"]`, so an `x_` rename would remove
      a module from the BUILD. That is why the removal is a function deletion
      inside a surviving module, not a file rename.
      AC: grep `extractLitterCode` over `apps/` + `packages/` `*.ts`/`*.tsx`
      (SOURCE only — the `docs/phases/p0.7.plan.md` block legitimately contains
      the name) returns **0**; `grep -n 'extractLitterCode' lib/litterCode.ts`
      returns 0, including the header comment; the retired body in
      `docs/phases/p0.7.plan.md` is byte-identical to what was cut (diff the two
      before the cut — destination first, §2); the edit creates NO **NEW** unused
      export — **BASELINE GREPPED 2026-09-22, do not inherit it blind:**
      `parseLitterCode` and `formatLitterCode` each have live consumers
      (`colonySeed.ts:8`, `mockColonyStore.ts:8`/`:109`), while
      **`nextLitterCode` ALREADY has zero external consumers** (only its own
      definition; pre-existing, NOT caused by this task — do not let it block
      9c, and do not silently delete it either: flag it, it is a separate
      finding — **flagged and now owned by task 9e**); `peekNextLitterCode` on the seed colony returns the
      SAME value before and after (it was `BGY` at 9b's close, STATUS
      2026-09-22 — assert equality of the two runs, not the literal); check-types
      + lint 0 errors.
- [x] 9d. **DONE 2026-09-22 (`fcece2b`), reviewer PASS.** `ParentCell` is a
      discriminated union on `metaId`; the in-grid arm carries no label and
      composes, the outside arm keeps `snapshotLabel`. The falsifiable criterion
      PASSED: metaId 101's parent entry renders **`M4BCW.2`** — the composed form
      with the `.N` tissue suffix the stored string never had. The reviewer also
      confirmed BOTH `mouseLabelOf` AND `composeMouseLabel` are genuinely in the
      compose chain, which is the check that separates a real pass from the
      silent one: `mouseLabelOf` alone yields `M4BCW`. `ParentRef` and
      `MouseDetail.parents` are deleted with nothing left dangling.
      **AC RESTATED 2026-09-22 (see the FIFTH OCCURRENCE in the PATTERN block).**
      One criterion below was UNMEETABLE AS WRITTEN and is corrected in place:
      ~~"grep `mouseLabel` under `packages/types/src` returns 0"~~ → **"no
      `mouseLabel:` KEY DECLARATION survives under `packages/types/src`"**. The
      bare-identifier grep returns **2**, both legitimate: `grid.ts:27` was stale
      PROSE about the field 9b deleted (repaired in `afa8c43`), and the other
      names the surviving `lib/mouseLabel.ts` MODULE, whose existence 9b's own AC
      required. Intent met; wording fixed. Nothing is carried forward from this —
      no §7 sibling task is owed.
      Original scope, for the record: `ParentCell` → option C (plan §5 **Q46, DECIDED 2026-09-22 by the
      owner**: "we do not save label, we need to combine from mouse info. do the
      same thing"). Scoped like 9b was: type change + call-site migration +
      fixture lines.
      SHAPE: `ParentCell` (`packages/types/src/grid.ts:58`) becomes a
      DISCRIMINATED UNION on `metaId`. In-grid arm (`metaId` non-null) carries
      **NO label field at all** — the UI finds that parent's `MouseCell` by
      `metaId` and composes with `mouseLabelOf` / `buildMouseLabel`
      (`lib/mouseIdentity.ts`), exactly as the ten sites 9b migrated.
      COMPOSE THE FULL LABEL, not just the parts: the in-grid arm must go
      through the SAME path the grid cell uses — `buildMouseLabel` (which stops
      at `[e…]`) PLUS `composeMouseLabel` (`lib/mouseLabel.ts`) with the mouse's
      done/verified Tissue-collection count, which is what appends `.N`. Composing
      with `buildMouseLabel` alone renders `M4BCW` and silently fails the AC
      below, which requires `M4BCW.2`. Outside /
      unknown arm (`metaId: null`) keeps ONE string, RENAMED `mouseLabel` →
      **`snapshotLabel`** — it is a snapshot of text nobody can recompose.
      CALL SITES (grepped 2026-09-22, these and no others — 9b's file-name defect
      is not repeated here): `app/ColonyGridView.client.tsx` `ParentRow`
      (`:1681`, typed `parent?: ParentCell | null` at `:1688`, rendered twice at
      `:2082`/`:2087` from `mouse.parents?.father|mother`) and
      `app/MouseDetail.client.tsx:131-138` (`m.parents?.[parentRole]`).
      `packages/types/src/index.ts:9` re-exports the type.
      FIXTURES: `apis/getColonyGrid.mock.api.ts` has exactly 8 `ParentCell`
      `mouseLabel:` lines in 4 parent blocks — **6 in-grid** (metaId 101/102 at
      `:160`/`:166`, 101/402 at `:254`/`:260`, 601/602 at `:589`/`:595`) whose
      lines are DELETED, and **2 outside** (metaId `null`, `M0AAA`/`F0AAA` at
      `:214`/`:220`) which are RENAMED to `snapshotLabel`. Both arms therefore
      have live fixture coverage. The stale comment at `:249-252` ("ParentRow
      renders this field directly (secondary surface — known bare-label
      limitation)") is deleted — this task removes that limitation.
      NOT-FOUND CASE — name it, it is option C's recorded cost: an in-grid
      parent whose `metaId` has NO `MouseCell` in the payload must render a
      neutral placeholder and MUST NOT throw. Today `ColonyGrid` is whole-colony
      so this is unreachable; it becomes reachable if the grid is ever paginated
      or fetched per line.
      RECORDED GAP, not this task's work: `mates.mate_raw_label`
      (`0002_core_tables.sql:459-461`) is **FATHER-ONLY** ("kept when the FATHER
      cannot be resolved to a row"), so an OUTSIDE MOTHER has no server-side
      source for `snapshotLabel`. Mock-era fixtures carry any string, so this
      bites only at the server swap — it is a P0.4/server-era gap to solve there,
      and it does not block 9d.
      DEAD EXPORT, deleted WITH this task (plan §5 Q46 "decide with it"), NOT as
      a separate task: `@repo/types MouseDetail.parents`
      (`packages/types/src/mouseDetail.ts:30`, `ParentRef[]`) — `getMouseDetail`
      (`apis/getMouseDetail.mock.api.ts:143`) has ZERO callers and the drawer
      reads `MouseCell.parents`. Delete it, or retarget it to the new union;
      either is acceptable, silently leaving it is not.
      BLOCKED-BY: nothing (9b is DONE; no file overlap with 8b/8c).
      AC: `ParentCell` has no `mouseLabel` key and check-types PROVES the union
      (accessing a label on the in-grid arm is a type error); ~~grep `mouseLabel`
      under `packages/types/src` returns 0~~ **[RESTATED 2026-09-22: no
      `mouseLabel:` key declaration survives under `packages/types/src` — the bare
      grep returns 2 legitimate hits, see the close note above]**; the grid's parent row for the mouse
      whose father is metaId 101 renders **`M4BCW.2`** — the composed label WITH
      the `.N` tissue suffix, where the stored string said `M4BCW` (this is the
      documented drift, now fixed, and it is byte-exact and falsifiable); the
      outside-parent block still renders `M0AAA`/`F0AAA` from `snapshotLabel`;
      an in-grid parent whose `metaId` matches no `MouseCell` renders a
      placeholder and throws nothing (§19: temporarily point one fixture parent
      at metaId 999, observe, restore); grep `MouseDetail.parents|ParentRef`
      leaves either 0 hits or a definition with ≥1 live consumer, never a
      definition alone; check-types + lint 0 errors across the monorepo.
- [x] 9e. **DONE 2026-09-23 (`81f4abc`), reviewer PASS.** Both greps were proved
      NON-VACUOUS by DELIBERATE BREAKAGE (§19): re-importing `nextLitterCode` and
      `MouseDetail` each produced `TS2305`. Every criterion also holds at HEAD.
      **AC (3) and (4) are RESTATED, not passed as written** (see the restatements
      in place below). As worded they demanded grep counts of 1 and 0, but the
      residual hits lived INSIDE the `x_`-soft-deleted files themselves; reaching
      the literal numbers would have required `rm` or gutting those files, both
      forbidden by `rules/core.md`, which OUTRANKS task text. Restated with `x_*`
      EXCLUDED — task 11's "AC (5) RESTATED" is the precedent. The `x_` files have
      since been removed by the OWNER (`b4d5e19`), so this restatement is about
      what the AC SHOULD HAVE SAID, not about today's counts.
      Original scope, for the record: **DELETE the dead code — OWNER DECIDED 2026-09-22** (the owner reviewed
      the evidence and chose deletion over "record it and find a consumer"; this
      SUPERSEDES the record-only treatment first proposed for `nextLitterCode`
      and `getMouseDetail`). FOUR deletions, nothing else:
      (a) **`nextLitterCode`** (`apps/colony_client_web/lib/litterCode.ts:50`) —
      zero consumers, re-grepped 2026-09-22 after 9c shipped: the ONLY hit in
      `apps/` + `packages/` `*.ts`/`*.tsx` is its own definition. Pre-existing,
      NOT caused by 9c, which correctly flagged it instead of widening its scope.
      WHY DELETE rather than wire it up: the live path is COUNTER-BASED on
      purpose — `peekNextLitterCode` formats `counters.nextLitterOrd` — because
      deriving next-from-CURRENT can hand back a code an existing litter already
      holds. And the function is an 11-line composition of `parseLitterCode` +
      `formatLitterCode`, both LIVE, so no knowledge is lost by removing it. Its
      `if (ord === null) return 'AAA'` fallback is a SILENT-WRONG-ANSWER hazard of
      the same class as the three-instance bug family in the PATTERN block above.
      (b) **`apps/colony_client_web/apis/getMouseDetail.mock.api.ts`** (133 lines)
      — zero real importers (known since Q46; 9d deleted the `MouseDetail.parents`
      field but not the file). The single remaining textual hit is a COMMENT in
      `MouseDetail.client.tsx` saying the seed "drifted". Delete the file.
      (c) **`MouseDetail`, `GeneCall`, `HistoryEvent`** in
      `packages/types/src/mouseDetail.ts` plus their re-export line in
      `packages/types/src/index.ts` — used by nothing except (b), so they die with
      it. This is EXPLICITLY NOT a 9c-style knowledge move: `GeneCall { code,
      allele: "f/+" }` is the OLD genotype model that P1 SUPERSEDES —
      `docs/phases/p1.genotyping.plan.md` replaces it with a bare `genes.code`
      plus `allele_maternal`/`allele_paternal`, and the baked-together `"f/+"`
      string is precisely what P1 abolishes (see STATUS 2026-09-17: an ordered
      pair is parent-of-origin). `HistoryEvent` is superseded by `useTaskLog()`,
      which the drawer already uses. Preserving either in a doc would preserve a
      model the repo has already decided against.
      (d) **RECORDED ONLY — NOT in this task's AC, do NOT touch it:**
      `apps/colony_client_web/apis/x_getLineGrid.mock.api.ts` is already
      `x_`-prefixed (soft-deleted per `rules/core.md`) and excluded from the build
      by both apps' tsconfig `exclude: ["**/x_*"]`. It is awaiting the OWNER's
      manual removal. An agent must not finish that removal.
      SEQUENCED AFTER 6a AND STEP 6 (an ordering, not a blocker; **6a added
      2026-09-22**): this touches `packages/types/src/index.ts`, and 6a adds the
      NEW `PunchRow` re-export to that same file while step 6 is in
      flight beside it.
      AC — **every symbol below was GREPPED 2026-09-22 before this AC was
      written (§7), and the surviving hits are named so the AC can actually be
      met; do NOT rename anything to make a grep pass:**
      (1) `\bnextLitterCode\b` over `apps/` + `packages/` `*.ts`/`*.tsx` returns
      **0** (baseline today: 1 hit, its own definition at `lib/litterCode.ts:50`).
      (2) `packages/types/src/mouseDetail.ts` no longer exists and the re-export
      line `packages/types/src/index.ts:40` is gone.
      (3) **[RESTATED 2026-09-23 — `x_*` files EXCLUDED from the scope. As
      written this asked for exactly ONE hit, but the extra hits were inside the
      `x_`-soft-deleted file itself, and `rules/core.md` forbids `rm`; a criterion
      may not demand a prohibited act. Precedent: task 11's AC (5).]**
      `\b(MouseDetail|GeneCall|HistoryEvent)\b` over the same scope, EXCLUDING
      `x_*`, returns
      **exactly ONE hit**, `app/ColonyGridView.client.tsx:60`'s
      `from './MouseDetail.client'` — a MODULE PATH, not the deleted type.
      **`app/MouseDetail.client.tsx` and the `MouseDetailDrawer` component it
      exports MUST SURVIVE** (`\bMouseDetail\b` matches the module path because
      `.` is a word boundary — an unbounded OR naive-bounded "returns 0" makes
      this AC unmeetable, which is exactly the §7 trap that just bit 9d, FIFTH
      OCCURRENCE above). Baseline today: 11 hits.
      (4) **[RESTATED 2026-09-23 — `x_*` EXCLUDED, same reason as (3).]**
      `getMouseDetail` returns **0** outside `x_*` files, which includes the comment at
      `app/MouseDetail.client.tsx:54` ("No separate getMouseDetail seed (which
      drifted)") — delete or reword it in the SAME commit, or it becomes a
      DRIFT-class stale reference the moment the file goes.
      (5) `parseLitterCode` and
      `formatLitterCode` still have live consumers and the edit creates NO new
      unused export; the mouse drawer still OPENS and still renders identity,
      cases and history; check-types + lint 0 errors across the monorepo.

## Superseded inline `sex` editor, and the 10 / 12 merge notes

- [x] Inline `sex` editor — **SUPERSEDED 2026-09-22, NOT SHIPPED AS A FEATURE.**
      It was built (`b5a990b`) and reviewed the same day; hours later the owner
      decided to REMOVE the whole inline-edit mechanism (task **11**), so this
      task is CLOSED as superseded rather than as a delivered feature. The
      verdict is preserved below because it is the EVIDENCE BASE for that
      decision, and because two of its parts are explicitly KEPT.
      **REVIEWER VERDICT 2026-09-22: PASS — data layer proven, interaction layer
      explicitly NOT VERIFIED (no browser in the environment).**
      DATA LAYER — PASS, proven: all three values reachable
      (`U5BFA` → `F5BFA` → `M5BFA` → `U5BFA`); no `mouseLabel` key in the
      result; `SEED_COLONY` unmutated; no sex control in the grid cell;
      check-types + lint 0 errors.
      INTERACTION LAYER — NOT VERIFIED, and the reviewer found THREE REAL
      PROBLEMS BY READING. **These three ARE the evidence base for the owner's
      removal decision — they are WHY the mechanism is going, not incidental
      bugs to be fixed later:**
      (1) a native `<select>` does NOT blur when an option is picked, so the
      edit sits uncommitted with no Save affordance and no pending cue;
      (2) Escape closes the whole Sheet — Radix registers on `ownerDocument`
      with `capture: true`, which runs BEFORE React's handler, so
      `editable-cell.tsx:115-116`'s "stop propagation" comment is FALSE for
      this consumer;
      (3) picking an option and then closing via the overlay may SILENTLY LOSE
      the edit (Radix dismisses on `pointerdown`, before focus moves).
      **KEEP — do NOT delete these along with the control (task 11 ring-fences
      them, task 13 — formerly 12 — is their consumer):** the STALENESS FIX (the drawer looks
      the live `MouseCell` up by `metaId` on every render instead of using the
      click-time snapshot) was ruled ENTAILED by the AC, not scope creep, and
      was PROVEN — the snapshot path renders `U5BFA` after the edit and fails
      the AC. The STORE-DIRECT WIRING (`updateMouse(metaId, { sex })`) is kept
      for the same reason.
      RECORD-ONLY FINDINGS from the same review (no AC, no task; dispositions
      named so nobody re-opens them): the commit's comment at
      `MouseDetail.client.tsx:73-74` claims a guard that does NOT exist — if
      that comment (or its neighbours referring to "the sex editor below")
      survives the removal, task 11 deletes or rewords it in the same diff;
      `next as Sex` was an unchecked cast — it dies with the control;
      `findMouseByMetaId` is now the FOURTH colony traversal (alongside
      `ColonyGridView`'s memoized map, `updateMouse.ts`'s inline finder and
      `gridSelection.ts`) — it SURVIVES the removal, recorded for the
      system-architect, NOT to be fixed here; `editable-cell.tsx:11`
      contradicted line 99 (DRIFT class, per the ruling in the PATTERN block) —
      moot once the file is deleted.
      Original scope, for the record: **NEW SCOPE, surfaced 2026-09-22 by the 9b AC
      review; NOT part of the 2026-09-16 architect design.** There is no way to
      change a mouse's sex in the UI: the only path was back-inference from a
      typed label (removed by 9a) and `app/MouseDetail.client.tsx:125-126`
      renders sex read-only, yet sexing U→M/F is a core P0-b workflow (plan §3 P0-b:
      "sexing U→M changes the label, metaId stays stable"). `updateMouse`
      already accepts `{ sex }` — only the control is missing. WHERE the control
      goes was the one DESIGN question here and it was **DECIDED by the OWNER,
      2026-09-22: the control goes in the MOUSE-DETAIL DRAWER, not the grid
      cell.** (Superseded this task's earlier "grid cell vs. drawer vs. both, not
      decided here".) **THAT RULING IS ITSELF SUPERSEDED LATER THE SAME DAY** —
      the owner removed inline editing entirely and reopened the surface as
      "edit modal **or** mouse drawer". That "must NOT inherit 'drawer' as
      decided" warning is SPENT — the architect has since RULED drawer, and the
      surface now lives on task **13** (the 10+12 merge). UNBLOCKED 2026-09-22: its blocker 9b is DONE
      (`8ae117e`) — the label is a projection now, so a UI sex edit can no
      longer desync a stored `MouseCell.mouseLabel` or re-add the label write
      9a removed.
      AC (MET at the review, then SUPERSEDED — do NOT re-run it; task 11
      deletes the control this AC describes): a user can change sex to M, F or U
      **from the mouse-detail drawer**
      without typing a label, and **no sex control exists in the grid cell**
      (owner's decision, negative form so it is falsifiable); the rendered label
      updates on the next render and no label field
      is written; setting seed mouse 603 (`U5BFA`) to F renders `F5BFA` in the
      grid and the drawer; check-types + lint 0 errors.
**10. — MERGED INTO 13 (2026-09-22). OWNER DECIDED, verbatim: *"merge into one
task."*** Step 10 was "punch add/remove UI in the mouse-detail drawer (location
picker, effective date, note; remove = soft-delete via step 7)" with its four
acceptance criteria and its blockers (6a, 7, Q43-narrow — the last of which was
ANSWERED by the owner 2026-09-22 and is gone). It is NOT dropped and
NOT done: every word of its scope, its ACs and its "THIS AC IS NOT STALE UNDER
OPTION B" note now live in **task 13** below, as that task's PUNCH half. WHY the
merge: 10 and 12 are the SAME SURFACE — 12's punch row was a read-only projection
LINKING to 10's section, which forced the awkward "12 is blocked by 10 or it
points at nothing" ordering. One task dissolves it. Step 10's own still-open
architect item (the ZERO-ACTIVE-PUNCHES FLOOR) was carried into 13's OPEN section
and is **CLOSED 2026-09-22 by the owner, BY CONSTRUCTION — see task 8f**;
the `untagged` adoption it used to carry is task **8d** and is read there, not
here. This note follows the step-9 split precedent above: the record of what the
task contained stays, the checkbox moves to the successor.

Task **12**'s merge note sits at ITS own old position, below task 11.

- [x] 13. **DONE 2026-09-22 (`91bb988`), reviewer PASS — ALL 12 ACs MET.**
      VERIFIED by driving the real store modules under Node (no browser):
      seed mouse 603 `U5BFA` → `updateMouse(603, { sex: 'F' })` → **`F5BFA`**
      with NO `mouseLabel` key on the cell (AC 3/4/5); `addPunch(ear)` →
      **`F5BFAe`** (AC 9); `removePunch` → back to **`F5BFA`** with the
      `punches` row carrying `deletedAt` while the active `punches` list no
      longer holds it (AC 10/11).
      **INTERACTION-LAYER CAVEAT, same device as task 11's:** there is no
      browser in this environment, so the JSX-only criteria — (2) the composed
      label appears only inside a `<span>`, (6) every read-only part renders
      with no control and its stated reason, (12) no punch control outside the
      drawer, and (7) Cancel — were established by READING the rendered JSX and
      the data path, not by clicking. Stated rather than claimed as a click-level
      verification.
      **SEQUENCING SLIP (L4), recorded not hidden:** this task SHIPPED while its
      own blocker **task 11 was still `[~]`** — 13's BLOCKED-BY names 11
      explicitly. It is remedied by the close pass that ticks 11 (below) and by
      the AC restatement 11 needed; nothing is re-opened. Cross-referenced from
      11. This is also what exposed the SEVENTH AC defect in the PATTERN block
      (11's AC (5) phrase-grep, which THIS task made true again).
      **RECORD-ONLY FINDINGS from the closing review — no AC, no task; dispositions
      named so nobody re-opens them as defects:**
      (a) **`punches` has TWO WRITERS** — `punchMutations.addPunch`, and
      `mockColonyStore.commitIfOk`'s `findMintedPunch` back-fill for CREATION
      mints. Correct today, but it rests on a HEURISTIC ("if `nextPunchId`
      advanced, find the punch at the pre-commit id"), so a future mutation
      minting TWO punches in one call would silently lose one. **OWNER DECIDED
      2026-09-22 — *"refactor this. I like this simplification."*** → carried as
      NEW task **8e** (`punches` becomes the single source; `MouseCell.punches`
      is DERIVED from it). Not left open.
      (b) `AddMouseDialog.client.tsx` still has an UNCHECKED `e.target.value as
      Sex` cast on the CREATION path (the same cast class that died with the
      inline sex editor, on a different path).
      (c) `updateMouse`'s no-op guard MISSES the null-dob case: Save on a mouse
      with `dob === null` sends `''`, which compares unequal, so it forces a
      pointless tree rebuild and a pointless subscriber emit.
      (d) `TODAY` is a MODULE CONSTANT, so a tab left open across midnight
      defaults the punch date to YESTERDAY.
      (e) `MouseDetail.client.tsx` is **307 lines** — past `rules/development/
      code.md` §Structure's 300 SOFT line, under the 400 HARD line. A soft-line
      finding, not an unmet criterion: this task carries no line-count AC.
      (f) `IdentitySection` RE-IMPLEMENTS `buildMouseLabel`'s `+${offset}`
      formatting for display (a second formatter for one grammar).
      (g) the two drawer sections import shared constants from
      `AddMouseDialog.client` — a DIALOG is acting as a constants provider for
      its siblings.
      Original scope, for the record: **MOUSE-EDITING DRAWER — field editing + punch records in ONE task.
      MERGE of step 10 and task 12, OWNER DECIDED 2026-09-22: *"merge into one
      task."*** The drawer is one surface and now has one task: the Identity
      section's part-by-part field editor AND the punch add/remove section.
      Everything below is carried from 10 and 12 as written; the merge is the only
      thing decided here.
      OWNER'S CORE REQUIREMENT, verbatim: *"we use a edit modal or mouse drawer to
      update a mouse data"* / *"for mouse label we will show all part by part so we
      can edit each."* That is the CLOSURE of **9a** (no free-text label edit, no
      `sex` back-inference from a typed string) and **9b** (no stored label; the
      label is a read-time projection). This task must not reintroduce either.

      **A. FIELD-EDITING HALF (from task 12 — architect's ruling, already
      recorded).**
      (i) **SURFACE = the DRAWER, not a modal.** `MouseDetailDrawer` already
      exists, is store-driven, and already carries the LIVE-LOOKUP fix that a new
      modal would have to re-solve from scratch (task 11 ring-fences it for exactly
      this consumer).
      (ii) **SHAPE = an EDIT MODE on the existing Identity section** — a pencil
      toggle, LOCAL DRAFT state, Save / Cancel, and ONE atomic
      `updateMouse(metaId, patch)` on Save. **NOT per-field live commit:** several
      parts compose one label and the owner wants the COMPOSED RESULT VISIBLE
      BEFORE it is committed.
      (iii) **PHASE = P0.7-b** (this file), not P0.8. P0.7-b IS "punch records +
      mouse-identity label composition": 9a deleted label-as-INPUT, 9b deleted
      label-as-STORAGE, and "edit the PARTS, not the string" is the third and
      CLOSING move of that arc. Every P0.8 deliverable is cage-location /
      transfers / drag-and-drop — none is a field-edit surface.
      PARTS TABLE — editable / read-only / derived. **The UI must STATE THE REASON
      for each read-only part** (a control that is simply absent reads as a bug):
      - `sex` — **EDITABLE** (M/F/U select).
      - `genotype`, `dob` — **EDITABLE.** Not label parts, but they inherit the
        inline edits task 11 removed and are already in `UpdateMousePatch`. NOTE:
        P1's per-gene allele picker supersedes free-text genotype later — this is
        PARITY, not new design.
      - `pupNumber` — **READ-ONLY.** `packages/types/src/grid.ts` says "BIRTH
        number, immutable" (verified). Do NOT add it to `UpdateMousePatch`.
        RECORDED AS OPEN for the owner: is typo correction ever allowed?
      - `litterCode` — **READ-ONLY.** It is litter MEMBERSHIP, not a text field;
        changing it is RE-PARENTING and interacts with `advanceLitterCounter` /
        `peekNextLitterCode`. A separate flow if it is ever wanted.
      - `pupOffsets` — **READ-ONLY CHAIN.** Assigned BY the transfer flow,
        accumulates, and its ORDER is significant to the rendered string. Typing
        it would fabricate a renumber provenance that no transfer produced — the
        "wrong data, no error" class this family keeps hitting. Label it
        "assigned on transfer"; P0.8's transfer flow is the only writer.
      - punches (`e…`) — **RECORDS.** See the PUNCH ROW note below: the Identity
        section shows a read-only PROJECTION ("2 active ear punches → `ee`"); the
        punch section of the SAME drawer (half B) is where rows are added and
        removed.
      - `.N` — **DERIVED** from done/verified Tissue-collection cases. Read-only,
        with the reason shown: "changes when a Tissue-collection case reaches
        done/verified; not a field."
      LIVE COMPOSED RESULT: rendered from the DRAFT through the SAME functions
      every other surface uses —
      `composeMouseLabel(buildMouseLabel({...draftParts, earPunchCount from live
      punches}), reclipIndex.get(metaId) ?? 0)`. **NEVER a template string, never
      a second builder.**

      **B. PUNCH HALF (from step 10 — unchanged scope).** Punch add/remove UI in
      the same drawer: location picker, effective date, note. **Remove =
      SOFT-DELETE through step 7's store wrappers** — never a hard delete, never a
      splice out of the record; splicing the row out of the VIEW is what "mask at
      read" means.

      **PUNCH ROW — WHAT THE MERGE CHANGED (the one substantive consequence).**
      Under the old split, 12's punch row was a read-only projection linking OUT to
      another task's section. Now both halves live in this one task: the **Identity
      section shows the composed `e…` projection**, and the **punch section in the
      same drawer is where punch rows are added and removed**. ONE mutation path,
      TWO views of it. **NO second add/remove UI anywhere** — not in the Identity
      section, not outside the drawer.

      **BLOCKERS — recorded as they are, not averaged:**
      - BLOCKED-BY **step 7** (the `punches` seed + the `usePunches(metaId)`
        selector) and **task 11** (landed `28d38df`; the close pass is the
        reviewer's and is not asserted here). Step 7 landed in source 2026-09-22
        (main session committing).
      - **Q43-narrow is NO LONGER A BLOCKER — RESOLVED 2026-09-22 (owner):**
        *"tissue is independent each other with toe."* A Tissue-collection case
        does NOT mint a `toe` punch row, so `punches` records identification marks
        only, `.N` and punch rows describe DIFFERENT events with no
        double-counting, and this UI shows **ONE mint site**. It was the punch
        half's only gate; there is now no half-gated criterion and no coupling
        between the two halves.
      - The 9b half of the old step-10 blocker CLEARED 2026-09-22 (`8ae117e`): the
        "adding an 'ear' punch changes the label immediately" criterion was
        IMPOSSIBLE while the label was a stored string and is now reachable.

      **AC — grouped by half so the two surfaces stay legible. Field criteria are
      written as DATA-FLOW DIRECTION: composed strings flow OUT to render, never
      IN to a mutation.**
      FIELD half:
      (1) NO argument to `updateMouse(` derives from `buildMouseLabel` /
      `mouseLabelOf` / `composeMouseLabel`; those three appear ONLY inside JSX
      render expressions.
      (2) the composed label appears ONLY inside a `<span>` — never as an
      `<input value=…>` or a `<textarea>`.
      (3) the ONLY write to `sex` is `updateMouse(metaId, { sex: <select value> })`
      and NO `sex` derives from a string's first character (9a's back-inference
      stays dead).
      (4) **no `mouseLabel:` KEY DECLARATION under `packages/types/src`** — 9d's
      RESTATED form. Do NOT write the bare-identifier grep ("`mouseLabel` returns
      0"): it returns 2 legitimate hits (the surviving `lib/mouseLabel.ts` module
      name, and prose) and is unmeetable. See the FIFTH OCCURRENCE in the PATTERN
      block.
      (5) THE 603 PROBE: seed mouse 603 (`U5BFA`) edited to `F` renders `F5BFA`
      in BOTH the drawer AND the grid, with NO label write anywhere.
      (6) every READ-ONLY part renders with NO input control **and** with its
      stated reason visible.
      (7) Cancel discards the draft and writes NOTHING.
      (8) check-types + lint 0 errors across the monorepo.
      PUNCH half (no gate left — Q43-narrow answered; deliberate breakage, §19):
      (9) adding an `ear` punch changes the drawer + grid label to the `e` form
      immediately.
      (10) removing it restores the bare label.
      (11) the removed row still exists with `deletedAt` set (visible in the
      drawer's history, hidden from the active list — **surfaced via the
      punch-history selector `usePunches` (step 7), NOT via
      `MouseCell.punches`**).
      (12) NO punch control exists outside the drawer.
      **CRITERIA (9)-(12) ARE NOT STALE UNDER OPTION B AND DID NOT CHANGE**
      (recorded so it is not re-litigated): they never named `MouseCell.punches`
      as the source, so B satisfies them as written; the tightening in (11) only
      forecloses the re-reading that caused step 6's schema flip.

      **NOTHING OPEN ON THIS TASK ANY MORE — both items closed 2026-09-22:**
      ~~**ZERO ACTIVE PUNCHES — still UNDECIDED** (floor vs no floor: may a mouse
      end up with zero active punches at all?). Carried from step 10.~~
      **CLOSED BY CONSTRUCTION 2026-09-22 — OWNER DECIDED** (*"we never delete a
      untagged record. we keep together and if we see 1 active tag with untagged
      then we can target which mouse is not tagged."*): creating a mouse ALWAYS
      mints an `untagged` punch and that row is NEVER tombstoned, so a mouse can
      never reach zero active punches. There is a FLOOR, and it is structural
      rather than a rule someone must enforce at removal time. It was the
      architect's to rule on; the owner settled it. The model and the work live
      on NEW task **8f** — read it there, not here.
      The `untagged` adoption itself and the owner's earlier verbatim words live
      on task **8d** (*"when babies came to us, they might not have a tag…"* /
      *"add this type into enum for punchs table"*).
      The `punches` TWO-WRITERS finding (record-only (a) above) is likewise NOT
      open — OWNER DECIDED the refactor, task **8e**.
      THE TWO COLLISIONS, carried over from old step 10 because whoever reads
      this next still needs them (8d answers BOTH): (1) `punch_location` is a
      CLOSED CHECK in `0026_punches.sql` — a fourth value is a MIGRATION (PAID
      by 8d scope (a)); (2) it may
      contradict task **8c, which SHIPPED 2026-09-22** — `buildMouseCell` /
      `addMouse` minted `location: 'toe'` at creation, asserting a physical mark
      an untagged pup does not have; it resolves by the `'toe'` literal simply
      leaving `buildMouseCell`. **8c is NOT marked defective on account of any of
      this** — it shipped against the contract as it stood.

- [x] 11. **DONE 2026-09-22 — landed `28d38df`, the one ISSUE fixed in `5f4586d`,
      now CLOSED.** The removal itself passed at the first review; the single
      ISSUE was criterion **(5)**, which required two stale comment PHRASES be
      reworded in this task's own diff and found both still present. `5f4586d`
      handled them, and the SPLIT between the two is the instructive part:
      - `MouseDetail.client.tsx:69` — *"the sex editor below never fires for a
        mouse it can't find"* was **FALSE and is REWRITTEN**: there IS a sex
        editor again (task 13), and on the not-found path Save DOES fire,
        returning `{ok:false}` and showing the error.
      - `MouseDetail.client.tsx:24` — *"the drawer itself writes a patch via the
        store"* was FALSE when 11 landed and became **TRUE AGAIN when 13
        shipped**, so it was LEFT AS WRITTEN. Correct, and it is why (5) is
        unmeetable as literally worded.
      **AC (5) RESTATED 2026-09-22, in 9d's form (see the SEVENTH OCCURRENCE in
      the PATTERN block):** the criterion is that **no comment in
      `MouseDetail.client.tsx` makes a FALSE claim**, not that a phrase greps to
      zero. Restated in place below; nothing is carried forward, no §7 sibling
      task is owed.
      **SEQUENCING SLIP (L4), recorded on both tasks:** task **13 shipped while
      this task was still `[~]`**, although 13's BLOCKED-BY names it. Remedied by
      this close; nothing re-opened.
      INTERACTION-LAYER CAVEAT stands as written at the foot of this task — no
      browser, so (3) was established by reading the rendered JSX.
      Original scope, for the record: **REMOVE inline cell editing — OWNER DECIDED 2026-09-22.** Owner verbatim, so attribution sits on the task and
      not only in STATUS: *"lets simplify we will remove cell click edit feature
      from now on > work this first no more cell direct update. delete all
      related code."* / *"we use a edit modal or mouse drawer to update a mouse
      data."*
      WHY (evidence base, not incidental bugs): the three interaction defects the
      sex-editor review found by reading — uncommitted-on-pick `<select>`, Escape
      closing the whole Sheet through Radix's `capture: true` `ownerDocument`
      handler, and a pick-then-overlay-dismiss that silently LOSES the edit. See
      the superseded inline-`sex`-editor task above for the full verdict.
      **ORDER IS THE OWNER'S: removal FIRST, replacement (task 13, formerly 12)
      LATER.** The
      window in between, in which NO mouse field can be edited in the app, is
      DELIBERATE and ACCEPTED — it is not a regression and must not be patched
      over by reinstating a control.
      SCOPE — a REMOVAL, not a redesign. Nothing else changes:
      (a) delete `components/ui/editable-cell.tsx` (181 lines at `b5a990b`);
      (b) its THREE consumers — `ColonyGridView.client.tsx` **genotype** (`:1969`
      at `b5a990b`) and **dob** (`:1992`), and `MouseDetail.client.tsx` **sex**
      (`:163`). Anchor on the CELL each one renders, not on the line number: the
      developer is mid-removal and 8b/9d have already moved these numbers once.
      Those cells become READ-ONLY; **no dead double-click affordance may
      remain.**
      SOFT-DELETE TRAP — say it or it gets tried: an `x_` rename does NOT
      soft-delete TS source here, because both apps' `tsconfig.json` carry
      `exclude: ["**/x_*"]` (same scoping fact 9c records at its "SCOPING FACT"
      paragraph). `editable-cell.tsx` is therefore deleted as an ORDINARY
      REVIEWABLE DIFF, recoverable from git. Removal path per the owner's own
      *"delete all related code"* and the dispatch instruction — RECORDED here,
      not ruled here; `rules/core.md` is not reinterpreted by this task.
      **RING-FENCED, DO NOT DELETE** (these are task 13's consumers, and on the
      day this lands they will look unused from the UI side — they are not dead
      code): `lib/updateMouse.ts` `updateMouse` and `UpdateMousePatch` (incl.
      `.sex`); the drawer's LIVE-LOOKUP staleness fix (`findMouseByMetaId` +
      looking the `MouseCell` up fresh every render in
      `MouseDetail.client.tsx`); the store-direct wiring. **BASELINE GREPPED
      2026-09-22:** `updateMouse` still has exactly ONE UI caller after the
      removal — `ColonyGridView.client.tsx:1034`, the **Sac context-menu** — so
      it is not a zero-consumer export even today.
      STALE COMMENTS GO IN THE SAME DIFF (DRIFT rule, PATTERN block): the
      `MouseDetail.client.tsx` header comment that justifies the live lookup by
      "the drawer itself writes a patch (e.g. sex)" (`:22-26` today) and the
      not-found-fallback comment ending "the sex editor below never fires for a
      mouse it can't find" (`:66-67` today) both describe a control that is
      leaving. Reword them — the live lookup STAYS and still needs a WHY (task 13
      will write through it again).
      BLOCKED-BY: nothing. BLOCKS: 13 (formerly 12).
      **BASELINE, stated so this AC is not misread as already-satisfied-by-magic
      (same device as 6a): the dispatched developer's removal is LIVE BUT
      UNCOMMITTED as of 2026-09-22.** In the uncommitted tree
      `components/ui/editable-cell.tsx` is already gone, `EditableCell` greps to
      0 in SOURCE, and the drawer's sex control is gone (`MouseDetail.client.tsx`
      renders sex as text). The criteria below are the CLOSING check on that
      diff, not a fresh discovery.
      AC:
      (1) `EditableCell|editable-cell` over `apps/colony_client_web` SOURCE
      (EXCLUDING `.next/`, which is build output and legitimately still carries
      stale occurrences — ~157 across 22 files as of 2026-09-22, a number that
      moves on every rebuild, so exclude the directory rather than matching the
      count) returns **0**, and `components/ui/editable-cell.tsx` does not exist.
      (2) `onDoubleClick|dblclick|doubleClick` over the same scope returns **0**
      — the falsifiable form of "no dead double-click affordance remains".
      GREPPED 2026-09-22 without any glob: every hit is under `.next/` (79
      across 33 files, including React-DOM vendor chunks), SOURCE is already 0,
      so the `.next/` exclusion is what makes this criterion meaningful.
      (3) genotype, DOB and sex all render as PLAIN TEXT; grep shows no `<input>`
      / `<select>` / editing state left behind in those three cells.
      (4) RING-FENCE HELD: `updateMouse`, `UpdateMousePatch.sex` and the drawer's
      live `findMouseByMetaId` lookup all still exist; the Sac context-menu still
      calls `updateMouse` and still works.
      (5) ~~grep `the sex editor below|drawer itself writes a patch` returns 0.~~
      **[RESTATED 2026-09-22 — UNMEETABLE AS WRITTEN, see the SEVENTH OCCURRENCE
      in the PATTERN block: no comment in `MouseDetail.client.tsx` makes a FALSE
      claim.** The first phrase WAS false and is reworded (`5f4586d`); the second
      became TRUE again when task 13 shipped a drawer that does write a patch via
      the store, so a zero-hit grep can never pass without deleting a true
      comment. Intent met; wording fixed.**]**
      (6) check-types + lint 0 errors across the monorepo; the grid still adds a
      line, cage, slot and mouse, and the drawer still opens and renders
      identity, cases and history.
      INTERACTION-LAYER CAVEAT, carried over from the review it supersedes: there
      is no browser in this environment, so (3) is established by READING the
      rendered JSX, not by clicking. Say so in the close note rather than
      claiming a verification that did not happen.
**12. — MERGED INTO 13 (2026-09-22, the same owner decision: *"merge into one
task."*)** Its body MOVED into task 13, above. It contained: the
owner's verbatim requirement; "the label is shown PART BY PART — sex, pup number,
`+offset`, litter code, ear-punch suffix — so each PART is editable", which is the
CLOSURE of 9a (no free-text label edit, no `sex` back-inference) and 9b (no stored
label); the architect's three rulings (i) surface = drawer, (ii) shape = edit mode
on the Identity section, (iii) phase = P0.7-b; the PARTS TABLE; the LIVE COMPOSED
RESULT rule; and ACs (1)-(8). All of it is now task **13**'s half A, word for
word, and 12's recorded-OPEN item (may a `pupNumber` typo ever be corrected? —
the owner's) travels with it. The checkbox moved to 13; nothing is left here.

## `TASKS.md` P0.7 stub as it stood before the archive (2026-09-23)

Kept verbatim because it is the only place some of these close notes were
written; the LIVE stub in `TASKS.md` now carries STATE only (`rules/docs.md` §1).

### P0.7 Litter recording + auto tasks — P0-b (MVP v0.2) — IN PROGRESS (v1 [x] · P0.7-b steps 1,2,3,4,5,8,8b,8c,9a,9b,9c,9d + 11 (inline-edit removal) + 13 (mouse-editing drawer) + **6a, 7, 8d, 8e, 8f** [x] all reviewer PASS + inline sex editor [x] SUPERSEDED-not-shipped; **step 6 stays [~] — one AC clause unmet, BLOCKED-BY new 8g**; NEW 8g (restore reference-equality) → NEW 8h (`punchId` uniqueness guard) + 1 backlog item (path-copy `moveMouse`, no date) + 9e + SEED_COLONY note + `x_`-inert-in-packages note [ ] · 6 base tasks [ ])

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
> **Step 4 (professor GATE) CLOSED 2026-09-22 — it holds nothing.** Q39/Q41/
> Q43-main/Q44 answered, Q40 dissolved, Q45 RESOLVED 2026-09-18 (migration 0027
> `pup_number_offsets` + `MouseCell.pupOffsets`), Q43-narrow RESOLVED 2026-09-22
> (owner: *"tissue is independent each other with toe"* — a Tissue-collection
> case does NOT mint a `toe` punch row; `.N` and punch rows are DIFFERENT events,
> one mint site), **Q42 CLOSED 2026-09-22 (owner: `other` is a placeholder,
> nothing to decide)**. No open question gates P0.7-b any more.
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
> `punches` seed + `usePunches(metaId)`; old step 10's AC is unchanged and only
> TIGHTENED to name the selector (it is now task 13's punch-half AC). SIXTH AC defect logged in the phase file's
> PATTERN block, a NEW SUB-SHAPE: an AC that silently MANDATES a schema change
> because the state shape it operates on has no room for what it demands.
> ~~**IN FLIGHT (developers dispatched 2026-09-22): step 6** `lib/punchMutations.ts`
> (the NEW-module requirement stands on SRP alone, since 8b took the file to 307;
> now BLOCKED-BY 6a) **and NEW step 11 — REMOVE inline cell editing.**~~
> **[STALE 2026-09-22: 11 is CLOSED `[x]` and step 6 has LANDED in source — see
> the CLOSED / DOC-LAGS-SOURCE block below, which is the current state.]**
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
> `pointerdown`). KEPT through the removal (task 13 is their consumer): the
> drawer's live-lookup staleness fix (ruled ENTAILED by the AC, not scope creep —
> the click-time snapshot renders `U5BFA` after the edit and fails the AC) and
> the store-direct `updateMouse` wiring. The earlier "the control goes in the
> mouse-detail drawer" ruling was SUPERSEDED when the owner reopened the surface
> as "edit modal **or** mouse drawer" — and the ARCHITECT HAS NOW RULED it back
> to the DRAWER (2026-09-22, see 12 below).
> **11** (**`[x]` CLOSED 2026-09-22** — the `[~]`/"developer dispatched" marker
> below is HISTORY, the CLOSED block above is the state) deletes `components/ui/editable-cell.tsx`
> + its three consumers (grid genotype + dob, drawer sex); the cells go read-only
> with no dead double-click affordance; nothing else changes. An `x_` rename is
> NOT a soft delete here (both tsconfigs `exclude: ["**/x_*"]`), so the file goes
> as an ordinary reviewable diff, recoverable from git. **13** (**`[x]` CLOSED
> 2026-09-22**; the `[ ]` marker in this historical paragraph is superseded by the
> CLOSED block above — the 10+12
> MERGE — **OWNER DECIDED 2026-09-22, *"merge into one task"***: same surface, and
> 12's punch row only pointed at 10's section, so the split's 12-blocked-by-10
> dependency dissolves. 13 owns the WHOLE mouse-editing drawer — field editing AND
> punch add/remove, one mutation path, two views. BLOCKED-BY 7 + 11 only —
> Q43-narrow was the punch half's last gate and was answered 2026-09-22. 10 and 12
> keep merge notes in the phase file and no checkbox) — **DESIGN RULED 2026-09-22:** the surface is the **DRAWER** (`MouseDetailDrawer` exists,
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
> writer), punches (the Identity section shows the composed `e…` projection; the
> punch section of the SAME drawer is where rows are added and removed — no
> second add/remove UI), `.N` (derived from done/verified Tissue-collection cases). The
> live result composes through `composeMouseLabel(buildMouseLabel(...))` — never
> a template string, never a second builder; ACs are DATA-FLOW DIRECTION (labels
> flow OUT to render, never IN to a mutation) plus the 603 probe (`U5BFA`→`F5BFA`
> in drawer AND grid, no label write). Owner's requirement, verbatim: *"for mouse
> label we will show all part by part so we can edit each"* — the closure of 9a
> (no free-text label, no sex back-inference) and 9b (no stored label); 12 must
> not reintroduce either. **The window between 11 and 12, in which NO mouse field
> is editable in the app, is DELIBERATE (owner chose removal first and REAFFIRMED
> it 2026-09-22 — no stopgap control) — not a regression, and SETTLED.**
> **CLOSED 2026-09-22, both reviewer PASS: 11 `[x]`** (inline-edit removal,
> `28d38df`; its one ISSUE — AC (5)'s stale-comment greps — fixed in `5f4586d`,
> and the AC is **RESTATED** to "no comment in `MouseDetail.client.tsx` makes a
> FALSE claim", because one of the two phrases became TRUE again when 13 shipped:
> SEVENTH AC defect, a phrase grep a later task re-validated) **and 13 `[x]`**
> (the 10+12 MERGED mouse-editing drawer, `91bb988`, **all 12 ACs** — `U5BFA` →
> `updateMouse(603,{sex:'F'})` → `F5BFA` with no `mouseLabel` key,
> `addPunch(ear)` → `F5BFAe`, `removePunch` → `F5BFA` with the log row carrying
> `deletedAt` while the active list drops it; JSX-only criteria read, not clicked
> — no browser). **L4 SEQUENCING SLIP recorded on both: 13 shipped while 11 was
> still `[~]`, although 13's BLOCKED-BY names it; remedied by 11's close.**
> RECORD-ONLY from 13's closing review (no AC, no task; full list on the task):
> `AddMouseDialog` still has an unchecked `e.target.value as Sex` cast on the
> CREATION path; `updateMouse`'s no-op guard misses the null-dob case (Save sends
> `''`, compares unequal, forces a pointless rebuild + emit); `TODAY` is a MODULE
> CONSTANT so a tab open across midnight defaults the punch date to yesterday;
> `MouseDetail.client.tsx` is 307 lines (past code.md's 300 SOFT line, under the
> 400 hard one — 13 carries no line criterion); `IdentitySection` re-implements
> `buildMouseLabel`'s `+${offset}` formatting; and the two drawer sections import
> shared constants from `AddMouseDialog.client`, making a dialog a constants
> provider for its siblings.
> ~~**DOC LAGS SOURCE: 6a, 6, 7 and 8d have LANDED in source 2026-09-22** (13's
> reviewer drove the real punch store end to end, which is only possible if they
> did) **but still show `[ ]`/`[~]` — their ticks and close notes are owed by the
> pass carrying each reviewer verdict; this pass does not tick them.**~~
> **[PAID 2026-09-22 — see the CLOSES block below.]**
> **CLOSED 2026-09-22, all reviewer PASS at HEAD `23474e7`, verified by a closing
> review that drove the real compiled pure layer with 41 probes including 400
> randomised add/remove operations: 6a, 7, 8d, 8e, 8f `[x]`.** **6a** — every
> criterion, incl. `grep deletedAt packages/types/src/grid.ts` = 0. **7** — seed
> equality holds AS AN EQUALITY (44 active rows == summed fixture
> `punches.length`), zero seeded tombstones, the store defines no punch counter
> of its own, both wrappers one line; it closes while step 6 is still `[~]` (L4
> shape, stated: 7 wraps 6's SHIPPED mutations). **8d** — PASS with TWO ACs
> **RETIRED by 8f, stated as retired rather than passed** (the "creating with
> `toe` chosen" clause and the "no location literal in `buildMouseCell`" clause
> are actively contradicted by the shipped design), and ONE AC that could not be
> re-run — the migration's CHECK behaviour, established by FILE-READ because
> there was no live Postgres this session, recorded as file-read and NOT as a
> claimed probe. **8e** (`20e020d`) — one append path, `findMintedPunch` gone,
> creation punch present via all four rails. **8f** — was ISSUE on AC (8) (the
> `'untagged'` entry in `PUNCH_LOCATION_OPTIONS` was still there), **FIXED in
> `23474e7`** by MOVING the constant into `PunchSection` rather than filtering
> it: 8f had deleted the dialog's select, leaving the dialog defining a list it
> no longer used and exporting it to a sibling — the quality-gate smell the
> review had separately flagged — and one move resolves both.
> **STEP 6 STAYS `[~]`, BLOCKED-BY new 8g.** Its clause "every other mouse is
> reference-equal" is UNMET: it HELD at 6's own commit `96f5a8d` and was broken
> by 8e's `projectPunches`, which spreads every line, cage, slot and mouse
> unconditionally — **not a decision 8e made** (8e's shape text says
> `grid.punches` "becomes a PROJECTION", never "rebuild every object"). The
> clause is restored AS WRITTEN by **8g**; it is NOT retired, because RETIRED is
> the device for CLOSED tasks (8b→11, 8d→8f) and 6 is open.
> **NEW 2026-09-22, in THIS ORDER — 8g THEN 8h, then one backlog item:**
> **8g `[ ]` — restore step 6's reference-equality.** `projectPunches` rebuilds
> every object, so the clause does not hold; 8g makes it hold — that is the whole
> task. The guarantee is BOTTOM-UP and all five rules are required: mouse by
> reference when its projected `PunchRef[]` is value-equal; slot when every mouse
> was reused; cage when every slot; line when every cage; and the root may also be
> reused, harmless because `commit` compares the `ColonyState` object.
> SEED-ALIASING COST, stated not hidden: with reuse the initial projection returns
> `SEED_COLONY` itself, so the first snapshot ALIASES the fixture — safe today
> (every mutation is immutable-by-construction and `moveMouse` clones before
> splicing) but `mockColonyStore.ts` says "never mutate SEED_COLONY arrays", so it
> is an **AC, not an assumption**.
> **8h `[ ]` — `punchId` uniqueness guard.** `mintPunch` owns the
> `{grid, punches}` re-derivation plus a DEV-GATED duplicate-`punchId` guard at
> `commit()` — the same species as `addPunch`'s `untagged` refusal, a store-level
> rejection of a programmer error, NOT a test. REJECTED with its reason so it is
> not re-proposed: a BRANDED `punchId` is genuinely structural but lands a
> mock-era-only invariant in `packages/types` and needs blessed casts at
> `seedPunches` and at the MVP2 deserialiser, where the server owns uniqueness and
> the brand degrades to an explicit cast site. The guard has TWO HALVES with
> DIFFERENT LIFESPANS: uniqueness SURVIVES MVP2 and then validates server
> responses; `max(punchId) < nextPunchId` is MOCK-ERA ONLY.
> **BACKLOG `[ ]`, no date — path-copy `moveMouse`.** The obvious fix does NOT
> work: re-projecting after `structuredClone` **cannot** restore identity, because
> the clone has already produced fresh mice and an identity-preserving projection
> would faithfully reuse the clones. So routing `applyColonyMove` through
> `commit()` alone is a NO-OP and is not worth a task; only a path-copy
> `moveMouse` does anything. Deferred — drag-and-drop shipped, not worth
> rewriting now.
> **DEPLOY VERDICT 2026-09-22 (architect + reviewer agree): NOTHING FOUND BLOCKS
> MVP1.** Every finding is value-correct at HEAD; the only observable is
> re-render count on a demo-sized colony. 8g/8h are CONTRACT work, not incident
> response.
> **RECORD-ONLY from the closing review (no AC, no task):** the
> `punches`/`punches` naming collision now inside task 7's AC text
> (`ColonyState.punches` vs `MouseCell.punches` deliberately share a name, so the
> AC reads "punches.length equals the sum of punches.length" — verified as
> intended, text left as is); `colonySeed.maxPunchId`'s comment saying the
> counter's source "moves to the log", a move that did not happen; 8f's scope text
> naming "the mint in `buildMouseCell`" when the mint lives in `addMouse` via
> `mintPunch`; 8d's "regenerate SCHEMA.md + ERD" scope item, not run and a no-op
> diff anyway since SCHEMA.md records indexes and not CHECK constraints; and the
> MVP-ladder L3 note that the mock fixture is isolated by FILENAME rather than by
> its own directory, with a header calling it "anonymised-but-realistic" — the
> opposite of the ladder's "unmistakable / marked values".
> ~~**8e `[ ]`** — `punches` becomes the SINGLE SOURCE~~ **[CLOSED `[x]`, see
> above; the historical description below is kept for its decision record]**
> (*"refactor this. I like
> this simplification."*): `punches` holds every row active + tombstoned,
> `grid.punches` becomes a projection off it (filter `deletedAt` → `PunchRef`),
> and the SECOND WRITER — `mockColonyStore.commitIfOk`'s `findMintedPunch`
> back-fill and its "`nextPunchId` advanced → find the punch at the pre-commit
> id" HEURISTIC — is DELETED, removing the failure mode where a future mutation
> minting two punches in one call silently loses one. Fixtures keep their nested
> shape (seed INPUT; the store normalises on init). **The DTO contract does NOT
> change** — `MouseCell.punches` stays active-only, so 6a's
> `grep deletedAt packages/types/src/grid.ts` = 0 guard is repeated in 8e's AC.
> WHY, for code that landed hours ago: it matches the real server — one `punches`
> table, two queries, one `WHERE deleted_at IS NULL` (what 0026's partial index
> is for).
> ~~**8f `[ ]`**~~ **[CLOSED `[x]` 2026-09-22, see the CLOSES block above; the
> description below is its decision record]** — **`untagged` ALWAYS EXISTS and
> is NEVER REMOVED** (owner: *"we never
> delete a untagged record. we keep together and if we see 1 active tag with
> untagged then we can target which mouse is not tagged."*): creation ALWAYS
> mints an `untagged` punch (not a choice), real tags are added BESIDE it, the
> `untagged` row COEXISTS and is never tombstoned, and "needs tagging" = its only
> active punch is `untagged` (a DERIVED definition, recorded — no indicator is
> scoped). **This CLOSES the zero-active-punches FLOOR BY CONSTRUCTION** — a
> mouse can never reach zero active punches. Scope: always-mint; the
> AddMouseDialog punch-location select GOES; `untagged` rows cannot be removed
> (how the refusal reads is the architect's, the AC only needs the row to
> survive); and the SEED FIXTURES gain an `untagged` row per mouse so the
> invariant holds in seed data, not only for mice created in-app — a fixture that
> never reaches a path is exactly what hid 8c's defect for three reviews. ~~Folded
> in: the only real mock-coverage gap left, **two `ear` punches on one mouse**
> (`ee`, Q41), added as a NEW fixture mouse (`untagged` + `ear` + `ear`) — never
> by mutating an existing one, since 9b's close asserts all 21 seed mice compose
> byte-identically.~~ **[STUB CORRECTED 2026-09-22 — the detail file is right and
> this clause was wrong: the owner ruled *"leave it as it is. leave a note."*, so
> the `ee` fixture mouse was NOT added. 8f's AC (9) instead records the missing
> `ee` seed coverage as DELIBERATE, in a comment beside the punch fixtures.]**
> Every AC inspects the `punches` FIELD, never a render:
> `untagged` and `toe` both render nothing. **8d is NOT un-ticked** — what it
> shipped stands; its ACs (3)-second-clause and (6) are annotated RETIRED in
> place. **MEMO, owner asked for a memo NOT a fix (no task, no rules change):**
> 9a's anti-re-widening guard greps `lib/colonyMutations.ts`, but 8b moved
> `updateMouse` + `UpdateMousePatch` to `lib/updateMouse.ts` and NO AC greps that
> file — re-adding a label field to `UpdateMousePatch` today would trip nothing.
> Candidate remedy recorded so it is not re-derived: a compile-time guard in
> `lib/updateMouse.ts` (`type NoLabelKey<T> = 'mouseLabel' extends keyof T ? never
> : T;`) rather than a grep, which survives a file move as 8b just demonstrated.
> **8d — the `untagged` punch location
> (owner DECIDED the value AND the default 2026-09-22): migration `0028`
> re-ADDs the `punch_location` CHECK as `('toe','ear','other','untagged')` after
> VERIFYING the constraint name in `pg_constraint`, `PunchLocation` gains the
> fourth value, `MouseSpec` gains `initialPunchLocation` (riding `mouse?` exactly
> as `punchEffectiveAt` does — no mutation signature changes) with the
> AddMouseDialog select DEFAULTING to `untagged`, the `'toe'` literal leaves
> `buildMouseCell`, and 1-2 `untagged` fixture mice give the value seed coverage
> (this moves the seed `maxPunchId` off 22 — step 7 asserts the EQUALITY, not the
> literal). `untagged` renders nothing, same as `toe`; `mouseIdentity.ts`
> unchanged. SEQUENCED AFTER 6a and 6. ~~STILL OPEN: the zero-active-punches
> FLOOR~~ **[CLOSED 2026-09-22 by the owner, by construction — see 8f above]**,
> and NEW **9e —
> DELETE the dead code (owner decided 2026-09-22)**: `nextLitterCode` (zero
> consumers, re-grepped; the live path is counter-based on purpose),
> `apis/getMouseDetail.mock.api.ts` (zero importers) and the `MouseDetail` /
> `GeneCall` / `HistoryEvent` types that die with it — explicitly NOT a 9c-style
> knowledge move, since `GeneCall`'s baked `"f/+"` allele is the old genotype
> model P1 abolishes; sequenced AFTER 6a and step 6 (shared `packages/types`).
> **`untagged` PUNCH LOCATION — OWNER DECIDED 2026-09-22: ADOPT IT** (*"add this
> type into enum for punchs table"*), overruling the architect's earlier
> recommendation against it; **the design landed 2026-09-22 as task 8d above,
> and the creation default is now `untagged`, not `toe`.** ~~Still
> OPEN (recorded, not designed): the ZERO-ACTIVE-PUNCHES
> question (floor vs no floor) — adopting `untagged` did not pick a branch.~~
> **[CLOSED 2026-09-22 — the OWNER settled it: `untagged` is always minted and
> never tombstoned, so there IS a floor and it is STRUCTURAL. Task 8f.]**
> Two collisions recorded on task 13 (formerly step 10):
> `punch_location` is a CLOSED CHECK in `0026` (a fourth value is a migration),
> and it may contradict shipped task 8c, which mints `location: 'toe'` at creation.
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
> **1890 lines** (re-counted 2026-09-22 after the 6a/7/8d/8e/8f closes; it was
> 1671 before them and "~1140" earlier still), far past docs.md
> §1's 400 hard line, but a further split WAITS until
> P0.7-b closes — splitting mid-flight moves files under in-progress tasks and §2
> forbids archiving while the set has open work.
> <!-- DETAIL: active, read on demand -->
> Detail: [docs/phases/p0.7.tasks.md](./docs/phases/p0.7.tasks.md)
