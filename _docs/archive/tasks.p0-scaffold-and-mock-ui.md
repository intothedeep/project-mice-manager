# tasks archive — P0.1 scaffold + P0.6 completed mock-UI (2026-09-07 → 09-12)

> Cold storage (docs.md §2). History-only. Cut from `00.tasks.md` 2026-09-12;
> nothing changed, only relocated. P0.6 still has OPEN tasks in the living doc
> (the not-done ones stay there per §3); these are its completed sub-tasks.

## P0.1 Scaffold — P0-a (DONE)

- [x] Monorepo scaffold: pnpm + turbo; `apps/colony_client_web` (Next.js 16),
      `apps/colony_server` (Express), `packages/{db,types,domain}` + reused config
      packages.
      AC: `pnpm install && pnpm turbo build` succeeds; dep graph is
      client→{types,domain}, server→{types,db,domain}, domain→types only;
      packages/domain stays pure (no I/O, no node-only imports) so it is
      client-bundlable; no circular deps.
- [x] Local Postgres setup + `packages/db` migration runner (numbered .sql
      migrations, raw SQL). **DECIDED 2026-09-04 — Homebrew `postgresql@17`,
      NO Docker, NO Supabase CLI in P0** (the sibling's `db:start` symlinks a
      colima socket with sudo — inherited fragility for zero benefit, since P0
      may not use hosted Supabase). Runner = `packages/db/src/migrate.ts`
      (~90 lines) + `src/reset.ts`; only new dep is `dotenv` (`pg` already
      present for the Pool).
      - Filenames: `NNNN_description.sql`, zero-padded 4 digits, in
        `packages/db/migrations/` — matches the sibling (which uses `0001_*`,
        NOT Supabase timestamps) and stays copyable into `supabase/migrations/`
        at P2, since the CLI applies lexicographically.
      - Connection: `DATABASE_URL`; precedence env > root `.env` > default
        `postgres://localhost:5432/colony_dev`. Runner derives the maintenance
        URL to `CREATE DATABASE` when missing. One-time prerequisite, stated not
        hidden: `brew install postgresql@17 && brew services start postgresql@17`.
      - **Forward-only — NO down migrations** (YAGNI: solo dev, local DB, no P0
        rollback scenario). Recovery path is `db:reset`, which the P0.5 seed loop
        needs regardless.
      - Tracking: `schema_migrations(filename TEXT PK, checksum TEXT NOT NULL,
        applied_at timestamptz)`. Each file runs in ITS OWN transaction together
        with its `schema_migrations` INSERT, so a failure leaves no partial record.
      AC: one command creates DB and applies all migrations from empty; re-run is
      a no-op (recorded + checksum matches → skip). A migration EDITED after being
      applied must FAIL LOUDLY (checksum mismatch → write a new migration
      instead) — never silently re-applied or ignored. An unapplied file that
      sorts BEFORE an already-applied one must also fail (out-of-order insertion).

## P0.6 Server API + UI — P0-a (completed mock-UI sub-tasks)

- [x] **Frontend-first Cage Grid prototype (mock, read-only) — professor demo
      (2026-09-07).** `colony_client_web` home = the grid; renders Excel colour
      semantics back (black=done, red font=instruction, blue font=plan, yellow
      fill=flag, gray fill+strike=dead) so the professor recognises the room at
      a glance. View DTOs (`LineGrid/GridCage/MouseCell/SignalColor`) live in
      `@repo/types`; the seam is `apis/getLineGrid.mock.api.ts` (named as the
      future real fetcher → mock→real swap is one file). Fixture deliberately
      seeds the open questions (`M4+10AZZ` pooled, `U3BCX` unsexed, `F10BEVe`
      ear-tag, `M4BCW.2` reclip) so the demo doubles as an ambiguity checklist.
      DEVIATION (SUPERSEDED 2026-09-08): the demo started on plain CSS for boot
      reliability; the shadcn/Tailwind migration below now replaces it.
      NEXT (not built): Task-bin, Mouse-detail drawer, move mutation (+CAS 409).
- [x] **Full hierarchy + Hybrid explore + Move menu (mock, 2026-09-08).**
      Extended to the real 4-level nesting **colony › line › cage › slot › mice**
      (slot is its own level, holds many mice); fetcher renamed
      `getColonyGrid.mock.api.ts` (old `getLineGrid` soft-deleted `x_`), DTOs now
      `ColonyGrid/GridLine/GridCage/GridSlot/MouseCell`.
      Explore model = **Hybrid (nav + filter)** chosen by user over nav-first /
      filter-first / group-by: hierarchy stays the page spine, a sticky filter
      bar (search + sex + signal chips) dims non-matching cages/slots/mice.
      Move = **cascade menu** (user chose menu over drag-drop) line › cage ›
      slot, same-line default, `＋ new slot`, confirm breadcrumb; pure core
      `lib/gridMove.ts` mirrors the append-only move (new head row, empty slots
      dropped) — verified by scratch run (9/9: filter, move, source-preserved,
      original-immutable, new-slot cleanup, cross-line). `lib/gridFilter.ts` is
      the pure predicate. Interactive parts are `*.client.tsx`.
      OPEN DECISION: cross-line move is currently **warn, not block** — a mouse
      can be moved into another line's cage with a ⚠ banner. Confirm with the
      professor whether it should be hard-blocked (line = strain identity) or
      allowed with the warning.
- [x] **shadcn/Tailwind v4 + `line | cage | mouse` 3-pane desktop view — funding
      pitch polish (2026-09-08).**
      **3-PANE LAYOUT SUPERSEDED 2026-09-12** by the single unified nested-column
      body (line|cage|slot|mice rails + header jump dropdowns). shadcn/Tailwind
      adoption + Move-menu parts still stand.
      User chose shadcn (already the `rules/nexjts.md`
      house convention) and a desktop **Miller-columns** layout: Line ▸ Cage ▸
      Mice(grouped by slot). Tailwind v4 (`@tailwindcss/postcss`) + shadcn atoms
      hand-added under `components/ui/` (button/card/input/badge/label/dialog/
      radio-group), `cn` in `lib/utils`, `components.json` for future CLI adds,
      Inter + JetBrains Mono via `next/font` (codes in mono). Move menu rebuilt on
      shadcn Dialog + RadioGroup. Design: **chroma reserved for the 5 workflow
      signals only** (`lib/signal.ts` is the single colour source); UI chrome is
      neutral graphite so signals read as meaning, not decoration.
      Verified by REAL browser clicks (puppeteer-core, throwaway): filter
      signal=plan → line/cage match counts + dim; Move dialog cascade populates
      line›cage›slot with same/cross-line + here/current hints + breadcrumb;
      Move applied END-TO-END (M4BCW 2413→2414/A8, counts 3→2 / 3→4).
      lint + check-types green.
- [x] **Interaction model → show-all + linked highlighting (2026-09-08).**
      **SUPERSEDED 2026-09-12**: cross-pane "active line/cage" highlight replaced by
      in-body SCOPE HIGHLIGHT (click a node → its ancestor path + subtree light up,
      `lib/gridSelection`). Show-all + orthogonal filter-dim principle still holds.
      Replaced the drill (which HID non-selected children) with: all lines, all
      cages, all mice always visible; activating a LINE highlights its child
      cages, activating a CAGE highlights its mice. TWO ORTHOGONAL AXES per user:
      (1) active line/cage = persistent structural markers (never dropped),
      (2) filter = emphasis/dim (match strong, non-match dimmed). Priority: when
      a filter is on it drives mouse opacity; otherwise active-cage membership
      does; the active markers persist under both. Verified in-browser: line
      switch moves the cage highlight; filter=plan dims non-matches while cage
      2501 stays actively marked.
- [x] **Task bin prototype (mock) — the "automate" pitch (2026-09-08).** `/tasks`
      route + nav (Cages | Tasks). Board = Open / Done / Verified columns; card
      shows type, subject chip (mouse/cage/litter/room), direction detail, due
      (overdue in red), and actor trail (assignee / done-by / verified-by).
      **Role-gated transitions** via pure `lib/taskFlow.ts` `canTransition` +
      `availableActions` (staff: open→done; professor: done→verified|reopen|
      cancel, open→cancel; admin: any→any) — a role switch (staff/professor/
      admin) flips which buttons appear. `TaskCard`/`TaskStatus`/`Role` DTOs in
      `@repo/types`. NOTE: `taskFlow` lives in the app for now (avoids the
      unbuilt-`@repo/domain`-dist runtime trap); MOVES to `@repo/domain` when the
      service also enforces it — same function shape. Default matrix is still
      TBD-with-professor (see the assignment bullet below).
      Verified: `canTransition`/`availableActions` 8/8 scratch run; in-browser —
      staff Mark-done moves Open→Done, switching to Professor reveals Verify/
      Reopen/Cancel and hides Mark-done. lint + check-types green.
- [x] **Mouse-detail drawer (mock) — "simple management" depth (2026-09-08).**
      Click a mouse id in the grid → right sheet (shadcn Sheet on Radix Dialog).
      Sections: Identity (genotype/dob/litter), Genotype (per-marker badges from
      `mice_genes→genes`), Parents (mother/father + genotype), and an APPEND-ONLY
      **History timeline** (one entry per version row, newest first, dot + date +
      actor). DTO `MouseDetail`/`GeneCall`/`ParentRef`/`HistoryEvent` in
      `@repo/types`; seam `apis/getMouseDetail.mock.api.ts` (keyed by
      mouse_meta_id, rich entries for the ambiguity cases + a fallback). Verified
      in-browser 6/6 (drawer opens on M4+10AZZ; shows History, the pooled-'+10'
      entry, a parent, PlpCre marker). check-types green.
- [x] **Upcoming/due view (mock) — the date-automation pitch (2026-09-08).**
      `/upcoming` route (built by a parallel bg developer agent, integrated by
      main session). Auto-computes plug-check(+10d) / delivery(+20d) / wean(+21d)
      / genotype(+21d) from mating occurred_at and pup dob, then groups into
      Overdue / Today / This week / Later via pure `lib/dueDates.ts` (`dueStatus`,
      `daysUntil`, UTC-parsed to avoid midnight shift). Cards show absolute +
      relative date, kind badge, subject chip; overdue=red(instruction),
      today/soon=amber+flag-fill, later=muted. DTO kept local to
      `apis/getUpcoming.mock.api.ts` (no shared-file edit → clean parallelism).
      Verified: agent scratch-tested the UTC date math; main session — whole
      client check-types+lint 0 errors, `/upcoming` serves 200, screenshot shows
      2 overdue / 2 today / 3 soon / 1 later.
- [x] **New-task create UI + type-driven form + mate auto-cascade (mock,
      2026-09-08).** "+ New task" on the Task bin — ANY role can create a task
      (staff + professor + admin; user directive 2026-09-08). Role still gates
      the ADVANCE actions (done/verify), not creation. `lib/taskTypes.ts` =
      data-driven form schema:
      picking `task_type` reveals type-specific fields, which land in the task's
      `direction` payload (mirrors tasks.task_type + direction jsonb). Types:
      Mate, Plug check, Birth/delivery, Wean, Genes-to-check, Genotyping, Move,
      Check food, Sac. Fields: mouse/cage/litter pickers (from the colony
      fixture), gene multi-select, date, number, text.
      **Auto-cascade**: creating a Mate enqueues plug-check(+10d) + delivery
      (+20d) into Upcoming via `lib/dueDates`. Cross-screen state lives in a
      mock-era shared client store `lib/mockStore.ts` (`useSyncExternalStore`;
      seeds from the SEED_* exports; `addTask`/`setTaskStatus`) so created tasks
      + cascades persist across SPA route nav (replaced by react-query + real
      endpoints later; a full reload reseeds — mock only). `TaskCard` gained an
      optional `direction`; `TaskSubjectKind` gained `'mate'`.
      Verified in-browser 7/7: as Professor, create Mate (M4BCW × F5AYL) → Open
      card added; client-nav to Upcoming shows both auto-created follow-ups.
      check-types + lint 0 errors.
- [x] **Color-by toggle + multi-select → batch task (mock, 2026-09-08).**
      **COLOR-BY TOGGLE SUPERSEDED 2026-09-12** by the always-on multi-channel
      colour system below (professor wants every colour at once, no toggle). The
      multi-select → batch-task half of this item STILL STANDS.
      Grid gains a `Color by: Off | Line | Genotype` toggle (`lib/colors.ts`).
      **Line**: each line a categorical hue (indigo/teal/… — avoids the signal
      families) shown as a dot + the active-selection colour; the active line's
      cages highlight in its hue. **Genotype**: a deterministic swatch per mouse
      (same genotype → same colour). DISCIPLINE: signal colours stay reserved
      for state (text/fill); identity/grouping hues are dots/swatches/borders
      only, and only ONE identity channel is on at a time (user chose the
      toggle over always-on). **Multi-select**: a checkbox per mouse → a
      selection bar ("N selected · Create task · Clear") → opens NewTaskDialog in
      BATCH mode (`presetMice`): subject = the mice, types restricted to
      mouse-subject (Genes-to-check/Genotyping/Move/Sac), `direction.mice=[ids]`.
      Verified in-browser 9/9 (line + genotype colouring; select 2 → batch
      dialog → create → card lands in the Task bin). check-types + lint 0 errors.
- [x] **Multi-channel identity colours — always-on Excel colour-cell row (mock,
      2026-09-12).** Supersedes the single-select Color-by toggle: the professor
      reads state by colour, so ALL channels render at once. The mouse row is now
      a fixed-column grid (id · genotype · DOB · mate · actions) — each channel
      scans down its own column. Channels: **sex** (♂ sky / ♀ pink id-cell bg,
      rule), **age** (DOB cell amber when ♂>1y / ♀>10mo — `isOldMouse(dob,sex)`
      computed at read, never stored), **genotype** (own `genotypeColor` cell
      tint; WT/`'?'` = null = default bg so only mutants pop; a mouse differing
      from its line's nominal colour is a visible transfer), **mate** (one filled
      chip per father-fanout group — `mateColors` is a LIST, a mouse can be in
      several). **Signal (state)** moved to the row left-spine (`signalSpineClass`)
      + id-text colour, off the identity cells. `lib/colors.ts` reduced to the
      rule channels (`SEX_TINT`, `isOldMouse`); the genotype hash + `ColorBy`
      toggle removed. DTO: `MouseCell += dob, genotypeColor, mateColors`;
      `GridLine += lineColor, nominalGenotypeColor` (see plan §2). Mock
      (`getColonyGrid.mock.api.ts`) seeds resolved hex via a `GENO` map (same
      genotype → same hex) + `MATE` group colours — the mock of the future
      `color_palette`/`color_assignments` tables.
      Verified: check-types 0 errors; served page shows the DOB dates + amber
      age class hot-reloaded. Also folded this session: line/cage panes stacked
      multi-row + narrowed for a wider mice column; dynamic breadcrumb + Legend
      on one row; per-mouse active-task colour tags (filled squares); pane-header
      totals.
      DEFERRED to real `colony_server`: the `color_palette`/`color_assignments`
      DB tables + write-time colour allocation + canonical genotype key from the
      ETL parser (colour code does no normalizing). No colour-picker/admin UI
      (YAGNI).
- [x] **DOB life-stage colour channel (SHIPPED 2026-09-12, plan §2).** The DOB
      cell tints by maturity via pure `lifeStage(dob, sex, now)` in
      `apps/colony_client_web/lib/colors.ts` (never stored): baby (<21d,
      pre-weaning) = green `bg-emerald-100`; adult = NO fill (default, like a
      WT-genotype blank); old (♂>365d / ♀>304d) = amber. New exports
      `ADULT_MIN_DAYS=21` + `DOB_TINT`; the old `isOldMouse` export was
      replaced. `ADULT_MIN_DAYS` is the SAME baby/adult boundary the slot
      overcrowding count uses.
- [x] **Slot adult-density overcrowding warning (SHIPPED 2026-09-12, plan §2).**
      SHIPPED 2026-09-12: red `N/5` rail warning; capacity = `SLOT_ADULT_CAP=5`
      per-slot code const; `countSlotAdults()` (ColonyGridView.client.tsx) counts
      alive, non-dead, non-baby mice — babies (green DOB) excluded via the SHARED
      `ADULT_MIN_DAYS=21` boundary, so this warning and the DOB channel agree on
      one adult/baby line. RED (action = split slot), distinct from the amber
      "old" tint, orthogonal to the selection overlay. Q33 (cap value) / Q34
      (per-slot vs per-cage) still open.
      Compute the LIVE-ADULT count per slot AT READ (pure fn: adult = alive +
      `dob` age ≥ threshold vs today, `dob` NULL → not adult; exclude dead and
      in-transit) and, when it exceeds capacity, render a DEDICATED warning
      colour on the slot with an `N/cap` badge (e.g. "6/5"). Warning is
      orthogonal to selection/dead/filter-dim (a separate channel, not a reuse).
      Constants (adult-age threshold, capacity, per-slot vs per-cage) are
      configurable and TBD-with-professor (plan Q32–Q34). Optional: enqueue an
      Upcoming task ("split slot X — N adults > cap").
      AC: a slot whose live-adult count > capacity shows the warning colour +
      `N/cap` badge; dead/in-transit mice and mice below the age threshold are
      excluded from the count; the count is derived at render (never a stored
      column); changing the capacity/threshold constant changes the result with
      no other code change.
