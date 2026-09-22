# PLAN §2 — Architecture decisions

> Split from `PLAN.md` (rules/docs.md §1). The PLAN.md stub is the truth if
> the two disagree; update both in the same edit.
> Section number and bullet order are PRESERVED — citations of the form
> `plan §2` resolve here.

## 2. Architecture decisions (received from architect + ml-engineer briefs)

Recorded here for traceability; owned by the architect, not this doc.

- **Stack (fixed, proven in sibling project_tradelunch):** pnpm + turbo monorepo
  (apps → packages → libs, no circular deps). Next.js 16 SSR client (PWA in P2).
  Node/Express server. React Query + zod. Clerk auth deferred to P2.
- **Monorepo layout:** `apps/colony_client_web`, `apps/colony_server`
  (controllers → services (transaction boundaries ONLY here, via
  withTransaction) → repositories (each fn takes an executor param:
  Pool | PoolClient) → @repo/db), `packages/db` (@repo/db: schema .sql +
  numbered migrations + a pg Pool singleton exposing query(sql, params) and
  withTransaction(fn); no domain logic), `packages/types` (@repo/types shared
  DTOs), `packages/domain` (@repo/domain: pure parsers, no I/O). Deps:
  client→{types,domain}; server→{types,db,domain}; domain→types only;
  packages/domain stays pure (no I/O, no node-only imports) so it is
  client-bundlable. NOTE: genotyping and ioxlsx(export) controllers are DEFERRED
  with their subsystems per the 2026-09-04 re-scope — do not scaffold them.
- **Raw SQL via `pg` (node-postgres), NO ORM** — clarity, performance-critical ETL
  paths, auditable queries (per repo §7 DB rule). Optional pgtyped for typed raw
  SQL; transaction boundaries defined in the service layer only (2026-09-04).
- **BIGINT identity PKs read as STRINGS end-to-end. Soft-delete only (`deleted_at`)**;
  the only append-only table left is `audit_log` (R16-R23 replaced `mouse_move`,
  `mouse_attr_log` and `task_status_history` with VERSION ROWS on `mice`,
  `mates`, `tasks` and `notes`). Every append row carries `actor_id NOT NULL`. New `transfer` (P0-c)
  and `snapshot` (P1) tables are MUTABLE (`deleted_at`) — NOT part of the
  append-only class. `import_batches`/`raw_sheet_rows`/`import_errors` are
  likewise MUTABLE tables (`import_errors` has a mutated `resolved_at`) — NOT
  part of the append-only class.
- **FOREIGN KEYS ARE ALWAYS ENFORCED (DECIDED 2026-09-04, user).** Relations are
  used everywhere, at every stage, including during prototyping. There is NO
  bypass mechanism and none should be documented or used — not
  `session_replication_role`, not disabled triggers, not dropped constraints.
  If an insert is rejected, the data or the insert order is wrong; fix that
  rather than weakening the constraint.
  WHY (kept, because this gets re-litigated): `ALTER TABLE ... ADD FOREIGN KEY`
  FAILS if a single orphan row exists, and by then it is usually impossible to
  tell which rows are wrong — the practical outcome is discarding data or
  abandoning the FK. It also matters HERE specifically: distinguishing "mate
  legitimately unresolved" (a nullable FK left NULL, plus an import_errors warn)
  from "reference broken by a typo" is the core of the import design, and
  without enforced FKs those two are indistinguishable.
  Circular references are resolved by CREATE-then-ALTER ordering, as
  `litters`↔`mice` already is in 0002 — not by deferring enforcement.
- **ETL placement (P0):** synchronous exceljs in a server helper, one transaction,
  isolated behind an interface so it can promote to a queued worker later without
  rewrite.
- **Local-Postgres-first:** P0 runs fully local (no cloud); schema kept
  Supabase-compatible for later. **Provisioning DECIDED 2026-09-04: Homebrew
  `postgresql@17` + a ~90-line own migration runner in `packages/db` — NO Docker,
  NO Supabase CLI in P0** (rejected mirroring the sibling, whose `db:start`
  sudo-symlinks a colima socket; it buys studio/auth/storage emulation P0 is
  forbidden from using). Forward-only numbered `NNNN_*.sql`, checksum-tracked in
  `schema_migrations`. Forward-compat holds because plain Postgres IS Supabase's
  engine and RLS lands later as additive `ALTER TABLE ... ENABLE ROW LEVEL
  SECURITY` / `CREATE POLICY` migrations. RISK: PG major-version drift — pin
  `postgresql@17` now and verify Supabase's PG major before the P2 cutover. CI
  later runs the SAME runner against a `postgres:17` service container, unchanged.
- **Mock/seed data is a P0 deliverable:** realistic anonymized seed derived from the
  real xlsx so the prototype and tests run without the live file.
- **NO ML in the pipeline:** rules suffice and are auditable — the workbook's colors
  already encode state. Optional one-time Claude Haiku note-classification for
  migration assist is possible but NOT recommended for MVP; default rules-only.
- **User-aware schema from P0** (stub default user, `clerk_user_id` column reserved)
  so P2 auth/roles/RLS is additive, not a migration.
- **TESTING SUSPENDED UNTIL DEVELOPMENT IS DONE (user directive, 2026-09-04):**
  no test files are written and no suite is run during the build-out. Jest +
  ts-jest remains the chosen runner and `@repo/jest-config` stays in the repo,
  deliberately unused — it is NOT dead code. The suite gets written in ONE pass
  at the end, against finished behaviour, because the schema and parsers are
  still moving and tests written now would be rewritten before catching
  anything. Meanwhile correctness is established by DELIBERATE BREAKAGE against
  the real system (trigger the failure, observe it, clean up) rather than by
  inspection — the standard the P0.2 DB guards were held to. See CLAUDE.md §19.
- **Enum count = SIX (2026-09-04, R10):** the R10 redesign adds
  `mouse_event_kind`, so the P0.2 "exactly 5 enums" AC is superseded (see
  TASKS P0.2 REOPENED). Testing remains SUSPENDED per the directive above —
  the redesign does not reopen it.
- **Test-tooling note (CLOSED 2026-09-04):** ml brief specified pytest for the
  core parsers, but the fixed stack is a TS monorepo and `packages/domain` is
  TypeScript — pytest cannot test it; `rules/python.md` applies only to Python
  subprojects and there are none. Discrepancy CLOSED in favor of **Jest +
  ts-jest**, reusing `@repo/jest-config` from the sibling — NOT Vitest: CLAUDE.md
  §19 names Jest and project_tradelunch already standardizes on it.
- **Multi-channel identity colours (2026-09-12, user — the professor reads STATE
  BY COLOUR at a glance, the dashboard's core value).** A mouse's colour is NOT
  one value but several ORTHOGONAL CHANNELS, rendered as an Excel-style
  colour-cell row (fixed columns so a channel scans down its column). Two kinds:
  - **Rule-derived** — `sex` (♂ blue / ♀ pink) and `age` (♂ > 1y / ♀ > 10mo →
    amber). Pure functions of the mouse's own fields, computed AT READ. Age is
    time-dependent, so its colour is NEVER stored (it would go stale daily);
    ship `dob`, derive `isOld` on render. Adding a rule channel costs zero
    storage.
    - **SHIPPED 2026-09-12 — DOB life-stage channel** (`lib/colors.ts`
      `lifeStage(dob, sex, now)`, replacing the old `isOldMouse`): baby
      (<21d, pre-weaning) = green `bg-emerald-100`, adult = NO fill (default,
      like a WT-genotype blank), old (♂>365d / ♀>304d) = amber. Pure, computed
      at read, never stored. New exports `ADULT_MIN_DAYS=21` + `DOB_TINT` — the
      21d boundary is SHARED with the slot overcrowding count below.
  - **Assigned** — `genotype`, `mate-group` (the `'line'` channel is RETIRED —
    2026-09-12; the genotype-first line rail shipped and the nominal genotype
    colour is the sole line-rail hue, WT lines neutral). A stable colour bound to
    a CATEGORICAL KEY, resolved server-side. Storage is a palette + an assignment
    table, NOT a per-record colour column:
    `color_palette(token, hex UNIQUE, channel)` — every colour in use, one place,
    `UNIQUE(hex)` so one hex = one meaning — plus
    `color_assignments(channel, key, token)` `UNIQUE(channel, key)`, keyed on the
    category (canonical genotype string / line_id / mate_group_id), NEVER
    per-mouse (recolour = one row). `channel` is `text + CHECK` (extensible),
    not a hard PG enum. WT / unknown `'?'` genotype → NULL = default cell
    background (only MUTANTS carry a hue, so they pop; a mouse whose genotype
    colour differs from its line's nominal colour is a visible transfer).
  - **Colour ALLOCATION uniqueness (rule added 2026-09-12, user — "so we
    don't pick an already-used colour").** `color_palette` already carries
    `UNIQUE(hex)` (one hex = one meaning). The ALLOCATION rule on top:
    assigning a colour to a NEW key (gene/genotype/mate — the `'line'` channel
    is retired 2026-09-12) picks the next
    palette token whose hex is NOT already referenced by an existing LIVE
    (`deleted_at IS NULL`) `color_assignments` row in the uniqueness scope:
    `SELECT token FROM color_palette p WHERE NOT EXISTS (SELECT 1 FROM
    color_assignments a WHERE a.token = p.token AND a.deleted_at IS NULL)
    ORDER BY p.sort LIMIT 1`. INVARIANT: no two LIVE assignments share a hex.
    **Q35 RESOLVED 2026-09-12 (user): scope = PALETTE-WIDE (global), NOT
    per-channel** — one hex is used by at most one live assignment across ALL
    channels, so the `[AND a.channel = :channel]` clause is DROPPED (a genotype
    and a mate-group may NOT reuse the same hex). Rationale:
    `docs/design/crud-and-color-palette.md` Topic 2/Q35.
    **Colour FREES EAGERLY on last-live-user delete (decision 2026-09-12,
    user).** Both live channels are keyed by a CATEGORY shared across many rows,
    so a colour returns to the free pool via eager-with-count-check: after the
    delete, if NO live user of the key remains, soft-delete the
    `color_assignments` row (`deleted_at = now()`) in the same transaction —
    genotype frees when the LAST live mouse of that canonical genotype is
    deleted; mate frees when the father-fanout group's LAST live mating is
    deleted. The allocation query above already filters `deleted_at IS NULL`, so
    a freed hex is immediately re-allocatable. Rationale:
    `docs/design/crud-and-color-palette.md` Topic 3. These tables are
    still DESIGN-STAGE (not yet in `packages/db/SCHEMA.md`); the mock seeds
    resolved hex directly.
  - **Rule/legend REFERENCE table (decision 2026-09-12, user — "a table so
    people understand what rules we have").** A descriptive catalogue keyed by
    rule/channel — `rule_legend(key, channel, label, description, colour_ref?)`
    — spanning BOTH the code rule-channels (baby/adult/old, sex, overcrowding)
    AND the assigned channels (genotype/mate; `'line'` retired 2026-09-12). It is a
    DOCS/reference table (kept 2026-09-12) so a human / DB reader sees every rule in
    one place — NOT a UI widget: the on-screen Legend was removed (the coloured
    signal filter chips already serve that purpose). DESCRIPTIVE ONLY: the
    numeric THRESHOLDS (`ADULT_MIN_DAYS=21`, `SLOT_ADULT_CAP=5`, old-day limits)
    stay in code as the single source — the table must NOT restate them, or the
    two drift (this is why we rejected a `description` column on `color_palette`:
    code rule-colours are not palette tokens, so a palette column can't cover
    them). If the professor later wants to TUNE thresholds without a deploy,
    THAT is a separate `rule_config` decision (promote the constants), not this
    legend table. Also DESIGN-STAGE.
  - **Mate group = father-fanout** (connected-component was wrong): all `mates`
    rows sharing a father form one group; a female mated to two males belongs to
    two groups, so `mateColors` is a LIST, one hex per group.
  - **Signal (state) colours stay reserved** (row left-spine + id-text colour);
    identity colours own their own cells — disambiguated by SCOPE, not by
    avoiding the blue/pink/yellow that sex/age need.
  - **DB tables land with the real `colony_server`;** the mock seeds the resolved
    hex directly on the DTO (same mock→real seam as everything else). DTO
    additions: `MouseCell += dob, genotypeColor, mateColors`;
    `GridLine += nominalGenotypeColor` (the earlier `lineColor` field was DROPPED
    2026-09-12 — the `'line'` colour channel is RETIRED; the genotype-first rail
    shipped and the nominal genotype colour is the SOLE line-rail hue, WT lines
    neutral). This SUPERSEDES the old
    single-select `Color by: Off|Line|Genotype` toggle (all channels now always
    on; the professor wanted every colour at once).
- **Slot adult-density overcrowding WARNING (2026-09-12, user — new
  rule-derived channel, same KIND of pure signal as age/`isOldMouse`).** A slot
  (confirm slot vs cage with the professor — Q34) has an ADULT capacity
  (proposed 5); when the count of LIVE ADULT mice in it exceeds that capacity
  the slot renders a DEDICATED WARNING colour (amber/red) with the count shown
  (e.g. "6/5") so it is actionable at a glance.
  - **Computed AT READ, never stored.** Adult-ness is age ≥ a threshold, so it
    is time-dependent (a slot silently tips over capacity as pups grow up) — a
    pure function of each mouse's `dob` + today, exactly the discipline of the
    age/`isOld` rule. `dob` NULL → not countable as an adult (mirror
    `isOldMouse`'s null-returns-false). Storing the count would go stale daily.
  - **Count only LIVE mice** (`is_alive = true`); exclude dead/sac and
    in-transit (`transit_status` not settled), so the warning reflects who is
    physically crowding the slot right now.
  - **ORTHOGONAL always-on status.** A separate warning colour on the slot — NOT
    a reuse of the selection highlight (primary), dead (gray) or filter dim
    (opacity). It coexists with all three, like the identity channels.
  - **Three professor-confirmed, configurable constants** (Q32–Q34): the
    adult-age threshold (user said 3 weeks / 21 days, but 21d is really WEANING
    age — true "adult" may be later, ~6–8 weeks; flag as a constant to confirm,
    not weaning), the capacity value (proposed 5), and whether the limit is
    per-slot or per-cage.
  - **Optional automation tie-in:** surface an over-capacity slot as an Upcoming
    task ("split slot X — N adults > cap"), matching the "automate" pitch.
  - **SHIPPED 2026-09-12:** RED slot-rail warning + `N/5` count badge;
    capacity = per-slot code const `SLOT_ADULT_CAP=5`; `countSlotAdults()`
    counts alive, non-dead, non-baby mice. Babies (green DOB) are NOT counted,
    so this warning and the DOB life-stage channel share ONE adult/baby line
    (`ADULT_MIN_DAYS=21`, the shipped `lifeStage` boundary — the age rule is
    now `lifeStage`, not the retired `isOldMouse`). Red = action-required
    (split slot), distinct from the amber "old" tint, orthogonal to selection.
    Professor-confirm still open: Q33 (cap value), Q34 (per-slot vs per-cage).
