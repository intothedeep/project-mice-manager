# CLAUDE.md

Repo-specific facts and the owner's rules for **project_lopez_auto**.
Normative agent rules live in `.claude/CLAUDE.md` + `.claude/rules/*` (a shared
submodule, `intothedeep/.claude`). This file never restates them — it names what
only this repo knows, and holds the owner's own words (§Owner rules below).

## What this repo is

Mouse-colony automation for the Lopez-Juarez lab — cage/slot grid, breeding and
litter records, task ("case") workflow, genotyping. A colony is a physical rack
of cages; most of the domain modelling exists to keep the screen and the rack in
agreement.

## Stack and commands

pnpm 9.15.9 + Turborepo. Node ≥ 24 (`.nvmrc` = v24.3.0).
`auto-install-peers=true`, `node-linker=isolated` (`.npmrc`).

| | |
|---|---|
| `pnpm dev:web` | Next.js client (`apps/colony_client_web`) |
| `pnpm dev:server` | Express + zod API (`apps/colony_server`) |
| `pnpm build` | **the build command** for `.claude/CLAUDE.md` End-of-task |
| `pnpm lint` | ESLint. Gate is **0 errors** — prettier warnings are not a gate |
| `pnpm check-types` | `tsc --noEmit` across the workspace |
| `pnpm format` | prettier. Honours `.prettierignore` — living docs are excluded |

`pnpm test` exists in `turbo.json` but tests are SUSPENDED
(`.claude/rules/core.md`); the config is deliberately unused, not dead code.

## Topology

```
apps/colony_client_web   Next.js client — the grid, drawers, task views
apps/colony_server       Express + zod API
packages/db              migrations, SCHEMA.md, ERD
packages/domain          pure domain logic (parsers, codecs) — no I/O
packages/types           shared DTOs; packages/types/src/grid.ts is the grid contract
packages/{eslint,jest,typescript}-config
```

`packages/types/dist/` is untracked build output — read `src/`, never `dist/`.

## Living docs

Lifecycle rules are owned by `.claude/rules/docs.md`. Paths only:

```
PLAN.md      intent, roadmap, data/ETL scope + stubs for the split-out
             §2 architecture decisions (docs/phases/architecture.plan.md)
             and §5 open questions (docs/phases/open-questions.plan.md);
             section/Q numbering is preserved there, so `plan §2` and
             `plan §5 Q43` citations still resolve
TASKS.md     task list with acceptance criteria (stubs → docs/phases/)
STATUS.md    append-only progress log
docs/phases/    ACTIVE per-sub-phase detail, split per docs.md §1
docs/design/    design spikes and owner input — output artifacts, not living docs
_archive/       COLD STORAGE, committed. Do not read unless investigating history
```

A stub in `PLAN.md` / `TASKS.md` is the TRUTH if it and a `docs/phases/`
detail file disagree; update both in the same edit.

## Where the project is

**P0.7-b, mock-era (MVP1).** The client runs entirely on mock APIs
(`apps/colony_client_web/apis/*.mock.api.ts`); there are no server writes yet.
The mock and the real API must satisfy the SAME schema — `packages/types` is
that contract. Current state lives in `TASKS.md`, not here.

---

## Owner rules

> **This section is the owner's.** Agents READ it; agents NEVER write it — not to
> fix a typo, not to "sync" it, not to add a heading. Any change here is the
> owner's own. (Merged from `01.rules.md`, 2026-09-22; the separate file is
> retired. `.claude/rules/docs.md` §6 describes the same guard for repos that
> still keep a standalone `01.rules.md`.)
>
> The rest of this file above is repo FACTS and agents may keep it current.
> Where a rule here overlaps `.claude/CLAUDE.md`, that file cites this section
> rather than restating it — one copy of every rule sentence. If the two ever
> conflict, agents STOP and ask the owner; authority order is in
> `.claude/rules/core.md`.

The headings below mirror `.claude/CLAUDE.md` so each rule has an obvious home.
Fill in what matters, in your own words; leave the rest empty.

### Priority Order

### Core Principles

### Structure & Layering

### Database

### Configuration

### Naming

### Workflow Docs

### Execution Discipline

### Agent Discipline

### rm -rf (soft-delete)

### Jest & Docs

### End-of-task finalization

### Agent Guardrails

### Language-specific rules
