# Rendering performance at scale (300 cages / 6000 mice)

> Analysis only — **nothing here is implemented**. Captures how the current
> client renders, what breaks at scale, and the options to fix it, so the work
> can be picked up later (most naturally when the real server lands).
>
> Status: ANALYSIS (2026-09-09). Not on the critical path while the app runs on
> the small mock fixture.

## 1. What the client renders today

`apps/colony_client_web/app/ColonyGridView.client.tsx` renders the **entire
colony at once, with no virtualization**:

- **Pane 3 "Mice — all cages"** maps every `line → cage → slot → mouse` and puts
  **all mice in the DOM** simultaneously.
- **Pane 2** renders all cages (grouped by line); **Pane 1** all lines.

Each mouse row is ~8–10 DOM nodes: checkbox + genotype swatch + id button +
genotype text + sex + Move button (+ an optional attention line).

So at **6000 mice ≈ 50,000–60,000 DOM nodes** for the mice pane alone, plus 300
cage headers (each `sticky` + `backdrop-blur`) and the slot headers.

## 2. What happens at 300 cages / 6000 mice

Not a crash — but visibly janky:

1. **Initial render / paint.** Laying out and painting ~50k+ nodes takes
   ~hundreds of ms to a few seconds on first display, with a large memory
   footprint.
2. **Every state change re-renders all 6000 rows.** Rows are not `React.memo`'d
   and state lives at the top of `ColonyGridView`, so:
   - **Typing in search** re-renders the whole tree on every keystroke → input lag.
   - **Selecting one mouse** (checkbox) mutates top-level `selected` → all 6000
     rows re-render.
   - **Switching active line/cage, or the color-by toggle** → same full re-render.
3. **Count recomputation.** `countMatches` runs per line and per cage on every
   render (O(mice) each). Linear and cheap in isolation, but it stacks on top of
   the full re-renders above.
4. **`sticky` + `backdrop-blur` on ~300 headers** is expensive to paint while
   scrolling.
5. **Move.** `moveMouse` does `structuredClone(colony)` on every move — an O(n)
   clone of all 6000 mice per action (a few ms each).

**Key point:** the bottleneck is the **browser DOM size + full re-render on every
state change**, *not* the data or the database. In Postgres, selecting 6000
head-rows with the right indexes (on `cage_id`, `mouse_meta_id`) is not the
problem.

## 3. Options (ranked by impact, with trade-offs)

### a. Virtualization / windowing — the standard fix, biggest win
Render only the ~30–50 visible rows via `@tanstack/react-virtual` (or
react-window). DOM drops from ~50k to a few hundred; 6000 (and tens of
thousands) scroll smoothly.
- **Effort:** medium. Rows have **variable height** (the attention line) and
  **cage/slot headers are interleaved**, so the tree must be flattened into a
  single list of `{header | row}` items driven by one virtualizer.

### b. Server-scoped fetch (load the active unit only) — cuts data *and* DOM
Make Pane 3 render only the **selected cage (or line)**, not everything — i.e.
the original drill. `GET /cages/:id/mice` returns ~20–50 rows.
- **Pro:** minimal fetch and DOM; fits the real API naturally.
- **Con:** gives up "all 6000 at once" — but 6000 rows are not humanly scannable
  anyway. Pairs well with (a) (virtualize inside the scoped set).

### c. Collapse cages / lazy sections — low-cost middle ground
Render cage headers first; render a cage's mice only when it is expanded or
scrolls into view (IntersectionObserver). Collapsed by default → 300 headers +
whatever is expanded.

### d. Reduce re-render cost (necessary alongside (a), insufficient alone)
`React.memo` on `MouseRow` + stable callbacks; move **selection** into a context
/ external store so toggling one checkbox doesn't re-render all rows; **debounce**
the search input; memoize counts. Cuts interaction lag — but does **not** solve
the initial 50k-node problem; needs a or b.

### e. Server-side filtering + pagination
Push the filter to the server; receive **only matching rows + counts**. Keyset
(seek) pagination for large result sets. DOM only ever holds matches.

### ⑥ Minor paint wins
Drop `backdrop-blur` on the ~300 sticky headers (use a solid background);
replace `moveMouse`'s full `structuredClone` with a targeted update.

## 4. Recommended combination (when implemented)

**b active-cage/line scope + a virtualization inside it + d memo/debounce.**
When the real server arrives, add **e server-side filter + keyset pagination**.
This is the realistic path to smooth handling of 300 cages / 6000 mice.

Today (mock, small fixture) there is no problem; the natural time to adopt
**b+e** is at the real-server integration.
