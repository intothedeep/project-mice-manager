'use client';

import type {
    GridCage,
    GridLine,
    GridSlot,
    MouseCell,
    MouseCaseTag,
    ParentCell,
    Sex,
    SignalColor,
} from '@repo/types';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, ListPlus, ChevronDown, Plus } from 'lucide-react';
import {
    EMPTY_FILTER,
    isFilterActive,
    matchesMouse,
    toggleIn,
    type GridFilter,
} from '@/lib/gridFilter';
import { type MoveTarget } from '@/lib/gridMove';
import {
    resolvePath,
    isOnSelection,
    type Selection,
    type SelLevel,
    type SelPath,
} from '@/lib/gridSelection';
import {
    SIGNAL_LABEL,
    SIGNAL_ORDER,
    signalTagFillClass,
    signalColorOf,
    dateColorOf,
} from '@/lib/signal';
import {
    buildDateCaseIndex,
    type DateColumn,
    type DateCaseHit,
} from '@/lib/dateSignal';
import { formatDate } from '@/lib/dueDates';
import { SEX_TINT, lifeStage, DOB_TINT } from '@/lib/colors';
import { useTasks, useTaskLog, addTask } from '@/lib/mockStore';
import {
    useColonyGrid,
    applyColonyMove,
    updateMouse,
} from '@/lib/mockColonyStore';
import { buildReclipIndex, composeMouseLabel } from '@/lib/mouseLabel';
import { mouseLabelOf } from '@/lib/mouseIdentity';
import { genotypeOf } from '@/lib/genotype';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useNavSlotNode } from './NavSlot.client';
import { MoveMenu } from './MoveMenu.client';
import { MouseDetailDrawer, type SelectedMouse } from './MouseDetail.client';
import {
    MouseCaseDrawer,
    type CaseDrawerTarget,
} from './MouseCaseDrawer.client';
import { NewTaskDialog } from './NewTaskDialog.client';
import { MouseCaseTypeMenu } from './MouseCaseTypeMenu.client';
import { AddMouseDialog } from './AddMouseDialog.client';
import { AddLineDialog } from './AddLineDialog.client';

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

// AddMouseTarget: carries optional prefill IDs for the dialog. Empty object = no prefill.
interface AddMouseTarget {
    lineId?: number;
    cageId?: number;
    slotId?: number;
}

export function ColonyGridView() {
    const colony = useColonyGrid();
    const [filter, setFilter] = useState<GridFilter>(EMPTY_FILTER);
    const navNode = useNavSlotNode();
    const [searchOpen, setSearchOpen] = useState(false);
    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault(); // WHY: Firefox binds Ctrl+K natively (address-bar focus).
                setSearchOpen(true);
            } else if (e.key === 'Escape') {
                setSearchOpen(false);
            }
        }
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);
    const [selection, setSelection] = useState<Selection | null>(null);
    const [moving, setMoving] = useState<Moving | null>(null);
    const [detail, setDetail] = useState<SelectedMouse | null>(null);
    const [selected, setSelected] = useState<Record<number, string>>({});
    const [taskOpen, setTaskOpen] = useState(false);
    const [taskMice, setTaskMice] = useState<
        { metaId: number; label: string }[]
    >([]);
    const [caseDrawer, setCaseDrawer] = useState<CaseDrawerTarget | null>(null);
    const [ctxMenu, setCtxMenu] = useState<{
        x: number;
        y: number;
        mouse: { metaId: number; mouseLabel: string };
    } | null>(null);
    // null = closed; {} = no prefill; {cageId,...} = prefilled
    const [addMouseTarget, setAddMouseTarget] = useState<AddMouseTarget | null>(
        null
    );
    const [addLineOpen, setAddLineOpen] = useState(false);

    const allCases = useTasks();
    const badgeIndex = useMemo(() => {
        const index = new Map<number, MouseCaseTag[]>();
        const push = (metaId: number, tag: MouseCaseTag) => {
            const existing = index.get(metaId);
            if (existing) existing.push(tag);
            else index.set(metaId, [tag]);
        };
        for (const c of allCases) {
            if (c.status !== 'todo' && c.status !== 'doing') continue;
            const tag: MouseCaseTag = {
                type: c.caseType,
                signal: signalColorOf(c.signal),
            };
            if (c.subjectKind === 'mouse' && c.subjectMouseId != null) {
                push(c.subjectMouseId, tag);
            } else if (c.subjectKind === 'mice' && c.mice) {
                for (const metaId of c.mice) push(metaId, tag);
            }
        }
        return index;
    }, [allCases]);

    const reclipIndex = useMemo(() => buildReclipIndex(allCases), [allCases]);

    const taskLog = useTaskLog();
    const dateIndex = useMemo(
        () => buildDateCaseIndex(allCases, taskLog),
        [allCases, taskLog]
    );
    const composed = (m: MouseCell) =>
        composeMouseLabel(mouseLabelOf(m), reclipIndex.get(m.metaId) ?? 0);

    // metaId -> MouseCell over the whole payload, so an in-grid ParentCell
    // (plan §5 Q46 option C) can resolve its OWN row and compose through the
    // same base+.N path as every other surface, instead of carrying a label
    // that can drift from live punch/reclip state.
    const mouseByMetaId = useMemo(() => {
        const index = new Map<number, MouseCell>();
        colony.lines.forEach((l) =>
            l.cages.forEach((c) =>
                c.slots.forEach((s) =>
                    s.mice.forEach((m) => index.set(m.metaId, m))
                )
            )
        );
        return index;
    }, [colony]);

    // null = the metaId has no row in this payload (not reachable today since
    // ColonyGrid is whole-colony — becomes reachable if the grid is ever
    // paginated/fetched per line). Callers render a placeholder, never throw.
    const resolveParentLabel = (metaId: number): string | null => {
        const mouse = mouseByMetaId.get(metaId);
        return mouse ? composed(mouse) : null;
    };

    // Same contract for the parent's GENOTYPE: an in-grid parent no longer
    // carries a copied string (9d did this for the label, step 9f for the
    // genotype) — it resolves its own MouseCell and composes from its gene rows.
    const resolveParentGenotype = (metaId: number): string | null => {
        const mouse = mouseByMetaId.get(metaId);
        return mouse ? genotypeOf(mouse) : null;
    };

    // And the TINT for that composed string, off the same MouseCell. It must
    // resolve with the genotype, not beside it: a stored copy survives a gene
    // edit that nulls the parent's own colour and then tints the sub-cell for a
    // genotype the mouse no longer has.
    const resolveParentGenotypeColor = (metaId: number): string | null => {
        const mouse = mouseByMetaId.get(metaId);
        return mouse ? mouse.genotypeColor : null;
    };

    const on = isFilterActive(filter);
    const match = useMemo(
        () => (m: MouseCell) => matchesMouse(m, filter),
        [filter]
    );

    const selectedIds = Object.keys(selected).map(Number);

    const totalCages = colony.lines.reduce((n, l) => n + l.cages.length, 0);
    const totalSlots = colony.lines.reduce(
        (n, l) => n + l.cages.reduce((m, c) => m + c.slots.length, 0),
        0
    );
    const totalMice = colony.lines.reduce((n, l) => n + lineMice(l).length, 0);

    const path = useMemo(
        () =>
            resolvePath(colony, selection?.kind === 'node' ? selection : null),
        [colony, selection]
    );
    const hl = (elemLevel: number, ids: SelPath) =>
        selection?.kind === 'node' &&
        isOnSelection(path, selection.level, elemLevel, ids);

    const hlGenotype = selection?.kind === 'genotype' ? selection.value : null;
    const hlMate = selection?.kind === 'mate' ? selection.color : null;

    const genoSets = useMemo(() => {
        if (!hlGenotype) return null;
        const lines = new Set<number>();
        const cages = new Set<number>();
        const slots = new Set<number>();
        colony.lines.forEach((l) =>
            l.cages.forEach((c) =>
                c.slots.forEach((s) =>
                    s.mice.forEach((m) => {
                        if (genotypeOf(m) === hlGenotype) {
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

    function pickGenotype(g: string) {
        setSelection((prev) =>
            prev?.kind === 'genotype' && prev.value === g
                ? null
                : { kind: 'genotype', value: g }
        );
    }
    function pickMate(color: string) {
        setSelection((prev) =>
            prev?.kind === 'mate' && prev.color === color
                ? null
                : { kind: 'mate', color }
        );
    }

    const selectionMice = useMemo(() => {
        if (!selection) return [];
        const out: { metaId: number; label: string }[] = [];
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
                                  ? genotypeOf(m) === selection.value
                                  : m.mates.some(
                                        (mt) => mt.color === selection.color
                                    );
                        if (inSel)
                            // WHY the BASE label (not composedLabel): addTask uses the BASE label; .N suffix is a read-time projection.
                            out.push({
                                metaId: m.metaId,
                                label: mouseLabelOf(m),
                            });
                    })
                )
            )
        );
        return out;
    }, [colony, selection, path]);

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
                                names.add(mouseLabelOf(m));
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
            selMouse
                ? `mouse: ${composeMouseLabel(mouseLabelOf(selMouse), reclipIndex.get(selMouse.metaId) ?? 0)}`
                : undefined,
        ].filter((s): s is string => !!s);
    }

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
                    label: composed(m),
                    hint: genotypeOf(m),
                }))
            )
        )
    );

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
            else next[m.metaId] = mouseLabelOf(m);
            return next;
        });
    }
    function applyMove(target: MoveTarget) {
        if (!moving) return;
        applyColonyMove(moving.mouse.metaId, target);
        setMoving(null);
    }

    return (
        <div className="flex min-h-0 flex-1 flex-col gap-2">
            {navNode
                ? createPortal(
                      <NavSearch
                          filter={filter}
                          active={on}
                          onChange={setFilter}
                          open={searchOpen}
                          onOpenChange={setSearchOpen}
                      />,
                      navNode
                  )
                : null}

            {/* ── Unified body: line | cage | slot | mice, all as nested columns ── */}
            <Card className="flex min-h-0 flex-1 flex-col py-0">
                <div className="flex flex-wrap items-center gap-2 border-b bg-muted/50 px-3 py-1.5 sm:h-9 sm:flex-nowrap sm:py-0">
                    <span className="hidden text-[11px] font-semibold tracking-wide text-muted-foreground uppercase sm:inline">
                        jump to
                    </span>
                    <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
                        <JumpMenu
                            label="Lines"
                            count={colony.lines.length}
                            items={lineItems}
                            onPick={(id) => jump('line', id)}
                            className="w-full sm:w-auto"
                        />
                        <JumpMenu
                            label="Cages"
                            count={totalCages}
                            items={cageItems}
                            onPick={(id) => jump('cage', id)}
                            className="w-full sm:w-auto"
                            align="right"
                        />
                        <JumpMenu
                            label="Slots"
                            count={totalSlots}
                            items={slotItems}
                            onPick={(id) => jump('slot', id)}
                            className="w-full sm:w-auto"
                        />
                        <JumpMenu
                            label="Mice"
                            count={totalMice}
                            items={mouseItems}
                            onPick={(id) => jump('mouse', id)}
                            className="w-full sm:w-auto"
                            align="right"
                        />
                    </div>
                    <div className="ml-auto flex flex-col items-end gap-0.5">
                        <div className="hidden sm:block">
                            <Breadcrumb items={crumbs} />
                        </div>
                        {selection ? (
                            <div className="flex items-center gap-1">
                                {selectionMice.length > 0 ? (
                                    <Button
                                        size="xs"
                                        className="h-5 gap-1 px-1.5 text-[10px]"
                                        onClick={() => {
                                            setTaskMice(selectionMice);
                                            setTaskOpen(true);
                                        }}
                                    >
                                        <ListPlus className="size-2.5" /> Create
                                        task · {selectionMice.length}
                                    </Button>
                                ) : null}
                                <Button
                                    variant="ghost"
                                    size="xs"
                                    className="h-5 gap-1 px-1.5 text-[10px]"
                                    onClick={() => setSelection(null)}
                                >
                                    <X className="size-2.5" /> clear
                                </Button>
                            </div>
                        ) : (
                            <Button
                                size="xs"
                                variant="outline"
                                className="h-5 gap-1 px-1.5 text-[10px]"
                                onClick={() => setAddMouseTarget({})}
                            >
                                <Plus className="size-2.5" /> Add mouse
                            </Button>
                        )}
                    </div>
                </div>
                {/* one scroll container for BOTH axes */}
                <div className="thin-scroll min-h-0 flex-1 overflow-auto">
                    {/* pb-10: the last line's tail [+] straddles the card's bottom
                        border, so it needs room below. Padding on the scrolled content
                        renders past the last child; padding on the overflow element does not. */}
                    <div className="relative min-w-[78rem] pb-10">
                        <ColumnHeader />
                        {/* space-y-6: gap between line cards, so each line reads as a
                            distinct block and the straddling tail [+] has clear room. */}
                        <div className="space-y-6">
                            {colony.lines.map((l, i) => {
                                // A line shows the add-row when it is highlighted — by node
                                // selection OR a genotype/mate wash. Same predicate LineLabel
                                // lights with, so a genotype multi-select gives every hit
                                // line its own row (user rule).
                                const lineHl =
                                    hl(1, { lineId: l.lineId }) ||
                                    (genoSets?.lines.has(l.lineId) ?? false) ||
                                    (mateSets?.lines.has(l.lineId) ?? false);
                                // Add-affordance gate — NODE selection only (see TailPlus).
                                const lineSel = hl(1, { lineId: l.lineId });
                                const cageHl = (c: GridCage) =>
                                    hl(2, {
                                        lineId: l.lineId,
                                        cageId: c.cageId,
                                    }) ||
                                    (genoSets?.cages.has(c.cageId) ?? false) ||
                                    (mateSets?.cages.has(c.cageId) ?? false);
                                const slotHl = (c: GridCage, s: GridSlot) =>
                                    hl(3, {
                                        lineId: l.lineId,
                                        cageId: c.cageId,
                                        slotId: s.slotId,
                                    }) ||
                                    (genoSets?.slots.has(s.slotId) ?? false) ||
                                    (mateSets?.slots.has(s.slotId) ?? false);
                                const mouseHl = (
                                    c: GridCage,
                                    s: GridSlot,
                                    m: MouseCell
                                ) =>
                                    hl(4, {
                                        lineId: l.lineId,
                                        cageId: c.cageId,
                                        slotId: s.slotId,
                                        mouseId: m.metaId,
                                    }) ||
                                    genoMouse(genotypeOf(m)) ||
                                    mateMouse(m);
                                // Tail [+] anchors: per COLUMN, only the BOTTOM-MOST highlighted
                                // cell within this line carries the icon (user rule). Prefill is
                                // exact from that cell's own ancestors — no path guessing.
                                const cageSel = (c: GridCage) =>
                                    hl(2, {
                                        lineId: l.lineId,
                                        cageId: c.cageId,
                                    });
                                const slotSel = (c: GridCage, s: GridSlot) =>
                                    hl(3, {
                                        lineId: l.lineId,
                                        cageId: c.cageId,
                                        slotId: s.slotId,
                                    });
                                const mouseSel = (
                                    c: GridCage,
                                    s: GridSlot,
                                    m: MouseCell
                                ) =>
                                    hl(4, {
                                        lineId: l.lineId,
                                        cageId: c.cageId,
                                        slotId: s.slotId,
                                        mouseId: m.metaId,
                                    });
                                const lastHlCage = [...l.cages]
                                    .reverse()
                                    .find(cageSel);
                                const lastHlSlot = l.cages
                                    .flatMap((c) =>
                                        c.slots.map((s) => ({ c, s }))
                                    )
                                    .reverse()
                                    .find(({ c, s }) => slotSel(c, s));
                                const lastHlMouse = l.cages
                                    .flatMap((c) =>
                                        c.slots.flatMap((s) =>
                                            s.mice.map((m) => ({ c, s, m }))
                                        )
                                    )
                                    .reverse()
                                    .find(({ c, s, m }) => mouseSel(c, s, m));
                                return (
                                    <div key={l.lineId}>
                                        <div
                                            id={`line-${l.lineId}`}
                                            // Full border + subtle shadow: each line block is a card,
                                            // lifted off the gap so the separation reads at a glance.
                                            className="relative flex border border-border shadow-sm"
                                        >
                                            {lineSel ? (
                                                <TailPlus
                                                    rail={RAIL_W.line}
                                                    label="Add new line"
                                                    onClick={() =>
                                                        setAddLineOpen(true)
                                                    }
                                                />
                                            ) : null}
                                            <LineLabel
                                                line={l}
                                                index={i + 1}
                                                count={countLineMice(l)}
                                                highlighted={lineHl}
                                                onClick={() =>
                                                    goTo({
                                                        level: 'line',
                                                        id: l.lineId,
                                                    })
                                                }
                                            />
                                            <div className="min-w-0 flex-1">
                                                {/* Empty line: the cage/slot/mouse [+] all live inside
                                            l.cages.map, so a just-created line would be a dead end.
                                            A standing "+ cage" is its only way forward. */}
                                                {l.cages.length === 0 ? (
                                                    <button
                                                        type="button"
                                                        aria-label="Add first cage to line"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setAddMouseTarget({
                                                                lineId: l.lineId,
                                                            });
                                                        }}
                                                        className="flex w-full items-center px-2 py-1 font-mono text-[10px] text-muted-foreground/60 transition-colors hover:bg-accent hover:text-foreground"
                                                    >
                                                        + cage
                                                    </button>
                                                ) : null}
                                                {l.cages.map((c) => (
                                                    <div
                                                        key={c.cageId}
                                                        id={`cage-${c.cageId}`}
                                                        className="relative flex border-t border-border/60 first:border-t-0"
                                                    >
                                                        {c.cageId ===
                                                        lastHlCage?.cageId ? (
                                                            <TailPlus
                                                                rail={
                                                                    RAIL_W.cage
                                                                }
                                                                label="Add cage to line"
                                                                onClick={() =>
                                                                    setAddMouseTarget(
                                                                        {
                                                                            lineId: l.lineId,
                                                                        }
                                                                    )
                                                                }
                                                            />
                                                        ) : null}
                                                        <CageLabel
                                                            number={
                                                                c.cageNumber
                                                            }
                                                            count={countCageMice(
                                                                c
                                                            )}
                                                            highlighted={cageHl(
                                                                c
                                                            )}
                                                            onClick={() =>
                                                                goTo({
                                                                    level: 'cage',
                                                                    id: c.cageId,
                                                                })
                                                            }
                                                        />
                                                        <div className="min-w-0 flex-1">
                                                            {c.slots.map(
                                                                (s) => (
                                                                    <div
                                                                        key={
                                                                            s.slotId
                                                                        }
                                                                        id={`slot-${s.slotId}`}
                                                                        className="relative flex border-t border-border/40 first:border-t-0"
                                                                    >
                                                                        {s.slotId ===
                                                                        lastHlSlot
                                                                            ?.s
                                                                            .slotId ? (
                                                                            <TailPlus
                                                                                rail={
                                                                                    RAIL_W.slot
                                                                                }
                                                                                label="Add slot to cage"
                                                                                onClick={() =>
                                                                                    setAddMouseTarget(
                                                                                        {
                                                                                            cageId: c.cageId,
                                                                                        }
                                                                                    )
                                                                                }
                                                                            />
                                                                        ) : null}
                                                                        <SlotLabel
                                                                            label={
                                                                                s.label
                                                                            }
                                                                            count={countSlotMice(
                                                                                s.mice
                                                                            )}
                                                                            adults={countSlotAdults(
                                                                                s.mice
                                                                            )}
                                                                            cap={
                                                                                SLOT_ADULT_CAP
                                                                            }
                                                                            over={
                                                                                countSlotAdults(
                                                                                    s.mice
                                                                                ) >
                                                                                SLOT_ADULT_CAP
                                                                            }
                                                                            highlighted={slotHl(
                                                                                c,
                                                                                s
                                                                            )}
                                                                            onClick={() =>
                                                                                goTo(
                                                                                    {
                                                                                        level: 'slot',
                                                                                        id: s.slotId,
                                                                                    }
                                                                                )
                                                                            }
                                                                        />
                                                                        <div className="min-w-0 flex-1">
                                                                            {/* Empty slot: a standing "+ mouse" fills the empty block so the
                                                                    first mouse can be added without selecting first. */}
                                                                            {s
                                                                                .mice
                                                                                .length ===
                                                                            0 ? (
                                                                                <button
                                                                                    type="button"
                                                                                    aria-label="Add first mouse to slot"
                                                                                    onClick={(
                                                                                        e
                                                                                    ) => {
                                                                                        e.stopPropagation();
                                                                                        setAddMouseTarget(
                                                                                            {
                                                                                                cageId: c.cageId,
                                                                                                slotId: s.slotId,
                                                                                            }
                                                                                        );
                                                                                    }}
                                                                                    className="flex w-full items-center px-2 py-1 font-mono text-[10px] text-muted-foreground/60 transition-colors hover:bg-accent hover:text-foreground"
                                                                                >
                                                                                    +
                                                                                    mouse
                                                                                </button>
                                                                            ) : null}
                                                                            {s.mice.map(
                                                                                (
                                                                                    m
                                                                                ) => (
                                                                                    <MouseRow
                                                                                        key={
                                                                                            m.metaId
                                                                                        }
                                                                                        id={`mouse-${m.metaId}`}
                                                                                        mouse={
                                                                                            m
                                                                                        }
                                                                                        composedLabel={composed(
                                                                                            m
                                                                                        )}
                                                                                        dateHits={dateIndex.get(
                                                                                            m.metaId
                                                                                        )}
                                                                                        tags={
                                                                                            badgeIndex.get(
                                                                                                m.metaId
                                                                                            ) ??
                                                                                            []
                                                                                        }
                                                                                        zebra={
                                                                                            (rowIndex.get(
                                                                                                m.metaId
                                                                                            ) ??
                                                                                                0) %
                                                                                                2 ===
                                                                                            1
                                                                                        }
                                                                                        highlighted={mouseHl(
                                                                                            c,
                                                                                            s,
                                                                                            m
                                                                                        )}
                                                                                        onAddBelow={
                                                                                            m.metaId ===
                                                                                            lastHlMouse
                                                                                                ?.m
                                                                                                .metaId
                                                                                                ? () =>
                                                                                                      setAddMouseTarget(
                                                                                                          {
                                                                                                              cageId: c.cageId,
                                                                                                              slotId: s.slotId,
                                                                                                          }
                                                                                                      )
                                                                                                : undefined
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
                                                                                            goTo(
                                                                                                {
                                                                                                    level: 'mouse',
                                                                                                    id: m.metaId,
                                                                                                }
                                                                                            )
                                                                                        }
                                                                                        onJumpMouse={(
                                                                                            mid
                                                                                        ) =>
                                                                                            jump(
                                                                                                'mouse',
                                                                                                mid
                                                                                            )
                                                                                        }
                                                                                        resolveParentLabel={
                                                                                            resolveParentLabel
                                                                                        }
                                                                                        resolveParentGenotype={
                                                                                            resolveParentGenotype
                                                                                        }
                                                                                        resolveParentGenotypeColor={
                                                                                            resolveParentGenotypeColor
                                                                                        }
                                                                                        onOpen={() => {
                                                                                            setCaseDrawer(
                                                                                                null
                                                                                            );
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
                                                                                            );
                                                                                        }}
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
                                                                                                genotypeOf(
                                                                                                    m
                                                                                                )
                                                                                            )
                                                                                        }
                                                                                        onMate={
                                                                                            pickMate
                                                                                        }
                                                                                        onOpenCases={(
                                                                                            t
                                                                                        ) => {
                                                                                            setDetail(
                                                                                                null
                                                                                            );
                                                                                            setCaseDrawer(
                                                                                                t
                                                                                            );
                                                                                        }}
                                                                                        onCtxMenu={(
                                                                                            e
                                                                                        ) => {
                                                                                            e.preventDefault();
                                                                                            setCtxMenu(
                                                                                                {
                                                                                                    x: e.clientX,
                                                                                                    y: e.clientY,
                                                                                                    mouse: {
                                                                                                        metaId: m.metaId,
                                                                                                        mouseLabel:
                                                                                                            mouseLabelOf(
                                                                                                                m
                                                                                                            ),
                                                                                                    },
                                                                                                }
                                                                                            );
                                                                                        }}
                                                                                    />
                                                                                )
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                )
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
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
                            const mice = Object.entries(selected).map(
                                ([id, label]) => ({
                                    metaId: Number(id),
                                    label,
                                })
                            );
                            setTaskMice(mice);
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
                    preset={taskMice}
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
                resolveParentLabel={resolveParentLabel}
                resolveParentGenotype={resolveParentGenotype}
            />

            <MouseCaseDrawer
                target={caseDrawer}
                onClose={() => setCaseDrawer(null)}
            />

            {ctxMenu ? (
                <MouseCaseTypeMenu
                    x={ctxMenu.x}
                    y={ctxMenu.y}
                    onPick={(def) => {
                        addTask({
                            def,
                            values: {},
                            signal: 'instruction',
                            // Batch path (mice below): the case is subjectKind
                            // 'mice', which has no single-mouse FK slot and no
                            // stored header — the member id is the subject.
                            subjectLabel: null,
                            subjectMouseId: null,
                            subjectLitterCode: null,
                            detail: null,
                            dueDate: null,
                            assignee: null,
                            mice: [ctxMenu.mouse.metaId],
                        });
                        setCtxMenu(null);
                    }}
                    onSac={() => {
                        updateMouse(ctxMenu.mouse.metaId, {
                            signal: 'dead',
                            isAlive: false,
                        });
                        setCtxMenu(null);
                    }}
                    onClose={() => setCtxMenu(null)}
                />
            ) : null}

            {/* AddMouseDialog: keyed by target so each open is a fresh mount with
                correct prefill. null target = closed. */}
            {addMouseTarget !== null ? (
                <AddMouseDialog
                    key={`${addMouseTarget.lineId ?? ''}-${addMouseTarget.cageId ?? ''}-${addMouseTarget.slotId ?? ''}`}
                    open
                    onClose={() => setAddMouseTarget(null)}
                    initialLineId={addMouseTarget.lineId}
                    initialCageId={addMouseTarget.cageId}
                    initialSlotId={addMouseTarget.slotId}
                />
            ) : null}

            <AddLineDialog
                open={addLineOpen}
                onClose={() => setAddLineOpen(false)}
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
    className,
    align,
}: {
    label: string;
    count: number;
    items: JumpItem[];
    onPick: (id: number) => void;
    className?: string;
    align?: 'left' | 'right';
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
        <div className={cn('relative', className)}>
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="flex w-full items-center justify-between gap-1 rounded-none border border-border bg-background px-2 py-1 text-[10px] font-medium transition-colors hover:bg-accent sm:w-auto sm:justify-start"
            >
                <span className="flex items-center gap-1">
                    {label}
                    <span className="text-muted-foreground">{count}</span>
                </span>
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
                    <div
                        className={cn(
                            'absolute z-50 mt-1 w-60 border border-border bg-card shadow-md',
                            align === 'right'
                                ? 'right-0 sm:right-auto sm:left-0'
                                : 'left-0'
                        )}
                    >
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

/* ---------- nav search + filter ---------- */

function NavSearch({
    filter,
    active,
    onChange,
    open,
    onOpenChange,
}: {
    filter: GridFilter;
    active: boolean;
    onChange: (f: GridFilter) => void;
    open: boolean;
    onOpenChange: (v: boolean) => void;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (open) inputRef.current?.focus();
    }, [open]);

    if (!open) {
        return (
            <button
                type="button"
                onClick={() => onOpenChange(true)}
                aria-label="Open search (⌘K)"
                className="relative flex items-center gap-1.5 border border-input bg-background px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
                <Search className="size-3.5" />
                <span className="hidden sm:inline">search</span>
                <kbd className="hidden border border-border px-1 text-[10px] leading-tight sm:inline">
                    ⌘K
                </kbd>
                {active ? (
                    <span
                        aria-label="filters active"
                        className="absolute -top-1 -right-1 size-2 rounded-full bg-primary"
                    />
                ) : null}
            </button>
        );
    }

    return (
        <div className="absolute inset-0 z-40 flex items-center bg-background">
            <div className="mx-auto flex w-full max-w-[1400px] flex-nowrap items-center gap-3 px-4">
                <div className="flex min-h-7 min-w-0 flex-1 flex-wrap items-center gap-1 border border-input bg-background px-2 py-0.5">
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
                        ref={inputRef}
                        value={filter.query}
                        onChange={(e) =>
                            onChange({ ...filter, query: e.target.value })
                        }
                        placeholder={active ? 'filter…' : 'id or genotype…'}
                        className="h-6 min-w-16 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                    />
                    {active ? (
                        <button
                            type="button"
                            onClick={() => onChange(EMPTY_FILTER)}
                            aria-label="clear filters"
                            className="shrink-0 p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        >
                            <X className="size-3.5" />
                        </button>
                    ) : null}
                </div>

                <div className="thin-scroll flex min-w-0 shrink flex-nowrap items-center gap-x-3 overflow-x-auto">
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

                <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    aria-label="Close search"
                    className="shrink-0 p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                    <X className="size-4" />
                </button>
            </div>
        </div>
    );
}

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
        <div className="flex shrink-0 items-center gap-1.5">
            <span className="hidden text-[11px] text-muted-foreground sm:inline">
                {label}
            </span>
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

function Breadcrumb({ items }: { items: string[] }) {
    return (
        <nav
            aria-label="Breadcrumb"
            className="flex flex-nowrap items-center gap-1 font-mono text-[10px] leading-none"
        >
            {items.map((label, i) => (
                <span
                    key={i}
                    className="flex items-center gap-1"
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

function ColumnHeader() {
    const cell = 'truncate border-r border-border/40 px-2 py-1';
    return (
        <div className="sticky top-0 z-30 flex border-b border-border bg-muted text-[9px] font-semibold tracking-wide text-muted-foreground/70 uppercase">
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
            <div
                className={cn(
                    SEL_W,
                    'flex shrink-0 items-center justify-center border-r border-border/40 px-1 py-1'
                )}
            >
                sel
            </div>
            <div className="flex flex-1 flex-col">
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

// TailPlus: [+] straddling the BOTTOM BORDER of the bottom-most NODE-SELECTED
// cell of one column (user rule). `rail` mirrors that column's width (RAIL_W /
// SEL_W) so the icon sits centred under its own column. Rendered as a SIBLING
// of the rail <button> (never inside it — nested buttons are invalid DOM and
// LineLabel's overflow-hidden would clip a straddling icon). z-20 clears
// HlOverlay (z-10) and stays under the sticky header (z-30).
function TailPlus({
    rail,
    label,
    onClick,
}: {
    rail: string;
    label: string;
    onClick: () => void;
}) {
    return (
        <div
            className={cn(
                rail,
                'pointer-events-none absolute bottom-0 left-0 z-20 flex translate-y-1/2 justify-center'
            )}
        >
            <button
                type="button"
                aria-label={label}
                title={label}
                onClick={(e) => {
                    e.stopPropagation();
                    onClick();
                }}
                className="pointer-events-auto flex size-4 items-center justify-center rounded-full border border-primary bg-card text-primary shadow-sm transition-colors hover:bg-primary hover:text-primary-foreground"
            >
                <Plus className="size-2.5" />
            </button>
        </div>
    );
}

/* ---------- left-rail labels (COLUMN-based hierarchy) ---------- */

const RAIL_BASE =
    'flex shrink-0 flex-col justify-center gap-0.5 border-r border-border/40 text-left transition-colors';

// Whole-element highlight overlay. pointer-events-none keeps click-through intact.
// WHY dimmed wash + ring: user prefers this over ring-only (less jarring on large grids).
function HlOverlay() {
    return (
        <span
            aria-hidden
            className="pointer-events-none absolute inset-0 z-10 bg-primary/20 ring-2 ring-primary ring-inset"
        />
    );
}

function LineLabel({
    line,
    index,
    count,
    highlighted,
    onClick,
}: {
    line: GridLine;
    index: number;
    count: number;
    highlighted: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={`${index}. ${line.lineName}`}
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
            <CountBadge
                count={count}
                title="live mice in line"
            />
        </button>
    );
}

function CountBadge({ count, title }: { count: number; title: string }) {
    if (count <= 0) return null;
    return (
        <span
            title={title}
            className="rounded-sm bg-foreground/10 px-1 font-mono text-[9px] leading-tight font-semibold text-muted-foreground"
        >
            {count}
        </span>
    );
}

function CageLabel({
    number,
    count,
    highlighted,
    onClick,
}: {
    number: string;
    count: number;
    highlighted: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                RAIL_BASE,
                'relative w-16 gap-1 bg-muted/40 px-2 py-2 hover:bg-accent'
            )}
        >
            {highlighted ? <HlOverlay /> : null}
            <span className="font-mono text-[13px] font-bold text-foreground">
                {number}
            </span>
            <CountBadge
                count={count}
                title="live mice in cage"
            />
        </button>
    );
}

function SlotLabel({
    label,
    count,
    highlighted,
    over,
    adults,
    cap,
    onClick,
}: {
    label: string;
    count: number;
    highlighted: boolean;
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
            <CountBadge
                count={count}
                title="live mice in slot"
            />
            {over ? (
                <span className="rounded-sm bg-red-600 px-1 text-[8px] leading-tight font-bold text-white">
                    {adults}/{cap}
                </span>
            ) : null}
        </button>
    );
}

function ParentRow({
    tint,
    parent,
    onJump,
    resolveLabel,
    resolveGenotype,
    resolveGenotypeColor,
    divider,
}: {
    tint: string;
    parent?: ParentCell | null;
    onJump: (metaId: number) => void;
    // plan §5 Q46 option C: in-grid parents carry no label — this resolves
    // that parent's own MouseCell and composes it. null = the metaId has no
    // row in this payload (not-found fallback, §19), never a throw.
    resolveLabel: (metaId: number) => string | null;
    // Same for the genotype, which an in-grid parent likewise no longer carries.
    resolveGenotype: (metaId: number) => string | null;
    // And for its tint, which follows the string off the same MouseCell.
    resolveGenotypeColor: (metaId: number) => string | null;
    divider?: boolean;
}) {
    // min-h-0 + no flex-1: the parent cell is now a 2-row grid, so the track
    // sizes this row — see the mate cell's comment for why flex sizing broke it.
    const base = cn(
        'grid min-h-0 grid-cols-2 overflow-hidden',
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
    const resolved = parent.metaId != null ? resolveLabel(parent.metaId) : null;
    // Outside/unknown parent -> its snapshot; in-grid parent -> the resolved,
    // composed label; in-grid parent whose metaId has no row -> placeholder.
    const label =
        parent.metaId == null
            ? parent.snapshotLabel
            : (resolved ?? '(unresolved)');
    // Outside parent -> its snapshot genotype (nothing to resolve); in-grid
    // parent -> composed from its OWN gene rows, so it cannot drift.
    const genotype =
        parent.metaId == null
            ? parent.genotype
            : resolveGenotype(parent.metaId);
    // The tint resolves with the string it tints, never separately.
    const genotypeColor =
        parent.metaId == null
            ? parent.genotypeColor
            : resolveGenotypeColor(parent.metaId);
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
                    clickable ? `go to ${label}` : `${label} (not shown here)`
                }
                className={cn(
                    'flex items-center truncate px-1 text-left font-mono text-[10px] font-semibold',
                    tint,
                    clickable
                        ? 'cursor-pointer hover:underline'
                        : 'cursor-default opacity-60'
                )}
            >
                {label}
            </button>
            <span
                title={genotype ?? undefined}
                style={
                    genotypeColor
                        ? { backgroundColor: `${genotypeColor}22` }
                        : undefined
                }
                className="flex items-center truncate border-l border-border/40 px-1 font-mono text-[9px]"
            >
                {genotype ?? '—'}
            </span>
        </div>
    );
}

/* ---------- mouse row (Excel-style colour cells) ---------- */

const CELL = 'flex items-center border-r border-border/40 px-2 py-1.5';

const SEL_W = 'w-8';
const MOUSE_COLS =
    'grid-cols-[6rem_minmax(10rem,1fr)_4.75rem_5.5rem_11rem_4.75rem_4.75rem_4.75rem_4.75rem_5rem]';

const fmtDate = formatDate;
const TASK_W = 'w-24';
const RAIL_W = { line: 'w-8', cage: 'w-16', slot: 'w-9' } as const;

// WHY 5: user-specified; professor to confirm final cap (Q33/Q34).
const SLOT_ADULT_CAP = 5;

const isLiveMouse = (m: MouseCell): boolean =>
    m.isAlive !== false && m.signal !== 'dead';

const countSlotAdults = (mice: MouseCell[]): number =>
    mice.filter((m) => isLiveMouse(m) && lifeStage(m.dob, m.sex) !== 'baby')
        .length;

const countSlotMice = (mice: MouseCell[]): number =>
    mice.filter(isLiveMouse).length;
const countCageMice = (c: GridCage): number =>
    c.slots.reduce((n, s) => n + countSlotMice(s.mice), 0);
const countLineMice = (l: GridLine): number =>
    l.cages.reduce((n, c) => n + countCageMice(c), 0);

function MouseRow({
    id,
    mouse,
    composedLabel,
    tags,
    dateHits,
    zebra,
    highlighted,
    onAddBelow,
    filterOn,
    isMatch,
    checked,
    onToggle,
    onSelect,
    onOpen,
    onMove,
    onJumpMouse,
    resolveParentLabel,
    resolveParentGenotype,
    resolveParentGenotypeColor,
    onGenotype,
    onMate,
    onOpenCases,
    onCtxMenu,
}: {
    id: string;
    mouse: MouseCell;
    composedLabel: string;
    tags: MouseCaseTag[];
    dateHits: Partial<Record<DateColumn, DateCaseHit>> | undefined;
    zebra: boolean;
    highlighted: boolean;
    // Set only on the bottom-most highlighted mouse row of a line — see TailPlus.
    onAddBelow?: () => void;
    filterOn: boolean;
    isMatch: boolean;
    checked: boolean;
    onToggle: () => void;
    onSelect: () => void;
    onOpen: () => void;
    onMove: () => void;
    onJumpMouse: (metaId: number) => void;
    // Resolves an in-grid ParentCell's label from its own MouseCell (plan §5
    // Q46 option C) — forwarded to ParentRow.
    resolveParentLabel: (metaId: number) => string | null;
    // Same, for the parent's composed genotype — forwarded to ParentRow.
    resolveParentGenotype: (metaId: number) => string | null;
    // Same, for that genotype's tint — forwarded to ParentRow.
    resolveParentGenotypeColor: (metaId: number) => string | null;
    onGenotype: () => void;
    onMate: (color: string) => void;
    onOpenCases: (target: CaseDrawerTarget) => void;
    onCtxMenu: (e: React.MouseEvent) => void;
}) {
    const dimmed = filterOn && !isMatch;
    const stage = lifeStage(mouse.dob, mouse.sex);
    const dead = mouse.signal === 'dead';
    const bySignal = tags.reduce((m, t) => {
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
            onContextMenu={onCtxMenu}
            className={cn(
                'group relative border-b border-border/40 last:border-b-0',
                !dead && (zebra ? 'bg-muted/40' : 'bg-background'),
                dead && 'bg-neutral-700 text-neutral-300'
            )}
        >
            {highlighted ? <HlOverlay /> : null}
            {onAddBelow ? (
                <TailPlus
                    rail={SEL_W}
                    label="Add mouse to slot"
                    onClick={onAddBelow}
                />
            ) : null}
            <div
                role="button"
                tabIndex={-1}
                onClick={onSelect}
                className={cn(
                    'flex cursor-pointer transition-opacity',
                    dimmed ? 'opacity-25' : 'opacity-100'
                )}
            >
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
                        aria-label={`select ${composedLabel}`}
                    />
                </label>

                <div className="min-w-0 flex-1">
                    <div className={cn('grid items-stretch', MOUSE_COLS)}>
                        {/* id cell — READ-ONLY (P0.7-b step 9a): the label is
                            SPECIFIED as a read-time projection of parts, so it must
                            not be typed over. Composed via mouseLabelOf/composed()
                            (step 9b) — MouseCell has no stored label to read.
                            Single-click opens drawer. */}
                        <div
                            className={cn(
                                CELL,
                                !dead && SEX_TINT[mouse.sex],
                                'text-left'
                            )}
                        >
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onOpen();
                                }}
                                title={`sex: ${mouse.sex}`}
                                className="w-full text-left hover:underline"
                            >
                                <span
                                    className={cn(
                                        'truncate font-mono text-[11px] font-semibold',
                                        dead && 'text-neutral-400 line-through'
                                    )}
                                >
                                    {composedLabel}
                                </span>
                            </button>
                        </div>

                        <div
                            className={cn(CELL, 'min-w-0')}
                            style={
                                !dead && mouse.genotypeColor
                                    ? {
                                          backgroundColor: `${mouse.genotypeColor}22`,
                                      }
                                    : undefined
                            }
                        >
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onGenotype();
                                }}
                                title={`highlight genotype: ${genotypeOf(mouse)}`}
                                className="w-full text-left hover:underline"
                            >
                                <span className="truncate font-mono text-[11px]">
                                    {genotypeOf(mouse)}
                                </span>
                            </button>
                        </div>

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

                        {/* grid-rows-2, not flex-col: a flex item's min-height is
                            auto, so the half holding text cannot shrink below its
                            content and shoves the divider off the 50% line — which
                            is why it stopped lining up with the parent cell's. Two
                            1fr tracks split exactly in half at any row height. */}
                        {/* grid-rows-2, not flex-col: a flex item's min-height is
                            auto, so the half holding text cannot shrink below its
                            content and shoves the divider off the 50% line — which
                            is why it stopped lining up with the parent cell's. Two
                            1fr tracks split exactly in half at any row height. */}
                        <div className="grid grid-rows-2 border-r border-border/40">
                            {mouse.mates.length > 0 ? (
                                (() => {
                                    // Latest = matedOn sorted DESCENDING, nulls last.
                                    // Never array order: a server query without an
                                    // ORDER BY would then surface the wrong partner
                                    // with no error to notice.
                                    const byLatest = [...mouse.mates].sort(
                                        (x, y) => {
                                            if (x.matedOn === y.matedOn)
                                                return 0;
                                            if (x.matedOn == null) return 1;
                                            if (y.matedOn == null) return -1;
                                            return y.matedOn.localeCompare(
                                                x.matedOn
                                            );
                                        }
                                    );
                                    const latest = byLatest[0]!;
                                    const clickable =
                                        latest.partnerMetaId != null;
                                    return (
                                        <>
                                            {/* Top half = the LATEST mate only. Ids are
                                                long and wrap badly; the badges below
                                                carry the whole group, so the label names
                                                the current partner and the colours carry
                                                the history. One line → never pushes the
                                                divider. */}
                                            <div className="flex min-h-0 items-center overflow-hidden px-1 py-0.5">
                                                <button
                                                    type="button"
                                                    disabled={!clickable}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (
                                                            latest.partnerMetaId !=
                                                            null
                                                        )
                                                            onJumpMouse(
                                                                latest.partnerMetaId
                                                            );
                                                    }}
                                                    title={
                                                        byLatest.length > 1
                                                            ? `latest of ${byLatest.length}: ${byLatest
                                                                  .map(
                                                                      (m) =>
                                                                          `${m.partnerId}${m.matedOn ? ` (${fmtDate(m.matedOn)})` : ''}`
                                                                  )
                                                                  .join(', ')}`
                                                            : clickable
                                                              ? `go to ${latest.partnerId}`
                                                              : latest.partnerId
                                                    }
                                                    className={cn(
                                                        'truncate font-mono text-[9px] font-semibold',
                                                        clickable
                                                            ? 'cursor-pointer hover:underline'
                                                            : 'cursor-default opacity-60'
                                                    )}
                                                >
                                                    {latest.partnerId}
                                                </button>
                                            </div>
                                            {/* Badges keep the SAME order as the label
                                                above — leftmost is the latest — and wrap
                                                as the group grows. */}
                                            <div className="flex min-h-0 flex-wrap items-center gap-1 overflow-hidden border-t border-border/40 px-1 py-0.5">
                                                {byLatest.map((mt, i) => (
                                                    <button
                                                        key={i}
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onMate(mt.color);
                                                        }}
                                                        className="size-3 shrink-0 cursor-pointer rounded-sm border border-black/10 hover:ring-1 hover:ring-primary"
                                                        style={{
                                                            background:
                                                                mt.color,
                                                        }}
                                                        title={
                                                            mt.matedOn
                                                                ? `${mt.partnerId} · ${fmtDate(mt.matedOn)} — highlight mate group`
                                                                : `${mt.partnerId} — highlight mate group`
                                                        }
                                                        aria-label="highlight mate group"
                                                    />
                                                ))}
                                            </div>
                                        </>
                                    );
                                })()
                            ) : (
                                <span className="row-span-2 flex items-center px-1 text-[11px] text-muted-foreground/40">
                                    —
                                </span>
                            )}
                        </div>

                        <div className="grid grid-rows-2 border-r border-border/40">
                            <ParentRow
                                tint="bg-sky-100"
                                parent={mouse.parents?.father}
                                onJump={onJumpMouse}
                                resolveLabel={resolveParentLabel}
                                resolveGenotype={resolveParentGenotype}
                                resolveGenotypeColor={
                                    resolveParentGenotypeColor
                                }
                            />
                            <ParentRow
                                tint="bg-pink-100"
                                parent={mouse.parents?.mother}
                                onJump={onJumpMouse}
                                resolveLabel={resolveParentLabel}
                                resolveGenotype={resolveParentGenotype}
                                resolveGenotypeColor={
                                    resolveParentGenotypeColor
                                }
                                divider
                            />
                        </div>

                        {(
                            ['plug', 'deliv', 'tissue', 'genotyping'] as const
                        ).map((col) => {
                            const na =
                                (col === 'plug' || col === 'deliv') &&
                                mouse.sex !== 'F';
                            const hit = na ? undefined : dateHits?.[col];
                            return (
                                <div
                                    key={col}
                                    className={cn(
                                        CELL,
                                        'px-1.5 font-mono text-[10px]',
                                        hit
                                            ? dateColorOf(
                                                  hit.status,
                                                  hit.signal
                                              )
                                            : 'text-muted-foreground'
                                    )}
                                >
                                    {na
                                        ? ''
                                        : hit
                                          ? fmtDate(hit.date)
                                          : fmtDate(mouse.dates?.[col])}
                                </div>
                            );
                        })}

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

                    {/* WHY no label text in sub-row: user removed the "tasks" affordance label; signal badges speak for themselves. */}
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
                                        <button
                                            key={g.signal}
                                            type="button"
                                            title={g.types.join(', ')}
                                            aria-label={`${g.count} ${g.signal} task(s): ${g.types.join(', ')} — click to view cases`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onOpenCases({
                                                    kind: 'focus',
                                                    metaId: mouse.metaId,
                                                    label: composedLabel,
                                                    signal: g.signal,
                                                });
                                            }}
                                            className={cn(
                                                'flex size-3.5 items-center justify-center rounded-sm border text-[8px] leading-none font-bold cursor-pointer hover:ring-1 hover:ring-primary',
                                                signalTagFillClass(g.signal),
                                                lightFill
                                                    ? 'text-neutral-900'
                                                    : 'text-white'
                                            )}
                                        >
                                            {g.count > 1 ? g.count : ''}
                                        </button>
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
