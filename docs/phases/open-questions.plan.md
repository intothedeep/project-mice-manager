# PLAN §5 — Open Questions

> Split from `PLAN.md` (rules/docs.md §1). The PLAN.md stub is the truth if
> the two disagree; update both in the same edit.
> Q-NUMBERING IS PRESERVED — citations of the form `plan §5 Q43` resolve here.
> Answers are recorded as RESOLVED / DECIDED / DISSOLVED lines UNDER the
> question, never by rewriting or renumbering it.

## 5. Open Questions

1. Dev ChatGPT conversation (chatgpt.com/share/6a9b364c-…) is JS-rendered — WebFetch
   got only the title; USER must paste/export it. Decisions there are currently
   unavailable.
2. **`+N` pup-number offset grammar — RESOLVED 2026-09-17 (retitled from
   "Pooled `+N` real grammar").** The former R2-blocker (one row cannot be
   unique per mouse label) is resolved by surrogate identity 2026-09-04.
   History: the row was originally flagged as a "pooled" row (a since-killed
   multi-mouse-per-row hypothesis — see evidence below) and excluded from the
   natural unique index, matched on re-import by raw label. That flag is
   RETIRED (§1 POLICY 2026-09-15) — `+N` is ONE mouse, not many, so nothing
   needs excluding.
   **EVIDENCE GATHERED 2026-09-05 — the original "pooled" default was WRONG**
   (kept at the time by user decision as a known, recorded risk; superseded
   2026-09-15). Measured against the real workbook:
   - **Not an aggregate.** All 446 `+` forms (14 of them in Breeders, the P0
     import target) carry exactly ONE genotype, ONE DOB, ONE cage and ONE slot.
     No row shows the multiple DOBs or split genotypes a pooled row would.
   - **Not a postnatal timepoint** (hypothesis raised and killed): the DOB→
     tissue-collection gap is 7-15 days whether `+N` is 1, 2 or 10.
   - **The sum reading fits the sequences.** Reading `a+b` as pup number a+b
     makes litter numbering continuous exactly where it passes 10:
     YO plain 1-10 then sums 11-16; QE plain 8,9,10 then sums 11-19;
     MW plain 8,9,10 then sums 11-15; ZJ plain 7-10 then sums 11,12.
     17 of 446 sums collide with an existing plain number (3.8%), and at least
     some of those look like the SAME mouse written both ways
     (`M7+1UM` → 8, and `M8UM` also exists).
   - **A location word can follow the number:** `F10+1earAYY` puts `ear` right
     where the tag-suffix set (blank=foot/leg, `e`=ear, `(toe)`=toe) sits —
     this echoes the GENOTYPING sheet's `reclip (__+10)` phrasing, which is
     what originally suggested a toe/ear-clip reading (WITHDRAWN, see Q23).
   **PROTOTYPE RULE (DECIDED 2026-09-05, user) — this is what P0.3/P0.4 build:**
   parse ONLY `sex + pup_number + litter code`. `pup_number` is the LEADING
   number (`M4+10AZZ` → sex=M, pup_number=4, litter=AZZ). The `+N` part is NOT
   parsed into any structured column for now — the original string is preserved
   twice: byte-exact in `mice.raw_mouse_id`, and human-visible as a `notes` row
   attached to the mouse. These rows enter the natural key like any other
   mouse. Storage for the offset chain is a separate, in-flight design (Q45);
   parsing beyond sex+pup_number+litter is handled AFTER that lands.
   VERIFIED SAFE FOR P0 2026-09-05: under the leading-number rule the Breeders
   sheet — the only P0 import target — produces **0 collisions across 175
   (litter, pup) pairs**, so the natural key holds. Across ALL sheets there are
   146 collisions in 3528 pairs (4%), almost all of the shape
   `M1+10A` vs `M1A` — i.e. exactly the pairs the sum reading separates
   into pup 11 and pup 1. Those sheets (single-letter litters = the oldest
   data) are NOT imported in P0.
   **RESOLVED 2026-09-17: Q2 and Q23 were THE SAME QUESTION, and the sum
   reading is confirmed** — `M4+10AZZ` is pup 14 of litter AZZ, reached by a
   pup-number offset assigned on transfer, not a clip count. The offset is
   assigned when the destination cage already holds that pup number, and it
   ACCUMULATES across transfers (`1+10`, then `1+10+20`, …). Non-P0 sheets
   still need the offset-storage design (Q45) before those rows can be
   imported.
   COST OF THE EARLIER "pooled" DEFAULT (retired 2026-09-15, kept for the
   record): rows flagged that way were excluded from the natural key, keyed
   only on the raw label, invisible to the R9 litter ordering, and not
   individually trackable. That flag no longer exists; see §1 POLICY.
3. Fill-tint → cage-group: stable code or ad-hoc? — DEFERRED with the
   color-mapper/calibration pass (post-MVP, per 2026-09-04 re-scope).
4. **Bare non-pup sex recovery (RESIDUAL):** newborn pups get the
   `unsexed_pup` disposition (sex=U, non-warn); default adopted 2026-09-04
   for remaining bare non-pup IDs (`1BIS`): sex=U + warn, never guess. The
   former R2 blocker b (unsexed→sexed key mutation) is resolved by surrogate
   identity 2026-09-04 — re-import matches on (litter_id, pup_number) and
   APPENDS the sex change. Residual: confirm the U+warn default with the
   professor.
5. Two GENOTYPING mouse-ID columns (>p15 vs Pup) — now relevant at **P1**
   (genotyping subsystem promoted 2026-09-04): the two columns map to
   genotyping_result prep-stage; resolve at P1 genotyping design.
6. Concurrency policy (weekday-staff / weekend-professor rhythm → low contention):
   recommendation = last-write-wins + audit for P0.
7. Offline (P2) vs BIGINT-identity PKs: recommendation = "offline = read-only +
   queued mutations replayed online" for P0/P1 simplicity; revisit at P2. Decide
   before schema freeze.
   RESOLVED 2026-09-12 (user) — offline-first via a command/outbox queue
   (optimistic local apply + IndexedDB outbox + Background Sync, conflict via
   `prev_id` CAS; see the P2 decision in §3). This SUPERSEDES the read-only
   recommendation above. Follow-on choices split out as Q36 (outbox = reuse
   `audit_logs` vs dedicated table), Q37 (server-replay vs CRDT), Q38 (sync
   library).
8. YYMMDD century pivot — all data is 2026 now; pin `20` prefix.
9. **Export-less staff handoff (HIGHEST RISK):** dropping xlsx export removes the
   professor's current staff-handoff artifact. Recommendation: MVP ships a
   read-only "upcoming task-list / print handoff view" as the Excel substitute;
   the app owns versioning via audit_log + mouse_move + import_batch. Decide with
   professor: is the task view the handoff, or is export-less an accepted v0.1
   gamble? PM recommendation: ship the handoff view in P0-a.
10. **Cutover:** avoid indefinite Excel↔DB parallel operation (it reintroduces the
    hand-versioning problem). Recommendation: define an import-freeze/cutover
    date; app is source of truth after. Professor sign-off. PM recommendation:
    cutover at P0-b acceptance.
    UPDATE 2026-09-16 (user): CONFIRMED — NO Excel parallel operation; the
    app REPLACES the spreadsheet. Seed counters once (cage 2482 / litter BIZ);
    no header-sync path, no counter-drift policy (§3 P0-b v1.1).
11. **Pup-number semantics — FULLY RESOLVED 2026-09-04 (user).** It is NEITHER
    tag position NOR birth order: `pup_number` is **just a distinguishing number
    within one litter**. It carries NO orderable meaning — do not infer birth
    sequence, age, or tag location from it, and never surface it to users as
    "order". Consequences: (a) it is a UNIQUENESS discriminator inside
    `(litter_id, pup_number)` and a STABLE TIEBREAKER in the R9 derived sort,
    nothing more; (b) NO CHECK constraint restricting it to an observed set —
    the {1,2,3,10,20,30} values seen in the workbook are the professor's free
    choice, not a grammar, so import PRESERVES whatever integer appears,
    verbatim; (c) auto-assignment is UNBLOCKED — the P0-b generator may assign
    1..N for newly created litters, since any distinct values are valid;
    imported litters keep their original numbers and are never renumbered.
    Naming also RESOLVED (R9 naming note): persisted as `pup_number`;
    "litter seq" survives as lab vocabulary only.
12. **Cage-number allocation:** header "Next cage #: 2482" shows the professor
    pre-computes it → P0-b could own a cage_number_seq (seed 2482), same pattern
    as litter codes. Confirm with professor. R2's cage_number-UNIQUE-alone
    (2026-09-04) is consistent with this global sequence.
    UPDATE 2026-09-16 (user): CONFIRMED — cage number is SUGGESTED as `max+1`
    but EDITABLE; cage:slot is 1:N (the sampled workbook's 1:1 was
    coincidence). No Excel header sync (Q10 UPDATE).
13. **Minimal-import completeness:** Breeders-only normalization omits
    Experimental (982) + GENOTYPING — a searched mouse may look missing.
    Mitigation: raw_sheet_row archives all 9 sheets → optional v0.1 "raw
    archived-row search" fallback if scope allows. PM recommendation: include the
    fallback only if P0-a is otherwise ahead of schedule.
14. **Snapshot version boundary (R1):** professor explicitly PUBLISHES (maps to
    the weekend loop) — architect recommendation; auto-per-import rejected
    (imports stop after cutover, Q10) and auto-per-day rejected (KISS). Confirm
    with professor whether MVP-time snapshots are wanted → if yes, pull the
    snapshot table + publish tx forward to P0-b.
15. **snapshot.state contents (R1):** recommendation = the P0-a dashboard
    endpoint response shape, `state_schema_ver = 1`; confirm at dashboard
    freeze.
16. **Drag-drop transfer semantics (R2):** always pending vs only cross-room?
    Recommendation: simple drop = instantaneous move, explicit "start transfer"
    = pending transfer; decide at P0-c UX.
17. **Stale-pending conflict (R2):** instantaneous move beats a stale pending
    transfer (LWW, consistent with Q6); commit then fails validation and writes
    nothing. Recommendation: yes.
18. **Task transition matrix (R3):** placeholder TBD-with-professor (staff:
    open→done; professor: open→done, done→verified, done→open reopen/reject,
    open→cancelled, done→cancelled; admin: any→any; nobody exits
    verified/cancelled except admin). Confirm who may reopen `verified`
    (default: admin only).
    UPDATE 2026-09-13: the state set is now todo/doing/done/verified/cancelled
    (§4 Task model v2) — `doing` = staff claim/start; transitions are recorded
    as `task_events` rows (since RENAMED to child `tasks` rows, §4 REFINED
    2026-09-13). The role matrix must be re-drawn over the five
    states; professor confirmation still open.
19. ~~RESOLVED-SCOPED 2026-09-04 — the earlier RESOLVED-global is **EMPIRICALLY
    FALSIFIED (R10)**: the "verify at first real import" verification ran and
    FAILED — label 'F5' appears in TWO cages ('2413' and '4') in the real
    workbook. slots uniqueness is now the partial
    `UNIQUE (cage_id, label) WHERE deleted_at IS NULL`; the global
    `UNIQUE(label)` is dropped.~~ <!-- SUPERSEDED 2026-09-12 -->
    **RE-RATIFIED GLOBAL 2026-09-12 (user):** `slots.label` STAYS GLOBALLY
    unique — the R10 composite `(cage_id, label)` proposal is REJECTED. The live
    DB is already global-unique (SCHEMA.md `slots_label_key`, shipped by
    migration 0013), so NO migration is needed. The empirical 'F5'-in-two-cages
    finding stands, but is handled by an IMPORT-TIME dedupe/relabel step
    (cage-number-qualified labels) BEFORE insert — see TASKS P0.4 (new task)
    and the P0.2-R25 MEMO. Rationale:
    `docs/design/crud-and-color-palette.md` Topic 1 / Q-slot-label.
20. RESOLVED 2026-09-04: ZZZ→AAAA (4-letter) rollover confirmed — the derived
    length-first sort (R9) orders it correctly (shorter before longer); the
    base-26 codec in packages/domain generates the rollover.
21. RESOLVED 2026-09-04: nullable `from_slot_id`/`to_slot_id` ADDED to
    append-only mouse_move now (NULL-safe in all move queries).
22. RESOLVED 2026-09-04: per-line `mouse_id_sequence` counter DROPPED — the
    single GLOBAL litter-code counter is the only sequence; the number part is
    the operator-entered within-litter position (Q11 still open).
23. **`+N` pup-number-offset semantics — RESOLVED 2026-09-17 (was a
    clip-tag guess, WITHDRAWN).** The original guess — `+N` (e.g. the `10` in
    `M4+10XXX`) = an ADDITIONAL toe/ear clip added during RE-CLIPPING — is
    WRONG. It was suggested by the GENOTYPING sheet's `reclip (__+10)` /
    `re-clipped` section headers, which name an unrelated event (tissue
    collection, see Q43) with confusingly similar wording. `+N` is a
    PUP-NUMBER OFFSET assigned on transfer, when the destination cage already
    holds a mouse with that pup number (§1 POLICY 2026-09-15). It ACCUMULATES
    across successive transfers — the multi form `F1+6+8CF` is now EXPLAINED
    as two successive transfer offsets (+6, then +8), not "several added
    clips". Storage for the offset chain is a separate task, in flight
    (Q45) — no column name is decided here.
24. **`mouse_status` value set (RESIDUAL, added 2026-09-04):** shipped in
    `0001_enums.sql` as `('unassigned','breeder','experimental','dead')`.
    `breeder`/`experimental` are EVIDENCE-BACKED (the workbook's "Male breeders
    cages" / "Experimental cages"; `breed*` ~62 hits, `exp*` ~34; plus the
    dashboard's breeders/experimental counts). `dead` merges sac and found-dead
    per the meeting note "sac → dead → gray box". **`unassigned` is a JUDGEMENT
    CALL** — the workbook shows undecided mice ("Breed or Sac", "Exp or Breed")
    that need a state before the professor decides, but the NAME is ours.
    Confirm with Dr. Lopez: (a) is `unassigned` the right name; (b) should
    sac and found-dead be TWO states rather than one; (c) do `retired`
    (post-breeding) or `sick` exist — `sick` appears 6× in the workbook, always
    resolving to sac.
25. **`attention` value set (RESIDUAL, added 2026-09-04):** shipped as
    `('none','flag')`. Evidence is thin — only "yellow = attention/flag". BOTH
    LABEL NAMES ARE OURS. Confirm whether graded levels exist before any UI
    depends on this being two-valued; if it stays binary, revisit whether an
    enum earns its keep over a boolean (kept as an enum because the P0.2 AC
    mandates five enums).
26. **`cages.status` value set (RESIDUAL, added 2026-09-04):** shipped as TEXT
    in `0002_core_tables.sql`, deliberately NOT one of the five enums — its
    vocabulary is unknown. Collect the real values at the first import, then
    promote to an enum. Same treatment as `mouse_moves.reason` (TEXT in v0.1).
27. **`mouse_event_kind` value set (RESIDUAL, added 2026-09-04, R10):**
    shipped as `('tissue_collection','genotyping')` — only the two evidenced
    workbook columns (M/N). Confirm with Dr. Lopez whether other dated
    per-mouse events belong in this enum before widening it.
28. **Column K PLUG semantics (added 2026-09-04, R10):** plug observations are
    currently NOTES-ONLY — no dedicated column (K is 1% filled; the '~' on
    mating dates already encodes plug-not-seen). Confirm with Dr. Lopez
    whether real plug dates should be captured (e.g. on `matings`) rather
    than left in notes.
29. **`cell_signal` 'note' member (added 2026-09-04, R10):** notes REUSE
    cell_signal, with 'done' standing in for a plain settled note. Confirm
    whether a distinct 'note' member separate from 'done' is needed.
30. **M ⊆ N — rule or coincidence (added 2026-09-04, R10):** tissue-collection
    (M) and genotyping (N) dates mostly co-occur, but 5 of 223 rows already
    diverge — currently treated as NOT a rule (no constraint enforces it).
    Confirm with Dr. Lopez.
31. **`tasks` subject rule (added 2026-09-05, OPEN — blocks nothing, but a
    schema constraint is deliberately withheld until answered):** the four
    subject columns (`subject_mouse_id`, `subject_cage_id`, `litter_id`,
    `mating_id`) currently carry NO CHECK. An "exactly one subject" arc was
    proposed and falsified by the workbook: Experimental rows 25-27 are
    room-level work ('260818 CHECK FOOD', '260825 check food, cleaness') with
    no mouse, so `>= 1` would abort their import; and 'move M4BCW to cage 2413'
    names a mouse AND a cage, so exclusivity between those two is wrong too.
    Additionally `litter_id`/`mating_id` may be CONTEXT QUALIFIERS rather than
    alternative subjects — `notes` already sets `subject_mouse_id` and
    `mating_id` on the same row. ASK: for each task type, what may the subject
    be, and can a task legitimately have none? Until answered, ETL records a
    warning in `import_errors`; the schema does not reject. Adding the
    constraint later is additive (`ALTER TABLE ... ADD CHECK`), so nothing is
    foreclosed.
32. **Adult-age threshold (added 2026-09-12) — slot overcrowding warning
    (plan §2):** at what age does a mouse count as an "adult" for density?
    The user said 3 weeks / 21 days, but 21d is WEANING age; the true adult
    age may be later (~6–8 weeks). Confirm the constant with Dr. Lopez.
    UPDATE 2026-09-12: 21d SHIPPED as the shared baby/adult boundary
    (`ADULT_MIN_DAYS`, used by BOTH the DOB life-stage tint and the slot adult
    count); the "true adult may be later" concern above is still OPEN — a later
    threshold is a one-constant change.
33. **Slot adult capacity (added 2026-09-12):** the over-capacity threshold
    (proposed 5 adults). Confirm the number with Dr. Lopez.
34. **Per-slot vs per-cage limit (added 2026-09-12):** is the adult-density
    limit enforced per SLOT or per CAGE? (Ties into the standing slot-vs-cage
    modelling question.) Confirm with Dr. Lopez.
35. **Colour-allocation uniqueness scope (added 2026-09-12, plan §2) —
    RESOLVED 2026-09-12 (user): PALETTE-WIDE (global), NOT per-channel.** One hex
    is used by at most one live assignment across ALL channels; a genotype and a
    mate-group may NOT reuse the same hex. The `[AND a.channel = :channel]`
    clause is DROPPED from the allocation query (see §2 allocation bullet).
    Rationale: `docs/design/crud-and-color-palette.md` Topic 2/Q35.
    RELATED RESOLUTION (colour-free timing, no prior numbered Q): a genotype/mate
    colour FREES EAGERLY when its LAST live user is deleted (eager-with-count-
    check; allocation query filters `deleted_at IS NULL`) — recorded in the §2
    allocation/free bullet. Rationale: same design doc, Topic 3.
36. **Outbox = reuse `audit_logs` vs dedicated table (added 2026-09-12, P2
    offline decision §3):** the immutable `audit_logs` table already captures
    every mutation append-only with before/after JSON — does the offline outbox
    REUSE it, or does it warrant a dedicated `outbox`/`ops` table (e.g. because
    the outbox needs client-origin, replay-status and idempotency-key columns
    `audit_logs` lacks)? Decide at P2 offline design.
37. **Conflict strategy — server-replay vs CRDT (added 2026-09-12, P2 offline
    decision §3):** server-authoritative replay of the outbox with `prev_id` CAS
    conflict detection is the default (enough for one small lab). Promote to a
    CRDT (automerge/Yjs) only if concurrent edits to the SAME record become
    common. Decide at P2 offline design.
38. **Sync library choice (added 2026-09-12, P2 offline decision §3):** Dexie
    (thin IndexedDB) vs a managed sync engine (PowerSync / ElectricSQL /
    Replicache), evaluated against our custom append-only + `prev_id`-CAS schema.
    Decide at P2 offline design.
39. **`e` suffix POSITION rule (added 2026-09-16, punch records §4 — GATES
    `composeMouseIdentity`):** what selects `M6BFAe` (tail) vs `M6eBFA` (mid)?
    H1: mid when the mouse was moved between cages. H2: mid only when the pup
    number was renumbered `+10` — but the owner also wrote `M6eBFA` with no
    `+`. H3: mid when the ear punch REPLACES the toe punch (toe removed, ear
    now carries the number), tail when the toe is still there and the ear is
    an extra mark. H3 is the only one our punch records already answer with
    no extra data. Until answered the position is an EXPLICIT fn input.
    **RESOLVED 2026-09-16 (user) — NONE of H1/H2/H3. The mid position is
    ABOLISHED.** The owner's stated lab rule was H1 (no cage move → tail
    `[id]e[.N]`; cage move + ear tagging → mid `F3[+NN]e|earXXX`), but rather
    than encode that exception in the grammar the owner chose to collapse it:
    **`e` ALWAYS goes at the tail of the mouse id, and "transferred, THEN
    tagged" is rendered as a COLOUR on the `e`, not as a position.** Default =
    no colour. Rationale: one grammar instead of two; colour is already this
    app's channel for derived facts (genotype / mate / signal / sex / DOB
    tints are all read-time projections); and one character stops carrying two
    facts at once — `e` means "has an ear punch", the colour means "the punch
    came after a transfer". The condition is DERIVED, never stored: the
    transfer is a cage-move fact and the tagging is a `punches` row, so the
    colour is computed from data already present.
    CONSEQUENCE — grammar is now exactly:
    `sex · pupNumber · [+offset] · litterCode · [e] · [.N]`
    `composeMouseIdentity` LOSES its `earSuffixPosition` parameter; `.N` is
    already outermost (`composeMouseLabel`), so `M6BFAe.2` composes with no
    change to `lib/mouseLabel.ts`.
    STILL REQUIRED — **compose emits tail only, but PARSE must accept BOTH**:
    hand-written cage cards and the legacy workbook contain the mid form
    (`F10+1earAYY`), and those reach us via import and via inline edit.
    `lib/litterCode.ts` (fixed 2026-09-16) already tolerates both.
    **AMENDED 2026-09-22 (owner, P0.7-b task 9c):** the "reach us via import
    and via inline edit" premise NO LONGER HOLDS IN THIS REPO — the inline-edit
    path was deleted by step 9a and there is no TypeScript import path at all
    (`raw_mouse_id` greps to 0 over `*.ts/*.tsx`). `extractLitterCode` is
    therefore RETIRED from the client; its parse contract (the six tolerated
    forms + the three-instance bug history) is preserved as the future import
    parser's acceptance spec in `docs/phases/p0.7.plan.md`. The PARSE
    REQUIREMENT ITSELF STANDS — it just belongs to `packages/domain` when an
    importer exists, not to an app lib.
    OPEN (small) — WHERE the colour renders. Recommendation: on the `e` glyph
    ONLY, not the whole cell; a cell-level tint would collide with the
    genotype colour that already fills that space.
40. **Both `e` positions at once (added 2026-09-16):** can `M6eBFAe` occur?
    If yes, ONE extra column is needed on the punch record (gates one column,
    not the table).
    **DISSOLVED 2026-09-16 by the Q39 resolution** — there is only one
    position, so the question cannot arise and no extra column is needed.
41. **Two ear punches (added 2026-09-16):** does the label show `e` or `ee`?
    **RESOLVED 2026-09-16 (user): `ee` — both ears.** CONSEQUENCE: the punch
    suffix is a COUNT, not a flag. `composeMouseIdentity` emits one `e` per
    ACTIVE ear-punch row (`deleted_at IS NULL`), so N ear punches → N `e`s,
    and removing one punch shortens the label by one character. This is why
    `punches` deliberately has NO `UNIQUE (mouse_id, punch_location)` — the
    duplicate rows ARE the information.
    KNOCK-ON, FIXED 2026-09-16: `lib/litterCode.ts` had a single optional
    trailing `e?`, so `M6BFAee` returned null — the exact silent-drop bug the
    2026-09-16 widening had just fixed for `M6BFAe`. Now `e*`. Verified
    against `M6BFA`/`M6BFAe`/`M6BFAee`/`M6BFAeee`/`M6+10BFAee` → `BFA`, and
    `M6EEE` → `EEE` (the suffix is lowercase-only, the capture is `[A-Z]`, so
    it can never steal an uppercase letter).
42. **Third punch location — CLOSED 2026-09-22 (owner).** Owner's words:
    *"close this. and delete all related contents. just write down do not
    consider. it is just a placeholder."* `other` is a placeholder; there is
    no decision to make and nothing to reason about further. The accumulated
    analysis (real-name / suffix-letter framing, the open-set-vs-closed-CHECK
    conflict, the "still open / gates nothing" annotation) was DELETED on the
    owner's instruction — a deliberate exception to this file's
    record-a-RESOLVED-line-never-rewrite rule, noted so it is not read as a
    defect and restored. The number is kept so `plan §5 Q42` citations
    resolve.
43. **Tissue re-clip vs toe punch (added 2026-09-16):** is a `.N` re-clip
    (`lib/mouseLabel.ts`, counted from done Tissue-collection cases) the SAME
    event as a `toe` punch record? If so one representation should go. Ties
    to Q23 (`+N` vs `.N`). **SEVERED 2026-09-16: `+N` (transfer offset, Q23)
    and `.N` (tissue-collection count, this question) are UNRELATED — the tie
    was assumed, not evidenced. Only the toe-punch-vs-tissue-collection
    question below is still open.**
    SHARPENED 2026-09-16: the owner refers to `.N` as the **"genotype count"**,
    while the code derives it from *Tissue collection* cases reaching
    done/verified (`lib/mouseLabel.ts:8-18`). Probably the same event named
    from different ends (tissue is taken IN ORDER TO genotype) — but confirm,
    because if `.N` counts genotyping ROUNDS rather than tissue-collection
    EVENTS the two can diverge (one tissue sample genotyped twice, or a
    genotype call made with no new tissue).
    **RESOLVED 2026-09-16 (user): `.N` IS Tissue collection** — "genotype
    count" was a misspeak. The existing derivation (`lib/mouseLabel.ts:8-18`,
    Tissue-collection cases at status done/verified) is CORRECT and stays.
    Rendering rule CONFIRMED: N ≤ 1 → no suffix; N ≥ 2 → `.N`. That is
    exactly what `composeMouseLabel` already does (`count >= 2`) — no change.
    STILL OPEN (narrower): a tissue collection is PHYSICALLY a toe clip, so
    does each Tissue-collection case also mint a `toe` punch row? If yes the
    two derivations describe one act from different ends (case = the work,
    punch = the mark) and must not double-count; if no, `punches` records only
    identification marks and tissue clips stay out of it. Decide before
    step 10 (punch UI), not before step 5.
    SCOPE NOTE 2026-09-22: this sub-question is about a DIFFERENT mint site
    (the tissue case), so it does NOT gate P0.7-b task 8c, which covers the
    creation path only.
    **RESOLVED 2026-09-22 (owner) — NO: a Tissue-collection case does NOT mint a
    `toe` punch row.** Owner's words: *"tissue is independent each other with
    toe."* That is this question's SECOND branch as framed above: `punches`
    records IDENTIFICATION MARKS only and tissue clips stay out of it. `.N`
    (derived from done/verified Tissue-collection cases) and punch rows therefore
    describe DIFFERENT events — there is NO double-counting to avoid, and the
    punch UI shows ONE mint site, not two. Q43 is now fully resolved; it gated
    P0.7-b task 13 (the 10+12 merged mouse-editing drawer) and that gate is GONE.
44. **Cage-column section headers (added 2026-09-16) — ANSWERED 2026-09-16
    (user): (b) spreadsheet-only VISUAL device.** The workbook's cage column
    holds non-numeric headers (`Ps Breed.`, `Ps Exp.`, `Back ups`) grouping
    the rows below. NO model layer is added — the grid stays
    line › cage › slot › mouse; the app covers this with filters/tags.
    (P0.3 forward-fill currently emits `section_marker` — keep as import
    metadata only, do not promote to a domain entity.)
45. **`+offset` renumber storage home (added 2026-09-16):** the `+10`
    in `M6+10eBFA` (§1 POLICY 2026-09-15) has no column yet —
    `mouse_meta.pup_number` is immutable and the offset chain accumulates
    (Q23), so it cannot just overwrite pup_number. Storage design is IN
    FLIGHT as a separate task; no column name is decided here. Rendering
    that label form is BLOCKED on that design landing.
    **RESOLVED 2026-09-18 — the storage home LANDED.** Migration
    `0027_pup_number_offsets` (one row per offset in the chain, insertion
    order = chain order, freeze trigger: correction = tombstone + insert)
    plus the DTO field `MouseCell.pupOffsets`. `mouse_meta.pup_number` stays
    immutable; the effective number is `base + sum(offsets)`, composed at
    read. Recorded in `STATUS.md` 2026-09-18 under P0.7-b step 5, which is
    DONE — the `M6+10…` and `M6+10+20…` forms render from stored data. The
    "IN FLIGHT / no column decided" wording above is HISTORY as of this line.
46. **`ParentCell` label — projected string or compose parts? — DECIDED
    2026-09-22 (owner): OPTION C.** Owner's words: "we do not save label, we
    need to combine from mouse info. do the same thing." So a parent whose
    `metaId` is NON-NULL carries NO label field at all — the UI finds that
    parent's `MouseCell` by `metaId` and composes with
    `buildMouseLabel`/`mouseLabelOf`, exactly as every other surface does
    since P0.7-b step 9b. Only the OUTSIDE/UNKNOWN arm (`metaId: null`) keeps
    a string, RENAMED `snapshotLabel` to say what it is. Implementation is
    P0.7-b task **9d** (`docs/phases/p0.7.tasks.md`) — type change, call-site
    migration, fixture lines, and the dead `MouseDetail.parents` decided with
    it. The recommendation and its costs are kept below as the reasoning for
    the pick, not as an open choice.
    (added 2026-09-22; architect recommendation, since ADOPTED by the owner.)
    P0.7-b step 9b deletes the stored `MouseCell.mouseLabel` so every mouse
    label becomes a read-time projection, but `ParentCell` (`grid.ts:65`)
    carries a `mouseLabel` STRING and has no parts to compose from, so it is
    left out of scope and the drift is already visible in the fixture
    (`getColonyGrid.mock.api.ts:254-257`: "ParentRow renders this field
    directly (secondary surface — known bare-label limitation)" — the stored
    parent label misses the `.N` suffix the grid composes).
    **ARCHITECT RECOMMENDATION = option C, a DISCRIMINATED UNION** (recorded
    from the architect's hand-back summary, not quoted verbatim): an
    IN-GRID parent carries NO label and is composed at read from the
    `MouseCell` found by its `metaId`, so it can never drift from the grid;
    an OUTSIDE/UNKNOWN parent keeps a string, RENAMED `snapshotLabel` to say
    what it is — a snapshot of text nobody can recompose — sourced from
    `mates.mate_raw_label` (`0002_core_tables.sql:459-461`).
    COST of C: "renderable" becomes tied to "present in the payload". That
    only bites if `ColonyGrid` ever stops being whole-colony (pagination,
    per-line fetch), at which point an in-grid parent outside the page has
    neither a label nor a `MouseCell` to compose from.
    CONSEQUENCE to weigh: `mates.mate_raw_label` is FATHER-ONLY (verified —
    its comment says "kept when the FATHER cannot be resolved to a row"), so
    an outside MOTHER has no `snapshotLabel` source under C.
    That gap is a SERVER-ERA gap (mock-era fixtures can carry any string);
    9d records it, it does not block 9d.
    Alternatives NOT CHOSEN (2026-09-22): keep the projected string
    permanently (accept the drift, document it), or give `ParentCell` the full
    compose parts (duplicates mouse fields into the parent shape).
    NOT BLOCKING: P0.7-b steps 9a/9b did not depend on the answer; both are
    DONE.
    RELATED, DECIDED WITH IT: `@repo/types MouseDetail.parents` is DEAD —
    `getMouseDetail` has zero callers and the drawer reads `MouseCell.parents`.
    It is deleted or retargeted BY TASK 9d, not as a separate task (quality
    gate: no dead exports).
47. **Gene/genotype COLOUR model — DECIDED IN PRINCIPLE 2026-09-23 (owner),
    DELIBERATELY NOT IMPLEMENTED.** Owner's words: *"each gene has a color and
    +/+ will influence color but not this time."* So the model below is
    SETTLED but NOTHING is scheduled against it — no task, no AC; it is
    recorded so the next person does not re-derive it.
    DECIDED, as the owner settled it:
    - the palette is keyed by the **WHOLE COMPOSED GENOTYPE LABEL** — the
      string `lib/genotype.ts genotypeOf` produces, not the individual gene;
    - a ZYGOSITY DIFFERENCE is therefore a DIFFERENT KEY and a different
      colour: `Ai14` ≠ `Ai14 +/+` (which is exactly the NULL/NULL vs recorded
      `'+'/'+'` distinction migration `0029` exists to preserve);
    - gene ORDER within the label is normalised by sorting on `sort_key`
      (P0.7-c task 4), so input order cannot produce two colours for one mouse;
    - `WT` and `?` are assigned **NO COLOUR**. This PRESERVES an existing
      deliberate property, stated in `apis/getColonyGrid.mock.api.ts:27-29`:
      WT → null "rendered as the DEFAULT cell background (no fill). Only MUTANT
      genotypes carry a hue, so they pop"; `'?'` → null likewise, with the "?"
      text doing the disambiguating;
    - a genotype NOT YET in the palette gets a colour ASSIGNED and STORED.
    MEMO, NOT URGENT (owner 2026-09-23, *"memo not urgent"*): the three items
    below are recorded so they are not re-derived, and NOTHING is waiting on
    them. They are not blocking, not scheduled, and nobody is expected to
    answer them before the colour model is actually picked up — at which point
    they become its first design questions rather than prerequisites. Do not
    treat them as an open ask to the owner.
    (a) auto-assignment depends on ORDER OF FIRST SIGHTING unless the palette is
    persisted; in the mock era that means the palette becomes STATE (today
    `GENO` in `getColonyGrid.mock.api.ts:30-40` is a hand-written constant map,
    so nothing assigns anything at runtime);
    (b) COLOUR EXHAUSTION: the grid renders the tint at 13% alpha
    (`` `${mouse.genotypeColor}22` ``, `ColonyGridView.client.tsx:1975`, and the
    parent sub-cell at `:1785`), where only ~12–20 hues are humanly
    distinguishable — while 5 catalogue genes plus zygosity combine to far more
    labels than that. REUSE hues, or FALL BACK to no-fill? Undecided;
    (c) this model is an **ALTERNATIVE** to the earlier "each gene has its own
    hue, zygosity modulates it" idea — NOT both. Whichever ships, the other is
    dead; do not implement them side by side.
    FILED WITH IT (owner 2026-09-23, *"leave a memo"*): the in-grid parent
    cell is HALF-MIGRATED — its genotype STRING composes at read while its
    `genotypeColor` is still a STORED copy, so a parent sub-cell paints the old
    tint behind new text. Memo, not a task, in
    `docs/phases/p0.7-c.tasks.md`; it sits in this design area and will most
    likely be settled with whatever answers this question.
48. **Should `mice_genes` validate gene COMBINATIONS at all? (added
    2026-09-23 — OPEN, not answered.)** `[Nf1, WT]` is accepted today and
    nothing rejects it: `mintGeneRefs` (`lib/genotype.ts:64-77`) does no
    validation, and `0029` deliberately added "no zygosity enum, no CHECK, no
    validation" (owner: *"I will add more logic later"*). P0.7-c task 4's
    replacement unique index `(mouse_id, gene_id) WHERE deleted_at IS NULL`
    closes ONLY the DUPLICATE case (`[Nf1, Nf1]`) — it says nothing about
    combinations that are individually unique but biologically contradictory,
    of which "wild type AND a mutant marker" is the obvious one. The question
    is whether such a rule belongs in the schema at all, in the picker, or
    nowhere (the lab may legitimately write `WT` to mean "wild type at the
    locus we care about"). Needs the professor, not an architect.
    **MEMO 2026-09-23 (owner: *"leave as it is but memo I will update later"*)
    — nothing is scheduled; do not treat this as an open ask.** A SECOND
    concrete instance arrived with `28acb8b`: `ccEGFP` and `ccEGFP(hmo)` are
    now two catalogue codes, and a mouse can carry BOTH — hemizygous and
    homozygous at once — because `(mouse_id, gene_id)` sees two different
    `gene_id`s. Same shape as `[Nf1, WT]`: individually unique, jointly absurd.
    The owner's own sketch of the eventual fix, recorded not evaluated: *"we
    may add a column in mice_genes table, for hmo or extra marking — jsonb or
    | separated string?"*
    NOTE THE TENSION, because it is easy to lose: that sketch and `28acb8b`
    point OPPOSITE ways. `28acb8b` made `(hmo)` part of the CODE, a separate
    catalogue row; the sketch would make it a MARKING on the join row, which
    folds `ccEGFP(hmo)` back into `ccEGFP` and deletes a catalogue entry. Both
    are defensible; they are not compatible. Whoever picks this up decides
    which, and the other is unwound — this is not an incremental add.
49. **Should the gene PICKERS follow `sort_key` too? — RESOLVED 2026-09-23
    (owner: "yes"). One order everywhere: the pickers now sort by `sort_key`,
    so `PlpCre` is first in the picker exactly as it is in the composed
    genotype. Implemented by deriving `GENE_CATALOG_CODES` from a SORTED copy
    rather than from the array as written, which also makes the array's own
    order meaningless — `sort_key` is now the single source of display order,
    so the two cannot drift the way a second hand-kept list would. Verified
    against the real modules: genotype picker `PlpCre · Nf1 · Ai14 · ccEGFP ·
    WT`, "genes to check" the same minus `WT`, while the array is still written
    `Nf1`-first and provably no longer matters. The original question follows.**
    Since `11d0322` the GRID renders
    a composed genotype in catalogue `sort_key` order, so `PlpCre` (10) comes
    first. The badge pickers still list genes in CATALOGUE ARRAY order, where
    `Nf1` is first (`apis/getGenes.mock.api.ts:25-34` — `GENE_CATALOG_CODES`
    maps the array as written, and `GENE_CODES` filters that same array). So a
    user picks from one order and reads the result in another. Options are
    obvious and not chosen here: sort the picker by `sort_key` (one order
    everywhere), leave the array order (the catalogue list has its own logic —
    most-used first), or make `sort_key` the array order outright. Owner's
    call. RELATED, already settled in code and NOT part of this question:
    pick ORDER no longer reaches the rendered string or the write path
    (`genotypeOf` sorts on `sortKey`, `geneRefsEqual` is order-insensitive,
    `mintGeneRefs` copies `sortKey` from the catalogue), so
    `CodeBadgeSelect`'s lack of exclusivity — deselect+reselect reorders a
    mouse's picks — is moot everywhere EXCEPT what the picker itself shows,
    which is exactly this question.
