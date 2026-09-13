'use client';

import type {
    ColonyGrid,
    GridLine,
    MouseCell,
    ParentCell,
    Sex,
    SignalColor,
} from '@repo/types';
import { useMemo, useState } from 'react';
import { Search, X, ListPlus, ChevronDown } from 'lucide-react';
import {
    EMPTY_FILTER,
    isFilterActive,
    matchesMouse,
    toggleIn,
    type GridFilter,
} from '@/lib/gridFilter';
import { moveMouse, type MoveTarget } from '@/lib/gridMove';
import {
    resolvePath,
    isOnSelection,
    type Selection,
    type SelLevel,
    type SelPath,
} from '@/lib/gridSelection';
import { SIGNAL_LABEL, SIGNAL_ORDER, signalTagFillClass } from '@/lib/signal';
import { SEX_TINT, lifeStage, DOB_TINT } from '@/lib/colors';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { MoveMenu } from './MoveMenu.client';
import { MouseDetailDrawer, type SelectedMouse } from './MouseDetail.client';
import { NewTaskDialog } from './NewTaskDialog.client';

const SEXES: Sex[] = ['M', 'F', 'U'];

interface Moving {
    mouse: MouseCell;
    lineId: number;
    cageId: number;
    slotId: number;
}

const lineMice = (l: GridLine) =>
    l.cages.flatMap((c) => c.slots.flatMap((s) => s.mice));

// Scroll the clicked node into the body view (no-op if already visible).
function scrollToNode(level: SelLevel, id: number) {
    document
        .getElementById(`${level}-${id}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

export function ColonyGridView({ initial }: { initial: ColonyGrid }) {
    const [colony, setColony] = useState(initial);
    const [filter, setFilter] = useState<GridFilter>(EMPTY_FILTER);
    // The ONE current selection — a tree node, a genotype, or a mate group (see the
    // Selection union). All three highlight their targets AND feed the breadcrumb +
    // action bar identically, so genotype/mate behave exactly like a node click.
    // Null = nothing selected.
    const [selection, setSelection] = useState<Selection | null>(null);
    const [moving, setMoving] = useState<Moving | null>(null);
    const [detail, setDetail] = useState<SelectedMouse | null>(null);
    const [selected, setSelected] = useState<Record<number, string>>({});
    const [taskOpen, setTaskOpen] = useState(false);
    // Mice fed to the New-task dialog (batch mode) — set from either the checkbox
    // multi-select or the structural selection (line/cage/slot → all mice under it).
    const [taskMice, setTaskMice] = useState<string[]>([]);

    const on = isFilterActive(filter);
    const match = useMemo(
        () => (m: MouseCell) => matchesMouse(m, filter),
        [filter]
    );

    const selectedIds = Object.values(selected);

    const totalCages = colony.lines.reduce((n, l) => n + l.cages.length, 0);
    const totalSlots = colony.lines.reduce(
        (n, l) => n + l.cages.reduce((m, c) => m + c.slots.length, 0),
        0
    );
    const totalMice = colony.lines.reduce((n, l) => n + lineMice(l).length, 0);

    // Resolve the selection to full coords once; every rail/row compares its own ids.
    const path = useMemo(
        () => resolvePath(colony, selection?.kind === 'node' ? selection : null),
        [colony, selection]
    );
    const hl = (elemLevel: number, ids: SelPath) =>
        selection?.kind === 'node' &&
        isOnSelection(path, selection.level, elemLevel, ids);

    const hlGenotype = selection?.kind === 'genotype' ? selection.value : null;
    const hlMate = selection?.kind === 'mate' ? selection.color : null;

    // Line/cage/slot ids that CONTAIN a mouse of the highlighted genotype.
    const genoSets = useMemo(() => {
        if (!hlGenotype) return null;
        const lines = new Set<number>();
        const cages = new Set<number>();
        const slots = new Set<number>();
        colony.lines.forEach((l) =>
            l.cages.forEach((c) =>
                c.slots.forEach((s) =>
                    s.mice.forEach((m) => {
                        if (m.genotype === hlGenotype) {
                            lines.add(l.lineId);
                            cages.add(c.cageId);
                            slots.add(s.slotId);
                        }
                    })
                )
            )
        );
        return { lines, cages, slots };
    }, [colony, hlGenotype]);
    const genoMouse = (g: string) => hlGenotype != null && g === hlGenotype;

    // Line/cage/slot ids that CONTAIN a mouse in the highlighted mate group (colour).
    const mateSets = useMemo(() => {
        if (!hlMate) return null;
        const lines = new Set<number>();
        const cages = new Set<number>();
        const slots = new Set<number>();
        colony.lines.forEach((l) =>
            l.cages.forEach((c) =>
                c.slots.forEach((s) =>
                    s.mice.forEach((m) => {
                        if (m.mates.some((mt) => mt.color === hlMate)) {
                            lines.add(l.lineId);
                            cages.add(c.cageId);
                            slots.add(s.slotId);
                        }
                    })
                )
            )
        );
        return { lines, cages, slots };
    }, [colony, hlMate]);
    const mateMouse = (m: MouseCell) =>
        hlMate != null && m.mates.some((mt) => mt.color === hlMate);

    // Global running index per mouse → zebra striping so each row reads distinctly.
    const rowIndex = useMemo(() => {
        const map = new Map<number, number>();
        let i = 0;
        colony.lines.forEach((l) =>
            l.cages.forEach((c) =>
                c.slots.forEach((s) =>
                    s.mice.forEach((m) => map.set(m.metaId, i++))
                )
            )
        );
        return map;
    }, [colony]);

    // Click a genotype cell → select that genotype (toggle off if already selected).
    // Same selection concept as a node click, so breadcrumb + action bar follow.
    function pickGenotype(g: string) {
        setSelection((prev) =>
            prev?.kind === 'genotype' && prev.value === g
                ? null
                : { kind: 'genotype', value: g }
        );
    }
    // Click a mate badge → select that mate group (toggle off if already selected).
    function pickMate(color: string) {
        setSelection((prev) =>
            prev?.kind === 'mate' && prev.color === color
                ? null
                : { kind: 'mate', color }
        );
    }

    // All mice under the current selection — node (line→all its mice, cage/slot→its
    // mice, mouse→itself), genotype (every mouse of it), or mate (every mouse in the
    // group). Feeds "create task for selection" the same way for all three kinds.
    const selectionMice = useMemo(() => {
        if (!selection) return [];
        const out: string[] = [];
        colony.lines.forEach((l) =>
            l.cages.forEach((c) =>
                c.slots.forEach((s) =>
                    s.mice.forEach((m) => {
                        const inSel =
                            selection.kind === 'node'
                                ? isOnSelection(path, selection.level, 4, {
                                      lineId: l.lineId,
                                      cageId: c.cageId,
                                      slotId: s.slotId,
                                      mouseId: m.metaId,
                                  })
                                : selection.kind === 'genotype'
                                  ? m.genotype === selection.value
                                  : m.mates.some(
                                        (mt) => mt.color === selection.color
                                    );
                        if (inSel) out.push(m.renderedId);
                    })
                )
            )
        );
        return out;
    }, [colony, selection, path]);

    // Breadcrumb — the selection rendered as a path/label. Node → line›cage›slot›
    // mouse (descends to whatever level was clicked); genotype → the genotype;
    // mate → the partner names in the group (no human name exists for the colour).
    const selLine = colony.lines.find((l) => l.lineId === path.lineId);
    const selCage = selLine?.cages.find((c) => c.cageId === path.cageId);
    const selSlot = selCage?.slots.find((s) => s.slotId === path.slotId);
    const selMouse = selSlot?.mice.find((m) => m.metaId === path.mouseId);
    let crumbs: string[];
    if (selection?.kind === 'genotype') {
        crumbs = [`genotype: ${selection.value}`];
    } else if (selection?.kind === 'mate') {
        const names = new Set<string>();
        colony.lines.forEach((l) =>
            l.cages.forEach((c) =>
                c.slots.forEach((s) =>
                    s.mice.forEach((m) =>
                        m.mates.forEach((mt) => {
                            if (mt.color === selection.color) {
                                names.add(m.renderedId);
                                names.add(mt.partnerId);
                            }
                        })
                    )
                )
            )
        );
        crumbs = [`mate: ${[...names].slice(0, 4).join(' × ')}`];
    } else {
        crumbs = [
            selLine ? `line: ${selLine.lineName}` : undefined,
            selCage ? `cage: ${selCage.cageNumber}` : undefined,
            selSlot ? `slot ${selSlot.label}` : undefined,
            selMouse ? `mouse: ${selMouse.renderedId}` : undefined,
        ].filter((s): s is string => !!s);
    }

    // Jump-menu item lists (header dropdowns). Search-friendly for scale.
    const lineItems = colony.lines.map((l) => ({
        id: l.lineId,
        label: l.lineName,
        hint: `${lineMice(l).length} mice`,
    }));
    const cageItems = colony.lines.flatMap((l) =>
        l.cages.map((c) => ({
            id: c.cageId,
            label: `cage ${c.cageNumber}`,
            hint: l.lineName,
        }))
    );
    const slotItems = colony.lines.flatMap((l) =>
        l.cages.flatMap((c) =>
            c.slots.map((s) => ({
                id: s.slotId,
                label: `slot ${s.label}`,
                hint: `cage ${c.cageNumber}`,
            }))
        )
    );
    const mouseItems = colony.lines.flatMap((l) =>
        l.cages.flatMap((c) =>
            c.slots.flatMap((s) =>
                s.mice.map((m) => ({
                    id: m.metaId,
                    label: m.renderedId,
                    hint: m.genotype,
                }))
            )
        )
    );

    // Click a node → toggle its selection (click again clears) + scroll to it.
    function goTo(node: { level: SelLevel; id: number }) {
        setSelection((prev) =>
            prev?.kind === 'node' &&
            prev.level === node.level &&
            prev.id === node.id
                ? null
                : { kind: 'node', level: node.level, id: node.id }
        );
        scrollToNode(node.level, node.id);
    }
    function jump(level: SelLevel, id: number) {
        setSelection({ kind: 'node', level, id });
        scrollToNode(level, id);
    }
    function toggleSelect(m: MouseCell) {
        setSelected((prev) => {
            const next = { ...prev };
            if (next[m.metaId]) delete next[m.metaId];
            else next[m.metaId] = m.renderedId;
            return next;
        });
    }
    function applyMove(target: MoveTarget) {
        if (!moving) return;
        setColony((c) => moveMouse(c, moving.mouse.metaId, target));
        setMoving(null);
    }

    return (
        <div className="flex min-h-0 flex-1 flex-col gap-2">
            {/* ── Unified body: line | cage | slot | mice, all as nested columns ── */}
            <Card className="flex min-h-0 flex-1 flex-col py-0">
                {/* ONE consolidated sticky toolbar: breadcrumb + filter + jump + actions
                    (folded from three stacked rows so the body fills the viewport) */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b bg-muted/50 px-3 py-2">
                    {crumbs.length > 0 ? <Breadcrumb items={crumbs} /> : null}
                    <FilterBar
                        filter={filter}
                        active={on}
                        onChange={setFilter}
                    />
                    <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                        jump
                    </span>
                    <JumpMenu
                        label="Lines"
                        count={colony.lines.length}
                        items={lineItems}
                        onPick={(id) => jump('line', id)}
                    />
                    <JumpMenu
                        label="Cages"
                        count={totalCages}
                        items={cageItems}
                        onPick={(id) => jump('cage', id)}
                    />
                    <JumpMenu
                        label="Slots"
                        count={totalSlots}
                        items={slotItems}
                        onPick={(id) => jump('slot', id)}
                    />
                    <JumpMenu
                        label="Mice"
                        count={totalMice}
                        items={mouseItems}
                        onPick={(id) => jump('mouse', id)}
                    />
                    {selection ? (
                        <div className="ml-auto flex items-center gap-2">
                            {selectionMice.length > 0 ? (
                                <Button
                                    size="xs"
                                    onClick={() => {
                                        setTaskMice(selectionMice);
                                        setTaskOpen(true);
                                    }}
                                >
                                    <ListPlus className="size-3" /> Create task
                                    · {selectionMice.length} mice
                                </Button>
                            ) : null}
                            <Button
                                variant="ghost"
                                size="xs"
                                onClick={() => setSelection(null)}
                            >
                                <X className="size-3" /> clear selection
                            </Button>
                        </div>
                    ) : null}
                </div>
                {/* one scroll container for BOTH axes; the column header sticks on
                    Y-scroll and moves with the body on X-scroll (kept in flow). */}
                <div className="thin-scroll min-h-0 flex-1 overflow-auto">
                    <div className="min-w-[78rem]">
                        <ColumnHeader />
                        {colony.lines.map((l, i) => (
                            <div
                                key={l.lineId}
                                id={`line-${l.lineId}`}
                                className="flex border-b border-border last:border-b-0"
                            >
                                <LineLabel
                                    line={l}
                                    index={i + 1}
                                    highlighted={
                                        hl(1, { lineId: l.lineId }) ||
                                        (genoSets?.lines.has(l.lineId) ??
                                            false) ||
                                        (mateSets?.lines.has(l.lineId) ?? false)
                                    }
                                    onClick={() =>
                                        goTo({ level: 'line', id: l.lineId })
                                    }
                                />
                                <div className="min-w-0 flex-1">
                                    {l.cages.map((c) => (
                                        <div
                                            key={c.cageId}
                                            id={`cage-${c.cageId}`}
                                            className="flex border-t border-border/60 first:border-t-0"
                                        >
                                            <CageLabel
                                                number={c.cageNumber}
                                                highlighted={
                                                    hl(2, {
                                                        lineId: l.lineId,
                                                        cageId: c.cageId,
                                                    }) ||
                                                    (genoSets?.cages.has(
                                                        c.cageId
                                                    ) ??
                                                        false) ||
                                                    (mateSets?.cages.has(
                                                        c.cageId
                                                    ) ??
                                                        false)
                                                }
                                                onClick={() =>
                                                    goTo({
                                                        level: 'cage',
                                                        id: c.cageId,
                                                    })
                                                }
                                            />
                                            <div className="min-w-0 flex-1">
                                                {c.slots.map((s) => (
                                                    <div
                                                        key={s.slotId}
                                                        id={`slot-${s.slotId}`}
                                                        className="flex border-t border-border/40 first:border-t-0"
                                                    >
                                                        <SlotLabel
                                                            label={s.label}
                                                            adults={countSlotAdults(
                                                                s.mice
                                                            )}
                                                            cap={SLOT_ADULT_CAP}
                                                            over={
                                                                countSlotAdults(
                                                                    s.mice
                                                                ) >
                                                                SLOT_ADULT_CAP
                                                            }
                                                            highlighted={
                                                                hl(3, {
                                                                    lineId: l.lineId,
                                                                    cageId: c.cageId,
                                                                    slotId: s.slotId,
                                                                }) ||
                                                                (genoSets?.slots.has(
                                                                    s.slotId
                                                                ) ??
                                                                    false) ||
                                                                (mateSets?.slots.has(
                                                                    s.slotId
                                                                ) ??
                                                                    false)
                                                            }
                                                            onClick={() =>
                                                                goTo({
                                                                    level: 'slot',
                                                                    id: s.slotId,
                                                                })
                                                            }
                                                        />
                                                        <div className="min-w-0 flex-1">
                                                            {s.mice.map((m) => (
                                                                <MouseRow
                                                                    key={
                                                                        m.metaId
                                                                    }
                                                                    id={`mouse-${m.metaId}`}
                                                                    mouse={m}
                                                                    zebra={
                                                                        (rowIndex.get(
                                                                            m.metaId
                                                                        ) ??
                                                                            0) %
                                                                            2 ===
                                                                        1
                                                                    }
                                                                    highlighted={
                                                                        hl(4, {
                                                                            lineId: l.lineId,
                                                                            cageId: c.cageId,
                                                                            slotId: s.slotId,
                                                                            mouseId:
                                                                                m.metaId,
                                                                        }) ||
                                                                        genoMouse(
                                                                            m.genotype
                                                                        ) ||
                                                                        mateMouse(
                                                                            m
                                                                        )
                                                                    }
                                                                    filterOn={
                                                                        on
                                                                    }
                                                                    isMatch={match(
                                                                        m
                                                                    )}
                                                                    checked={
                                                                        !!selected[
                                                                            m
                                                                                .metaId
                                                                        ]
                                                                    }
                                                                    onToggle={() =>
                                                                        toggleSelect(
                                                                            m
                                                                        )
                                                                    }
                                                                    onSelect={() =>
                                                                        goTo({
                                                                            level: 'mouse',
                                                                            id: m.metaId,
                                                                        })
                                                                    }
                                                                    onJumpMouse={(
                                                                        mid
                                                                    ) =>
                                                                        jump(
                                                                            'mouse',
                                                                            mid
                                                                        )
                                                                    }
                                                                    onOpen={() =>
                                                                        setDetail(
                                                                            {
                                                                                mouse: m,
                                                                                lineName:
                                                                                    l.lineName,
                                                                                cageNumber:
                                                                                    c.cageNumber,
                                                                                slotLabel:
                                                                                    s.label,
                                                                            }
                                                                        )
                                                                    }
                                                                    onMove={() =>
                                                                        setMoving(
                                                                            {
                                                                                mouse: m,
                                                                                lineId: l.lineId,
                                                                                cageId: c.cageId,
                                                                                slotId: s.slotId,
                                                                            }
                                                                        )
                                                                    }
                                                                    onGenotype={() =>
                                                                        pickGenotype(
                                                                            m.genotype
                                                                        )
                                                                    }
                                                                    onMate={
                                                                        pickMate
                                                                    }
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </Card>

            {/* selection action bar */}
            {selectedIds.length > 0 ? (
                <div className="fixed bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-none border-2 border-primary bg-card px-4 py-2 shadow-lg">
                    <span className="text-sm font-medium">
                        {selectedIds.length} selected
                    </span>
                    <Button
                        size="sm"
                        onClick={() => {
                            setTaskMice(selectedIds);
                            setTaskOpen(true);
                        }}
                    >
                        <ListPlus className="size-3.5" /> Create task
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelected({})}
                    >
                        Clear
                    </Button>
                </div>
            ) : null}

            {moving ? (
                <MoveMenu
                    colony={colony}
                    mouse={moving.mouse}
                    currentLineId={moving.lineId}
                    currentCageId={moving.cageId}
                    currentSlotId={moving.slotId}
                    onMove={applyMove}
                    onClose={() => setMoving(null)}
                />
            ) : null}

            {taskOpen ? (
                <NewTaskDialog
                    open
                    presetMice={taskMice}
                    onClose={() => {
                        setTaskOpen(false);
                        setTaskMice([]);
                        setSelected({});
                    }}
                />
            ) : null}

            <MouseDetailDrawer
                selected={detail}
                onClose={() => setDetail(null)}
            />
        </div>
    );
}

/* ---------- jump menu (lightweight search popover) ---------- */

interface JumpItem {
    id: number;
    label: string;
    hint?: string;
}

function JumpMenu({
    label,
    count,
    items,
    onPick,
}: {
    label: string;
    count: number;
    items: JumpItem[];
    onPick: (id: number) => void;
}) {
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState('');
    const query = q.trim().toLowerCase();
    const filtered = query
        ? items.filter((it) =>
              `${it.label} ${it.hint ?? ''}`.toLowerCase().includes(query)
          )
        : items;
    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="flex items-center gap-1 rounded-none border border-border bg-background px-2 py-1 text-[11px] font-medium transition-colors hover:bg-accent"
            >
                {label}
                <span className="text-muted-foreground">{count}</span>
                <ChevronDown className="size-3 text-muted-foreground" />
            </button>
            {open ? (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => {
                            setOpen(false);
                            setQ('');
                        }}
                    />
                    <div className="absolute left-0 z-50 mt-1 w-60 border border-border bg-card shadow-md">
                        <div className="p-1.5">
                            <Input
                                autoFocus
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                placeholder={`Search ${label.toLowerCase()}…`}
                                className="h-7 text-[12px]"
                            />
                        </div>
                        <div className="thin-scroll max-h-64 overflow-y-auto">
                            {filtered.length > 0 ? (
                                filtered.map((it) => (
                                    <button
                                        key={it.id}
                                        type="button"
                                        onClick={() => {
                                            onPick(it.id);
                                            setOpen(false);
                                            setQ('');
                                        }}
                                        className="flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left transition-colors hover:bg-accent"
                                    >
                                        <span className="truncate font-mono text-[12px]">
                                            {it.label}
                                        </span>
                                        {it.hint ? (
                                            <span className="shrink-0 truncate font-mono text-[10px] text-muted-foreground">
                                                {it.hint}
                                            </span>
                                        ) : null}
                                    </button>
                                ))
                            ) : (
                                <div className="px-2.5 py-2 text-[11px] text-muted-foreground">
                                    No match
                                </div>
                            )}
                        </div>
                    </div>
                </>
            ) : null}
        </div>
    );
}

/* ---------- filter bar ---------- */

function FilterBar({
    filter,
    active,
    onChange,
}: {
    filter: GridFilter;
    active: boolean;
    onChange: (f: GridFilter) => void;
}) {
    return (
        <div className="flex min-w-64 flex-1 flex-wrap items-center gap-x-3 gap-y-2">
            {/* search field: active sex/signal filters show as in-field badges,
                a clear-all × sits at the right end whenever any filter is on */}
            <div className="flex h-8 min-w-52 flex-1 items-center gap-1 rounded-md border border-input bg-background px-2">
                <Search className="size-3.5 shrink-0 text-muted-foreground" />
                {filter.sexes.map((s) => (
                    <FieldBadge
                        key={`sex-${s}`}
                        onRemove={() =>
                            onChange({
                                ...filter,
                                sexes: toggleIn(filter.sexes, s),
                            })
                        }
                    >
                        {s}
                    </FieldBadge>
                ))}
                {filter.signals.map((s) => (
                    <FieldBadge
                        key={`sig-${s}`}
                        signal={s}
                        onRemove={() =>
                            onChange({
                                ...filter,
                                signals: toggleIn(filter.signals, s),
                            })
                        }
                    >
                        {SIGNAL_LABEL[s]}
                    </FieldBadge>
                ))}
                <input
                    value={filter.query}
                    onChange={(e) =>
                        onChange({ ...filter, query: e.target.value })
                    }
                    placeholder={active ? 'filter…' : 'Search id or genotype…'}
                    className="h-full min-w-16 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
                {active ? (
                    <button
                        type="button"
                        onClick={() => onChange(EMPTY_FILTER)}
                        aria-label="clear filters"
                        className="shrink-0 rounded-sm p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                        <X className="size-3.5" />
                    </button>
                ) : null}
            </div>

            <FilterGroup label="sex">
                {SEXES.map((s) => (
                    <Chip
                        key={s}
                        on={filter.sexes.includes(s)}
                        onClick={() =>
                            onChange({
                                ...filter,
                                sexes: toggleIn(filter.sexes, s),
                            })
                        }
                    >
                        {s}
                    </Chip>
                ))}
            </FilterGroup>

            <FilterGroup label="signal">
                {SIGNAL_ORDER.map((s) => (
                    <Chip
                        key={s}
                        on={filter.signals.includes(s)}
                        signal={s}
                        onClick={() =>
                            onChange({
                                ...filter,
                                signals: toggleIn(filter.signals, s),
                            })
                        }
                    >
                        {SIGNAL_LABEL[s]}
                    </Chip>
                ))}
            </FilterGroup>
        </div>
    );
}

// Removable filter token shown INSIDE the search field.
function FieldBadge({
    signal,
    onRemove,
    children,
}: {
    signal?: SignalColor;
    onRemove: () => void;
    children: React.ReactNode;
}) {
    const tint =
        signal === 'instruction'
            ? 'border-signal-instruction text-signal-instruction'
            : signal === 'plan'
              ? 'border-signal-plan text-signal-plan'
              : 'border-border text-foreground';
    return (
        <span
            className={cn(
                'inline-flex shrink-0 items-center gap-0.5 rounded-none border bg-background px-1.5 py-0.5 font-mono text-[10px] font-medium',
                tint
            )}
        >
            {children}
            <button
                type="button"
                onClick={onRemove}
                aria-label="remove filter"
                className="text-muted-foreground hover:text-foreground"
            >
                <X className="size-2.5" />
            </button>
        </span>
    );
}

function FilterGroup({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground">{label}</span>
            {children}
        </div>
    );
}

function Chip({
    on,
    signal,
    onClick,
    children,
}: {
    on: boolean;
    signal?: SignalColor;
    onClick: () => void;
    children: React.ReactNode;
}) {
    const tint =
        signal === 'instruction'
            ? 'border-signal-instruction text-signal-instruction'
            : signal === 'plan'
              ? 'border-signal-plan text-signal-plan'
              : '';
    return (
        <button
            type="button"
            aria-pressed={on}
            onClick={onClick}
            className={cn(
                'rounded-none border px-2.5 py-0.5 text-[11px] font-medium transition-colors',
                on
                    ? 'border-primary bg-primary text-primary-foreground'
                    : cn(
                          'border-border bg-background text-foreground hover:bg-accent',
                          tint
                      )
            )}
        >
            {children}
        </button>
    );
}

/* ---------- breadcrumb ---------- */

// Reflects the current selection path (line › cage › slot › mouse), derived from
// the resolved selection. Empty when nothing is selected (colony name dropped).
function Breadcrumb({ items }: { items: string[] }) {
    return (
        <nav
            aria-label="Breadcrumb"
            className="flex min-h-[1.25rem] flex-wrap items-center gap-1.5 font-mono text-xs"
        >
            {items.map((label, i) => (
                <span
                    key={i}
                    className="flex items-center gap-1.5"
                >
                    {i > 0 ? (
                        <span className="text-muted-foreground/50">›</span>
                    ) : null}
                    <span className="font-medium text-foreground">{label}</span>
                </span>
            ))}
        </nav>
    );
}

// Signal colour key — meaning of the task-badge colours (Excel semantics).
// Column-label row under the body header — aligns to the same grid as the mouse
// rows (rail spacers offset past line/cage/slot so the labels sit over their cells).
function ColumnHeader() {
    const cell = 'truncate border-r border-border/40 px-2 py-1';
    return (
        <div className="sticky top-0 z-20 flex border-b border-border bg-muted text-[9px] font-semibold tracking-wide text-muted-foreground/70 uppercase">
            <div
                className={cn(
                    RAIL_W.line,
                    'flex shrink-0 items-center border-r border-border/40 px-1 py-1'
                )}
            >
                line
            </div>
            <div
                className={cn(
                    RAIL_W.cage,
                    'flex shrink-0 items-center border-r border-border/40 px-2 py-1'
                )}
            >
                cage
            </div>
            <div
                className={cn(
                    RAIL_W.slot,
                    'flex shrink-0 items-center justify-center border-r border-border/40 px-1 py-1'
                )}
            >
                slot
            </div>
            {/* SEL — full-height cell spanning both header sub-rows (matches body) */}
            <div
                className={cn(
                    SEL_W,
                    'flex shrink-0 items-center justify-center border-r border-border/40 px-1 py-1'
                )}
            >
                sel
            </div>
            <div className="flex flex-1 flex-col">
                {/* main column labels (id → actions; actions track left unlabeled) */}
                <div className={cn('grid', MOUSE_COLS)}>
                    <span className={cell}>id / sex</span>
                    <span className={cell}>genotype</span>
                    <span className={cell}>DOB / age</span>
                    <span className={cell}>mate</span>
                    <div className="grid grid-cols-2 border-r border-border/40">
                        <span className="truncate px-1 py-1">parent ♂/♀</span>
                        <span className="truncate border-l border-border/40 px-1 py-1">
                            P-GENOTYPE
                        </span>
                    </div>
                    <span className={cell}>PLUG</span>
                    <span className={cell}>~DELIV</span>
                    <span className={cell}>TISSUE</span>
                    <span className={cell}>GENOTYPING</span>
                </div>
                {/* sub-row labels: tasks | memos */}
                <div className="flex border-t border-border/40">
                    <div
                        className={cn(
                            TASK_W,
                            'shrink-0 border-r border-border/40 px-2 py-1'
                        )}
                    >
                        tasks
                    </div>
                    <div className="flex-1 px-2 py-1">memos</div>
                </div>
            </div>
        </div>
    );
}

/* ---------- left-rail labels (COLUMN-based hierarchy) ---------- */

// The three hierarchy levels are left-rail columns; clicking one selects it
// (highlight path + subtree). Highlight = tint (never opacity — that is the filter).
const RAIL_BASE =
    'flex shrink-0 flex-col justify-center gap-0.5 border-r border-border/40 text-left transition-colors';

// Whole-element highlight: a translucent primary overlay + full ring, laid OVER
// the element so it reads uniformly across every cell regardless of the per-cell
// backgrounds (user prefers this "dimmed" wash over a ring-only outline).
// pointer-events-none keeps the checkbox / id / Move click-through intact.
function HlOverlay() {
    return (
        <span
            aria-hidden
            className="pointer-events-none absolute inset-0 z-10 bg-primary/20 ring-2 ring-primary ring-inset"
        />
    );
}

// Line rail: narrow VERTICAL column. Background = the line's nominal genotype
// colour (so the whole line block reads as its genotype); left accent = line
// identity colour. Name (the genotype label) is written vertically to stay thin.
function LineLabel({
    line,
    index,
    highlighted,
    onClick,
}: {
    line: GridLine;
    index: number;
    highlighted: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={`${index}. ${line.lineName}`}
            // Genotype-only rail: the line's nominal genotype colour is the SOLE
            // rail hue (headline "this line = genotype X", a touch stronger — 33 —
            // than the per-mouse 22 cells so the whole-line summary reads first).
            // The separate lineColor identity accent was dropped (line ≈ genotype
            // 1:1). WT lines (null genotype) stay neutral — the index badge + name
            // still identify them.
            style={{
                backgroundColor: line.nominalGenotypeColor
                    ? `${line.nominalGenotypeColor}33`
                    : undefined,
            }}
            className={cn(
                'relative flex w-8 shrink-0 flex-col items-center justify-center gap-1 overflow-hidden border-r border-border/40 py-2 transition hover:brightness-95',
                !line.nominalGenotypeColor && 'bg-muted/40'
            )}
        >
            {highlighted ? <HlOverlay /> : null}
            <span className="rounded-sm bg-foreground/10 px-1 font-mono text-[10px] font-bold text-foreground">
                {index}
            </span>
            <span className="font-mono text-[11px] font-semibold whitespace-nowrap text-foreground [writing-mode:vertical-rl]">
                {line.lineName}
            </span>
        </button>
    );
}

function CageLabel({
    number,
    highlighted,
    onClick,
}: {
    number: string;
    highlighted: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                RAIL_BASE,
                'relative w-16 bg-muted/40 px-2 py-2 hover:bg-accent'
            )}
        >
            {highlighted ? <HlOverlay /> : null}
            <span className="font-mono text-[13px] font-bold text-foreground">
                {number}
            </span>
        </button>
    );
}

function SlotLabel({
    label,
    highlighted,
    over,
    adults,
    cap,
    onClick,
}: {
    label: string;
    highlighted: boolean;
    // Overcrowding: live adults exceed the slot's adult capacity. A STATE colour
    // (red = action required: split the slot), fill on the rail itself so it reads
    // at a glance; the count badge makes it actionable. Kept distinct from the
    // amber "old" DOB tint and orthogonal to the selection overlay (which layers on
    // top via HlOverlay when the slot is also selected).
    over: boolean;
    adults: number;
    cap: number;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                RAIL_BASE,
                'relative w-9 items-center px-1 py-1.5',
                over
                    ? 'bg-red-100 hover:bg-red-200'
                    : 'bg-muted/40 hover:bg-accent'
            )}
            title={
                over
                    ? `overcrowded — ${adults} adults > ${cap} capacity (split slot)`
                    : undefined
            }
        >
            {highlighted ? <HlOverlay /> : null}
            <span
                className={cn(
                    'font-mono text-[11px] font-semibold',
                    over ? 'text-red-700' : 'text-muted-foreground'
                )}
            >
                {label}
            </span>
            {over ? (
                <span className="rounded-sm bg-red-600 px-1 text-[8px] leading-tight font-bold text-white">
                    {adults}/{cap}
                </span>
            ) : null}
        </button>
    );
}

// One parent row in the parents column, split HORIZONTALLY into two bordered
// sub-cells: [id | genotype]. id keeps the sex tint (♂ blue / ♀ pink) and is
// clickable → jump to that parent's row when it is shown here (metaId set).
function ParentRow({
    tint,
    parent,
    onJump,
    divider,
}: {
    tint: string;
    parent?: ParentCell | null;
    onJump: (metaId: number) => void;
    divider?: boolean;
}) {
    const base = cn(
        'grid flex-1 grid-cols-2',
        divider && 'border-t border-border/40'
    );
    if (!parent) {
        return (
            <div className={base}>
                <span className="flex items-center truncate px-1 font-mono text-[10px] text-muted-foreground/40">
                    —
                </span>
                <span className="border-l border-border/40 px-1" />
            </div>
        );
    }
    const clickable = parent.metaId != null;
    return (
        <div className={base}>
            <button
                type="button"
                disabled={!clickable}
                onClick={(e) => {
                    e.stopPropagation();
                    if (parent.metaId != null) onJump(parent.metaId);
                }}
                title={
                    clickable
                        ? `go to ${parent.renderedId}`
                        : `${parent.renderedId} (not shown here)`
                }
                className={cn(
                    'flex items-center truncate px-1 text-left font-mono text-[10px] font-semibold',
                    tint,
                    clickable
                        ? 'cursor-pointer hover:underline'
                        : 'cursor-default opacity-60'
                )}
            >
                {parent.renderedId}
            </button>
            <span
                title={parent.genotype ?? undefined}
                style={
                    parent.genotypeColor
                        ? { backgroundColor: `${parent.genotypeColor}22` }
                        : undefined
                }
                className="flex items-center truncate border-l border-border/40 px-1 font-mono text-[9px]"
            >
                {parent.genotype ?? '—'}
            </span>
        </div>
    );
}

/* ---------- mouse row (Excel-style colour cells) ---------- */

// Fixed columns so the professor scans a channel down its column: tasks · check ·
// id(sex) · genotype · DOB(age) · mate · actions. Selection = left-accent + tint;
// filter = opacity — the two axes stay on separate CSS channels.
const CELL = 'flex items-center border-r border-border/40 px-2 py-1.5';

// The SELECT (checkbox) cell spans the WHOLE mouse height (main row + tasks/memo
// sub-row), sitting to the LEFT of the 2-row content block. So the main-row grid
// below has NO sel column — it starts at id(sex).
const SEL_W = 'w-8';
// id(sex) · genotype(wide) · DOB · mate · parents · PLUG · ~DELIV · TISSUE · GENOTYPING · actions
const MOUSE_COLS =
    'grid-cols-[6rem_minmax(10rem,1fr)_4.75rem_5.5rem_11rem_4.75rem_4.75rem_4.75rem_4.75rem_5rem]';

// Dates render YYYY/MM/DD (from ISO); null → em dash.
const fmtDate = (d: string | null | undefined) =>
    d ? d.replaceAll('-', '/') : '—';
// Tasks sub-cell width = the id(sex) column (6rem) so tasks sit under ID/SEX and
// the memo starts under GENOTYPE.
const TASK_W = 'w-24';
// Left-rail widths (line · cage · slot) the header must offset past to align.
const RAIL_W = { line: 'w-8', cage: 'w-16', slot: 'w-9' } as const;

// Slot adult capacity — a live mouse past weaning (lifeStage !== 'baby') counts;
// pups don't. Over this → overcrowding warning on the slot rail. User-specified
// (5 per slot); professor-confirm later (plan Q33/Q34: value + per-slot vs cage).
const SLOT_ADULT_CAP = 5;
const countSlotAdults = (mice: MouseCell[]): number =>
    mice.filter(
        (m) =>
            m.isAlive !== false &&
            m.signal !== 'dead' &&
            lifeStage(m.dob, m.sex) !== 'baby'
    ).length;

function MouseRow({
    id,
    mouse,
    zebra,
    highlighted,
    filterOn,
    isMatch,
    checked,
    onToggle,
    onSelect,
    onOpen,
    onMove,
    onJumpMouse,
    onGenotype,
    onMate,
}: {
    id: string;
    mouse: MouseCell;
    zebra: boolean;
    highlighted: boolean;
    filterOn: boolean;
    isMatch: boolean;
    checked: boolean;
    onToggle: () => void;
    onSelect: () => void;
    onOpen: () => void;
    onMove: () => void;
    onJumpMouse: (metaId: number) => void;
    onGenotype: () => void;
    onMate: (color: string) => void;
}) {
    const dimmed = filterOn && !isMatch;
    const stage = lifeStage(mouse.dob, mouse.sex);
    // Dead → the WHOLE row goes dark; identity colours (sex/genotype/age) are moot
    // for a sac'd mouse, so their cell tints are suppressed and the dark row + id
    // strikethrough carry the state (mirrors the sheet's gray-fill dead cell).
    const dead = mouse.signal === 'dead';
    // Active tasks collapsed by SIGNAL (colour) → one badge per signal, count when
    // repeated (two plan tasks = one blue badge showing "2"); tooltip lists types.
    const bySignal = mouse.activeTasks.reduce((m, t) => {
        const g = m.get(t.signal);
        if (g) {
            g.count += 1;
            g.types.push(t.type);
        } else {
            m.set(t.signal, { signal: t.signal, count: 1, types: [t.type] });
        }
        return m;
    }, new Map<SignalColor, { signal: SignalColor; count: number; types: string[] }>());
    const taskGroups = SIGNAL_ORDER.filter((s) => bySignal.has(s)).map((s) =>
        bySignal.get(s)!
    );
    const hasSubRow = taskGroups.length > 0 || mouse.attention;
    return (
        <div
            id={id}
            className={cn(
                // thin divider between mice (slot/cage/line blocks carry the heavier
                // structural borders); zebra striping does the row separation
                'group relative border-b border-border/40 transition-opacity last:border-b-0',
                // zebra base bg (alternating) so each mouse row reads distinctly
                !dead && (zebra ? 'bg-muted/40' : 'bg-background'),
                dead && 'bg-neutral-700 text-neutral-300',
                dimmed ? 'opacity-25' : 'opacity-100'
            )}
        >
            {highlighted ? <HlOverlay /> : null}
            {/* click the row (empty area) to select this mouse (highlight path) */}
            <div
                role="button"
                tabIndex={-1}
                onClick={onSelect}
                className="flex cursor-pointer"
            >
                {/* select cell — spans the whole mouse (main row + sub-row) */}
                <label
                    className={cn(
                        SEL_W,
                        'flex shrink-0 items-center justify-center border-r border-border/40'
                    )}
                    onClick={(e) => e.stopPropagation()}
                >
                    <input
                        type="checkbox"
                        checked={checked}
                        onChange={onToggle}
                        className="size-3.5 shrink-0 cursor-pointer accent-primary"
                        aria-label={`select ${mouse.renderedId}`}
                    />
                </label>

                {/* right block: main row (id…actions) then tasks|memo sub-row */}
                <div className="min-w-0 flex-1">
                    <div className={cn('grid items-stretch', MOUSE_COLS)}>
                        {/* id cell — sex background (M sky / F pink / U none); dead = dark row */}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onOpen();
                            }}
                            title={`sex: ${mouse.sex}`}
                            className={cn(
                                CELL,
                                !dead && SEX_TINT[mouse.sex],
                                'text-left hover:underline'
                            )}
                        >
                            <span
                                className={cn(
                                    'truncate font-mono text-[13px] font-semibold',
                                    dead && 'text-neutral-400 line-through'
                                )}
                            >
                                {mouse.renderedId}
                            </span>
                        </button>

                        {/* genotype cell — own genotype colour; click → highlight all mice
                    (and their line/cage) sharing this genotype */}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onGenotype();
                            }}
                            style={
                                !dead && mouse.genotypeColor
                                    ? {
                                          backgroundColor: `${mouse.genotypeColor}22`,
                                      }
                                    : undefined
                            }
                            title={`highlight genotype: ${mouse.genotype}`}
                            className={cn(
                                CELL,
                                'min-w-0 text-left hover:underline'
                            )}
                        >
                            <span className="truncate font-mono text-[11px]">
                                {mouse.genotype}
                            </span>
                        </button>

                        {/* DOB cell — life-stage tint: baby green / adult blank / old amber */}
                        <div
                            className={cn(
                                CELL,
                                'px-1.5 font-mono text-[10px]',
                                dead ? 'text-neutral-400' : DOB_TINT[stage]
                            )}
                            title={
                                stage === 'baby'
                                    ? 'baby (pre-weaning)'
                                    : stage === 'old'
                                      ? 'old (age threshold reached)'
                                      : 'DOB'
                            }
                        >
                            {fmtDate(mouse.dob)}
                        </div>

                        {/* mate cell — split top = current mate id(s), bottom = group badge(s) */}
                        <div className="flex flex-col justify-center border-r border-border/40">
                            {mouse.mates.length > 0 ? (
                                <>
                                    <div className="flex flex-1 flex-wrap items-center gap-1 px-1 py-0.5">
                                        {mouse.mates.map((mt, i) => {
                                            const clickable =
                                                mt.partnerMetaId != null;
                                            return (
                                                <button
                                                    key={i}
                                                    type="button"
                                                    disabled={!clickable}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (
                                                            mt.partnerMetaId !=
                                                            null
                                                        )
                                                            onJumpMouse(
                                                                mt.partnerMetaId
                                                            );
                                                    }}
                                                    title={
                                                        clickable
                                                            ? `go to ${mt.partnerId}`
                                                            : mt.partnerId
                                                    }
                                                    className={cn(
                                                        'truncate font-mono text-[10px] font-semibold',
                                                        clickable
                                                            ? 'cursor-pointer hover:underline'
                                                            : 'cursor-default opacity-60'
                                                    )}
                                                >
                                                    {mt.partnerId}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <div className="flex flex-1 flex-wrap items-center gap-1 border-t border-border/40 px-1 py-0.5">
                                        {mouse.mates.map((mt, i) => (
                                            <button
                                                key={i}
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onMate(mt.color);
                                                }}
                                                className="size-3 shrink-0 cursor-pointer rounded-sm border border-black/10 hover:ring-1 hover:ring-primary"
                                                style={{ background: mt.color }}
                                                title="highlight mate group"
                                                aria-label="highlight mate group"
                                            />
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <span className="flex items-center px-1 text-[11px] text-muted-foreground/40">
                                    —
                                </span>
                            )}
                        </div>

                        {/* parents cell — ♂ father (blue) / ♀ mother (pink), each split
                    into [id | genotype]; click id → jump to that parent's row */}
                        <div className="flex flex-col border-r border-border/40">
                            <ParentRow
                                tint="bg-sky-100"
                                parent={mouse.parents?.father}
                                onJump={onJumpMouse}
                            />
                            <ParentRow
                                tint="bg-pink-100"
                                parent={mouse.parents?.mother}
                                onJump={onJumpMouse}
                                divider
                            />
                        </div>

                        {/* breeding dates — PLUG · ~DELIV · TISSUE · GENOTYPING */}
                        <div
                            className={cn(
                                CELL,
                                'px-1.5 font-mono text-[10px] text-muted-foreground'
                            )}
                        >
                            {fmtDate(mouse.dates?.plug)}
                        </div>
                        <div
                            className={cn(
                                CELL,
                                'px-1.5 font-mono text-[10px] text-muted-foreground'
                            )}
                        >
                            {fmtDate(mouse.dates?.deliv)}
                        </div>
                        <div
                            className={cn(
                                CELL,
                                'px-1.5 font-mono text-[10px] text-muted-foreground'
                            )}
                        >
                            {fmtDate(mouse.dates?.tissue)}
                        </div>
                        <div
                            className={cn(
                                CELL,
                                'px-1.5 font-mono text-[10px] text-muted-foreground'
                            )}
                        >
                            {fmtDate(mouse.dates?.genotyping)}
                        </div>

                        {/* actions */}
                        <div className="flex items-center px-2">
                            <Button
                                variant="outline"
                                size="xs"
                                className="text-muted-foreground opacity-70 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onMove();
                                }}
                            >
                                Move…
                            </Button>
                        </div>
                    </div>

                    {/* sub-row: [ tasks (=id width) | memo ] */}
                    {hasSubRow ? (
                        <div className="flex items-stretch border-t border-border/40 text-[11px]">
                            <div
                                className={cn(
                                    TASK_W,
                                    'flex shrink-0 flex-wrap items-center gap-1 border-r border-border/40 px-2 py-0.5'
                                )}
                            >
                                {taskGroups.map((g) => {
                                    const lightFill =
                                        g.signal === 'flag' ||
                                        g.signal === 'dead';
                                    return (
                                        <span
                                            key={g.signal}
                                            title={g.types.join(', ')}
                                            aria-label={`${g.count} ${g.signal} task(s): ${g.types.join(', ')}`}
                                            className={cn(
                                                'flex size-3.5 items-center justify-center rounded-sm border text-[8px] leading-none font-bold',
                                                signalTagFillClass(g.signal),
                                                lightFill
                                                    ? 'text-neutral-900'
                                                    : 'text-white'
                                            )}
                                        >
                                            {g.count > 1 ? g.count : ''}
                                        </span>
                                    );
                                })}
                            </div>
                            <div
                                className={cn(
                                    'flex flex-1 items-center px-2 py-0.5',
                                    dead
                                        ? 'text-neutral-400'
                                        : 'text-muted-foreground'
                                )}
                            >
                                {mouse.attention}
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
