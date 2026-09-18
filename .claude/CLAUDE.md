# Claude Code Agent Rules

AI-assisted engineering workflow. Optimize for correctness, simplicity, maintainability.

## Priority Order (tiebreaker)

1. correctness → 2. simplicity → 3. maintainability → 4. explicitness → 5. performance → 6. abstraction quality

## Core Principles

- **Correctness first** — no guessing/hallucinating. If unclear → stop and ask. Explicit over implicit.
- **KISS + YAGNI** — simplest working solution first; no abstraction without proven need; no premature optimization.
- **SRP** — one responsibility per module/function; split when multiple appear.
- **Functional core** — business logic = pure functions (deterministic, no hidden state/global deps); side effects isolated at boundaries.
- **Least privilege** — DB/network/file I/O isolated in infra layer; domain logic performs no side effects.
- **Composition > inheritance**; DI required; avoid god classes / deep inheritance. OOP only for polymorphism, stateful domain models, or plugin systems.

## Structure & Layering

- Module size: **300 lines = soft default** (smell threshold). LOC is a proxy for SRP, not the rule itself — the real test is "one file = one responsibility". Exceeding 300 = **split OR justify**: a single cohesive responsibility where splitting would create artificial seams (shared private state, prop-drilling) may run to **~400**; **400 = hard review line** (split-review beyond). Multiple responsibilities → split regardless of count.
- Dependency direction (no reverse deps): **UI/API → Service → Domain (pure) → Infrastructure**.
- Monorepo DAG: **apps → packages → libs**. No circular deps.

## Database (§7)

- Prefer **raw SQL** for clarity / performance-critical paths; ORM only for non-critical CRUD.
- Repository layer = thin abstraction. Transaction boundaries defined in **service layer only**.

## Configuration (§8)

- All config env-based (`.env`); no hardcoded secrets/env values.
- Precedence: **env vars > config files > defaults**.

## Naming (§10, §17)

- functions: verb-based (`create`, `calculate`, `fetch`); data: noun-based (`user`, `order`).
- boolean: `is`/`has`/`can` prefix. Avoid generic names (`data`, `temp`, `foo`).
- folders: `use-api` / `use-ws` / `use-poll`
- files — api (Next app): camelCase `[method][Name].api.ts` (owner-decided; e.g. `getPosts.api.ts`); parsing: `*.parsing.[api|ws].*`; ws: `*.ws.*`; mock: `mock.[api|ws].[source].[name].json`
- TS imports: **no extension**. (Next.js suffix rules live in `rules/nexjts.md`.)

## Workflow Docs

Exactly **four** root docs: `00.plan.md` / `00.tasks.md` / `01.status.md` (living, agent-maintained)
+ `01.rules.md` (the OWNER's rules in their own words — agents READ it, NEVER write it; where a
rule here overlaps, this file CITES `01.rules.md` instead of restating it). Root docs are the
INDEX: stubs + cross-cutting content. Per-sub-phase ACTIVE detail lives in **`docs/phases/`**
(committed; read on demand — the root stub is the truth; every phases file MUST have a stub).
Completed work moves to `_docs/archive/` (gitignored cold storage). No other per-feature doc
variants. Full spec (three tiers, promotion/demotion lifecycle, stub format, guard tokens,
status line style, **READ GUARDs**, `01.rules.md` ownership) is owned by **`rules/docs.md`** — see there.

## Execution Discipline

- Atomic commits; small incremental, rollback-safe diffs.
- Quality gates before completion: lint + typecheck + tests (logic layer) pass; no dead code / unused exports.
- Comments explain **WHY**, not WHAT.

## Agent Discipline (§18)

1. One small task at a time; simplest working version first.
2. No assumptions — only explicit requirements. If unclear → stop and request.
3. Every step produces working output; verify before next step.
4. Keep changes minimal and isolated; avoid redesign unless necessary.
5. Fail fast, fix immediately, continue incrementally.
6. If complexity grows or boundaries unclear → stop, reduce scope, re-apply SRP.

## rm -rf (soft-delete)

Never delete directly. Rename file/folder with `x_` prefix so the user can verify and remove manually.

## Jest & Docs (§19)

- **TESTS ARE SUSPENDED (user directive, 2026-09-04) — this OVERRIDES the rest
  of §19 and §21.1.** Do NOT write test files. Do NOT create `*.test.ts` /
  `*.spec.ts`, do NOT scaffold Jest configs into workspaces, do NOT run
  `pnpm test` / `turbo test`. Jest + ts-jest stays the CHOSEN runner and
  `@repo/jest-config` stays in the repo — it is deliberately unused for now and
  is NOT dead code to be cleaned up. Testing resumes once development is done;
  the suite is written THEN, in one pass, against finished behaviour.
- Rationale: the schema and parsers are still moving. Tests written now would be
  rewritten before they ever caught anything, and would slow each iteration.
- **What replaces tests meanwhile:** verify by DELIBERATE BREAKAGE against the
  real system — trigger the failure, observe the error, then clean up. Never
  report an invariant as holding because the code looks right. This is the
  standard the DB guards were held to.
- Update documentation surgically.

## End-of-task finalization (§21)

Do these ONCE, at the very end of a task (not iteratively mid-work):

1. **Docs update, once.** Update documentation surgically to match what shipped.
   (The jest step is SUSPENDED — see §19.)
2. **Run the project once, in the background.** Launch the app one time to
   confirm it boots, running it in the background (non-blocking) so it does not
   hold the session; report the result.

## Agent Guardrails (§22 — from real incidents)

1. **Subagents NEVER `git commit`/`git push`** — the main session (or the user) commits. A developer
   agent once auto-committed+pushed to main sweeping in unrelated WIP.
2. **Doc edits are surgical** — never rewrite a whole living doc (`00.plan.md`/`00.tasks.md`/`01.status.md`)
   or a `docs/phases/` file from scratch; another session may share this checkout. Verify the diff after any
   agent doc write. `01.rules.md` is never edited by an agent at all (`rules/docs.md` §8).
3. **Worktree agents:** `git reset --hard main` before starting — isolation worktrees can base off a
   stale commit.
4. **DB rows:** never hard-DELETE — `deleted_at` tombstone + mask at read (sanctioned exceptions are
   recorded in the plan doc).

## Language-specific rules

`rules/python.md`, `rules/nexjts.md`, `rules/docs.md`, `rules/BASE.md` load automatically — consult them for stack details.

## Authoring rules (NOT auto-loaded — read on demand)

`authoring/book.md` (book writing: Korean voice, 한글(English) bilingual policy, In-brief
section openers, analogy consistency, semantic macros) and `authoring/latex.md` (XeLaTeX +
xeCJK, fonts, the installed-package inventory, build, TikZ/table pitfalls).

They live outside `rules/` on purpose: this repo has no books and no `.tex`, so loading them
into every session would be pure overhead. **Read them before writing or editing any book
chapter or `.tex` file.** Both are portable — copy them into another repo's `.claude/` as-is,
and move them to `rules/` there if that repo's work is mostly authoring.
