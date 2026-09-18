# Documentation Lifecycle Rule

How the living docs stay small, how ACTIVE detail is sharded per sub-phase,
and how completed work is archived without bloating context. This rule is
portable across projects.

## 0. Three tiers (added 2026-09-16, owner-approved)

```
[00.plan.md / 00.tasks.md]   [docs/phases/]        [_docs/archive/]
 index · stubs · general  ──▶  ACTIVE detail  ──▶   completed · frozen
 always read                  read on demand        do not read by default
 committed                    committed             gitignored
```

- **Root docs** = the index: stubs, general/cross-cutting content, roadmap
  skeleton. Always read.
- **`docs/phases/`** = ACTIVE per-sub-phase detail. Committed. Read ON DEMAND
  when a root stub is insufficient (§4a).
- **`_docs/archive/`** = completed/frozen history. Gitignored. Do NOT read by
  default (§4).

WHY the middle tier: the root docs outgrew what agents can Write in one call
(`00.tasks.md` hit 65 KB with NOTHING archivable — every `[x]` was already a
stub; the bulk WAS the open backlog). Archiving cannot shrink an open backlog;
only sharding active detail can.

## 1. Four living docs (root) + the phases tier

Exactly four root docs, no per-feature variants at root:

- `00.plan.md` — product intent, roadmap, architecture decisions.
- `00.tasks.md` — atomic task breakdown per phase.
- `01.status.md` — sequential progress log.
- `01.rules.md` — the OWNER's project rules, in their own words (§8 — agents
  never edit it).

These hold **active work only**. Completed work moves to the archive.

Per-sub-phase ACTIVE detail lives in **`docs/phases/<phase-slug>.<doc>.md`**
(e.g. `docs/phases/p0.9.tasks.md`, `docs/phases/p0.7.plan.md`,
`docs/phases/p1.genotyping.tasks.md`). The root doc keeps a stub per shard.
Shard by SUB-PHASE (`###` level), not by phase — a `##`-level shard is as big
as the root doc was. Only genuinely phase-scoped content moves; content that
spans phases (open questions, invariants, domain semantics, the roadmap
skeleton) STAYS in the root doc as "general".

**Two safety rules (mandatory — they are why "no per-feature variants" was
the rule until now; a detail file that goes stale is worse than no file):**

1. **The index line is the truth; the detail file is subordinate.** If a root
   stub and its `docs/phases/` file disagree, the stub wins. Consequence: a
   stub must carry current STATE (status word, open/in-progress/done counts,
   the gating fact) — and when a task changes state, the detail file AND its
   stub are updated in the SAME edit. Never one without the other.
2. **No orphans.** Every file in `docs/phases/` has a stub in its root doc.
   A file with no stub is a rule violation; fix by adding the stub or by
   moving the file to `_docs/archive/`.

Phases-stub shape:

```markdown
### P0.9 Task model v2 — cases + child tasks — IN PROGRESS (Wave 1 [~~], Wave 2 [ ], Wave 3 [~~])

> One-line summary of scope + the gating fact. <!-- DETAIL: active, read on demand -->
> Detail: [docs/phases/p0.9.tasks.md](./docs/phases/p0.9.tasks.md)
```

## 2. Archiving completed work

When a phase/feature is fully `DONE` / `SHIPPED` / `SUPERSEDED`:

1. Cut its full detail from the living doc.
2. Paste it into an archive file under `_docs/archive/`.
3. In the living doc, leave only a **stub**: title + status + a one-line
   summary + a link to the archive file.

Stub shape:

```markdown
### Phase A — Deploy (Vercel + Supabase) — DONE (2026-06-26)

> One-line summary of what shipped. <!-- ARCHIVE: history-only -->
> Detail: [\_docs/archive/plan.phase-A.md](./_docs/archive/plan.phase-A.md)
```

Archive file naming: `<doc>.<phase-slug>.md`
(e.g. `plan.phase-A.md`, `tasks.phase-D.md`) — LEGACY names for files archived
before 2026-09-16; keep them, do not rename (the living docs link to them).

**Lifecycle with the phases tier (added 2026-09-16):**

- **Promote** (root → phases): when a sub-phase's detail outgrows the root
  doc, move the block VERBATIM to `docs/phases/<phase-slug>.<doc>.md` and
  leave a phases-stub (§1). Relative links inside the moved block are
  rewritten for the new depth (`./_docs/…` → `../../_docs/…`) — the ONLY
  sanctioned content change during a move.
- **Demote** (phases → archive): when that sub-phase is fully DONE, the move
  is a plain `git mv`-style move with the FILENAME UNCHANGED —
  `docs/phases/p0.7.tasks.md` → `_docs/archive/p0.7.tasks.md` — and the
  root stub's guard token flips from `DETAIL` to `ARCHIVE` (§4a) with the
  link repointed. New archive files therefore use `<phase-slug>.<doc>.md`;
  the legacy `<doc>.<phase-slug>.md` files stay as they are.
- A sub-phase that never needed a shard archives directly from the root doc
  as before.

`_docs/` is gitignored (local-only archive) — the archive is cold storage on
disk, not committed. The living docs (with stubs) and `docs/phases/` are the
committed truth.

## 3. Partially-done features

- Keep the feature title in the active doc.
- Under it, keep **only the not-done tasks**.
- Move completed sub-tasks to that feature's archive file.
- **Never archive a feature while any of its tasks is still open.**

## 4. Archive = cold storage (READ GUARD)

This is the part that keeps context small. Treat `_docs/archive/*` as
history-only. **Do not read it by default.**

Open an archive file ONLY when:

- (a) the user explicitly asks about a past decision or history, OR
- (b) the active stub is insufficient and a superseded detail is genuinely
  needed for the current task.

Otherwise the one-line stub in the living doc is considered sufficient — do
not follow the link.

Enforcement (three layers):

1. Every archive link carries an inline `<!-- ARCHIVE: history-only -->`
   guard comment.
2. Each living doc starts with a one-line banner (see §6).
3. This rule file, which overrides inferred behavior.

## 4a. Phases = active detail, read ON DEMAND (added 2026-09-16)

`docs/phases/*` is NOT cold storage — it is live work — but it is still not
read by default. Distinguish the two tiers by their guard token:

| tier             | token                                     | when to open                                                                                                  |
| ---------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `_docs/archive/` | `<!-- ARCHIVE: history-only -->`          | history questions only (§4)                                                                                   |
| `docs/phases/`   | `<!-- DETAIL: active, read on demand -->` | the stub is insufficient for the CURRENT task (e.g. you are about to work on that sub-phase and need its ACs) |

Never put the ARCHIVE token on a phases link — it would tell readers not to
open active work. When you DO open a phases file for a task you are working
on, you are then responsible for keeping it and its stub in sync (§1 rule 1).

## 5. `01.status.md` line style

- One line per update, newest at the bottom, append-only.
- Each line must be short, concrete, and informative — drop non-critical
  words (filler, hedging, redundant context).
- Format: `<date> <area>: <what changed> (<commit/ref>)`
- No prose blocks, no multi-line entries.
- Terse-first: it stays whole and terse. Existing verbose lines are rewritten
  to this style in place (no information lost).
- **Soft-delete a superseded line (added 2026-09-05) — the log's `deleted_at`.**
  A line whose decision was later reversed is NOT deleted and NOT left bare.
  Mark it IN PLACE with strikethrough plus a dated marker, and ALSO append the
  new decision at the bottom:

    ```markdown
    ~~2026-09-04 db: old decision text~~ <!-- SUPERSEDED 2026-09-05 -->
    ```

    Why both: the marker is for the READER (this log is scanned top-down, so a
    stale line contradicted only 5 lines later will be believed and acted on
    before the reader ever reaches the correction); the appended line is the
    CHRONOLOGY (it records what replaced it, and when). Neither alone suffices.
    The text is never removed — same soft-delete safety as §7 and the repo's `x_`
    rule. This is the ONLY sanctioned in-place edit besides terseness rewrites,
    and the superseded line's wording must NOT be changed while marking it.
    **Only strike a line whose WHOLE content is dead.** A status line usually
    packs several decisions; if just one clause went stale, append a correction
    and leave the line unstruck. Striking a mostly-still-true line hides live
    information and is worse than leaving it bare. (Learned the hard way
    2026-09-05: the R8/R9 fold line was struck whole over one stale trailing
    clause about the test runner, and had to be reverted.)

- **Periodic roll-off (added 2026-06-30):** when the log outgrows the active
  cycle, the OLD settled lines (a completed era whose phases are already
  archived) may be moved — not deleted — into
  `_docs/archive/status.<range>.md`, leaving a one-line banner (§6-style) at
  the top of the living log pointing to the archive. Only the active/current
  cycle stays live. This is a MOVE (soft-delete safety, §7); never drop lines.

## 6. Living-doc banner

`00.plan.md` and `00.tasks.md` start with this directly under the title:

```markdown
> Completed items live in `_docs/archive/` (cold storage — do not read unless
> investigating history). Active per-sub-phase detail lives in `docs/phases/`
> (read ON DEMAND when a stub below is insufficient; the stub is the truth).
> This doc holds the index + cross-cutting content + planned work only.
```

`01.status.md` keeps the original two-line banner (it has no phases shards):

```markdown
> Completed items live in `_docs/archive/` (cold storage — do not read unless
> investigating history). This doc holds active + planned work only.
```

Each `docs/phases/<phase-slug>.<doc>.md` starts with:

```markdown
> ACTIVE detail for <sub-phase>, sharded from `<root doc>` (rules/docs.md §1).
> The root stub is the truth if the two disagree; update both in one edit.
```

`01.rules.md` is NOT a lifecycle doc and carries no lifecycle banner — only
its ownership note (§8).

## 7. Soft-delete safety

Per the repo "rm -rf" rule, archiving is a **move**, not a delete: content is
relocated to `docs/phases/` or `_docs/archive/`, never destroyed. Every line
that leaves a living doc must exist in its destination file FIRST — write the
destination, read it back, then cut. If unsure whether something is truly
done, leave it in the living doc.

## 8. `01.rules.md` — the owner's doc (added 2026-09-16)

- `01.rules.md` is where the PROJECT OWNER describes the project rules in
  their own words. **Agents READ it; agents NEVER write it** — not to fix a
  typo, not to "sync" it, not to add a section. Any change is the owner's.
- `.claude/CLAUDE.md` stays the NORMATIVE agent contract. Where the two
  overlap, CLAUDE.md CITES `01.rules.md` (e.g. "see 01.rules.md §Naming")
  rather than restating the text — there is exactly ONE copy of any rule
  sentence, never two, so the two files cannot drift.
- If `01.rules.md` and CLAUDE.md conflict, STOP and ask the owner; do not
  resolve it by editing either file.
