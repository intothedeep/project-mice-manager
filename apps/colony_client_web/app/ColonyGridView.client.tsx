'use client';

import type {
    ColonyGrid,
    GridCage,
    GridLine,
    MouseCell,
    Sex,
    SignalColor,
} from '@repo/types';
import { useMemo, useState } from 'react';
import { Search, X, ListPlus } from 'lucide-react';
import {
    EMPTY_FILTER,
    isFilterActive,
    matchesMouse,
    toggleIn,
    type GridFilter,
} from '@/lib/gridFilter';
import { moveMouse, type MoveTarget } from '@/lib/gridMove';
import {
    SIGNAL_LABEL,
    SIGNAL_ORDER,
    signalIdClass,
    signalRowClass,
} from '@/lib/signal';
import { genotypeColor, lineColor, type ColorBy } from '@/lib/colors';
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

function countMatches(mice: MouseCell[], f: GridFilter, on: boolean): number {
    return on ? mice.filter((m) => matchesMouse(m, f)).length : mice.length;
}
const lineMice = (l: GridLine) =>
    l.cages.flatMap((c) => c.slots.flatMap((s) => s.mice));
const cageMice = (c: GridCage) => c.slots.flatMap((s) => s.mice);

export function ColonyGridView({ initial }: { initial: ColonyGrid }) {
    const [colony, setColony] = useState(initial);
    const [filter, setFilter] = useState<GridFilter>(EMPTY_FILTER);
    const [colorBy, setColorBy] = useState<ColorBy>('off');
    const [activeLineId, setActiveLineId] = useState(
        initial.lines[0]?.lineId ?? 0
    );
    const [activeCageId, setActiveCageId] = useState(
        initial.lines[0]?.cages[0]?.cageId ?? 0
    );
    const [moving, setMoving] = useState<Moving | null>(null);
    const [detail, setDetail] = useState<SelectedMouse | null>(null);
    const [selected, setSelected] = useState<Record<number, string>>({});
    const [taskOpen, setTaskOpen] = useState(false);

    const on = isFilterActive(filter);
    const match = useMemo(
        () => (m: MouseCell) => matchesMouse(m, filter),
        [filter]
    );

    const hueByLine = useMemo(() => {
        const map = new Map<number, string>();
        colony.lines.forEach((l, i) => map.set(l.lineId, lineColor(i)));
        return map;
    }, [colony.lines]);
    const lineHue = (lineId: number) =>
        colorBy === 'line' ? hueByLine.get(lineId) : undefined;

    const selectedIds = Object.values(selected);

    function selectLine(l: GridLine) {
        setActiveLineId(l.lineId);
        setActiveCageId(l.cages[0]?.cageId ?? 0);
    }
    function selectCage(l: GridLine, c: GridCage) {
        setActiveLineId(l.lineId);
        setActiveCageId(c.cageId);
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
        <div className="space-y-3">
            <FilterBar
                filter={filter}
                active={on}
                onChange={setFilter}
                colorBy={colorBy}
                onColorBy={setColorBy}
            />

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(190px,15rem)_minmax(230px,19rem)_1fr]">
                {/* ── Pane 1: lines ── */}
                <Pane title="Lines">
                    {colony.lines.map((l) => (
                        <PaneRow
                            key={l.lineId}
                            selected={l.lineId === activeLineId}
                            hue={lineHue(l.lineId)}
                            onClick={() => selectLine(l)}
                        >
                            <span className="flex items-center gap-2 truncate">
                                {lineHue(l.lineId) ? (
                                    <Dot c={lineHue(l.lineId)!} />
                                ) : null}
                                <span className="truncate font-mono text-[13px]">
                                    {l.lineName}
                                </span>
                            </span>
                            <Count
                                n={countMatches(lineMice(l), filter, on)}
                                active={on}
                                unit="mice"
                            />
                        </PaneRow>
                    ))}
                </Pane>

                {/* ── Pane 2: ALL cages; children of the active line highlighted ── */}
                <Pane title="Cages — all lines">
                    {colony.lines.map((l) => (
                        <div key={l.lineId}>
                            <GroupHead
                                active={l.lineId === activeLineId}
                                hue={lineHue(l.lineId)}
                                label={l.lineName}
                            />
                            {l.cages.map((c) => (
                                <PaneRow
                                    key={c.cageId}
                                    selected={c.cageId === activeCageId}
                                    highlight={l.lineId === activeLineId}
                                    hue={lineHue(l.lineId)}
                                    onClick={() => selectCage(l, c)}
                                >
                                    <span className="flex flex-col">
                                        <span className="font-mono text-[13px]">
                                            cage {c.cageNumber}
                                        </span>
                                        <span className="text-[11px] text-muted-foreground">
                                            {c.location}
                                        </span>
                                    </span>
                                    <Count
                                        n={countMatches(
                                            cageMice(c),
                                            filter,
                                            on
                                        )}
                                        active={on}
                                        unit="mice"
                                    />
                                </PaneRow>
                            ))}
                        </div>
                    ))}
                </Pane>

                {/* ── Pane 3: ALL mice; the active cage's mice highlighted ── */}
                <Pane
                    title="Mice — all cages"
                    scroll
                >
                    {colony.lines.map((l) =>
                        l.cages.map((c) => {
                            const isActiveCage = c.cageId === activeCageId;
                            return (
                                <div key={c.cageId}>
                                    <GroupHead
                                        active={isActiveCage}
                                        hue={lineHue(l.lineId)}
                                        label={`cage ${c.cageNumber}`}
                                        sub={l.lineName}
                                        count={
                                            on
                                                ? countMatches(
                                                      cageMice(c),
                                                      filter,
                                                      on
                                                  )
                                                : undefined
                                        }
                                    />
                                    {c.slots.map((s) => (
                                        <div key={s.slotId}>
                                            <SlotHead label={s.label} />
                                            {s.mice.map((m) => (
                                                <MouseRow
                                                    key={m.metaId}
                                                    mouse={m}
                                                    inActiveCage={isActiveCage}
                                                    filterOn={on}
                                                    isMatch={match(m)}
                                                    swatch={
                                                        colorBy === 'genotype'
                                                            ? genotypeColor(
                                                                  m.genotype
                                                              )
                                                            : undefined
                                                    }
                                                    checked={
                                                        !!selected[m.metaId]
                                                    }
                                                    onToggle={() =>
                                                        toggleSelect(m)
                                                    }
                                                    onOpen={() =>
                                                        setDetail({
                                                            mouse: m,
                                                            lineName:
                                                                l.lineName,
                                                            cageNumber:
                                                                c.cageNumber,
                                                            slotLabel: s.label,
                                                        })
                                                    }
                                                    onMove={() =>
                                                        setMoving({
                                                            mouse: m,
                                                            lineId: l.lineId,
                                                            cageId: c.cageId,
                                                            slotId: s.slotId,
                                                        })
                                                    }
                                                />
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            );
                        })
                    )}
                </Pane>
            </div>

            {/* selection action bar */}
            {selectedIds.length > 0 ? (
                <div className="fixed bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-full border bg-card px-4 py-2 shadow-lg">
                    <span className="text-sm font-medium">
                        {selectedIds.length} selected
                    </span>
                    <Button
                        size="sm"
                        onClick={() => setTaskOpen(true)}
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
                    presetMice={selectedIds}
                    onClose={() => {
                        setTaskOpen(false);
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

/* ---------- filter bar ---------- */

function FilterBar({
    filter,
    active,
    onChange,
    colorBy,
    onColorBy,
}: {
    filter: GridFilter;
    active: boolean;
    onChange: (f: GridFilter) => void;
    colorBy: ColorBy;
    onColorBy: (c: ColorBy) => void;
}) {
    return (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border bg-card px-3 py-2.5">
            <div className="relative min-w-52 flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                    value={filter.query}
                    onChange={(e) =>
                        onChange({ ...filter, query: e.target.value })
                    }
                    placeholder="Search id or genotype…"
                    className="h-8 pl-8"
                />
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

            {active ? (
                <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => onChange(EMPTY_FILTER)}
                >
                    <X className="size-3" /> clear
                </Button>
            ) : null}

            <div className="ml-auto flex items-center gap-1 rounded-md border p-0.5">
                <span className="px-1.5 text-[11px] text-muted-foreground">
                    color by
                </span>
                {(['off', 'line', 'genotype'] as ColorBy[]).map((c) => (
                    <button
                        key={c}
                        type="button"
                        onClick={() => onColorBy(c)}
                        className={cn(
                            'rounded px-2 py-0.5 text-[11px] font-medium capitalize transition-colors',
                            colorBy === c
                                ? 'bg-primary text-primary-foreground'
                                : 'text-muted-foreground hover:bg-accent'
                        )}
                    >
                        {c}
                    </button>
                ))}
            </div>
        </div>
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
                'rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors',
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

/* ---------- panes ---------- */

function Dot({ c }: { c: string }) {
    return (
        <span
            className="size-2 shrink-0 rounded-full"
            style={{ background: c }}
            aria-hidden
        />
    );
}

function Pane({
    title,
    scroll,
    children,
}: {
    title: string;
    scroll?: boolean;
    children: React.ReactNode;
}) {
    return (
        <Card className="overflow-hidden py-0">
            <div className="truncate border-b bg-muted/50 px-3 py-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                {title}
            </div>
            <div
                className={cn('h-[66vh] overflow-y-auto', scroll ? '' : 'py-1')}
            >
                {children}
            </div>
        </Card>
    );
}

function PaneRow({
    selected,
    highlight,
    hue,
    onClick,
    children,
}: {
    selected: boolean;
    highlight?: boolean;
    hue?: string;
    onClick: () => void;
    children: React.ReactNode;
}) {
    const style: React.CSSProperties | undefined =
        hue && selected
            ? { borderLeftColor: hue, backgroundColor: `${hue}1a` }
            : hue && highlight
              ? { borderLeftColor: `${hue}80` }
              : undefined;
    return (
        <button
            type="button"
            onClick={onClick}
            style={style}
            className={cn(
                'flex w-full items-center justify-between gap-2 border-l-2 px-3 py-2 text-left transition-colors',
                hue
                    ? 'hover:bg-muted/60'
                    : selected
                      ? 'border-l-primary bg-accent'
                      : highlight
                        ? 'border-l-primary/40 bg-accent/40 hover:bg-accent/60'
                        : 'border-l-transparent hover:bg-muted/60'
            )}
        >
            {children}
        </button>
    );
}

// Group subheader inside pane 2 (per line) and pane 3 (per cage).
function GroupHead({
    active,
    hue,
    label,
    sub,
    count,
}: {
    active: boolean;
    hue?: string;
    label: string;
    sub?: string;
    count?: number;
}) {
    return (
        <div
            className={cn(
                'sticky top-0 z-10 flex items-baseline justify-between border-y px-3 py-1.5 backdrop-blur',
                active
                    ? 'border-primary/30 bg-accent/80'
                    : 'border-border/60 bg-muted/40'
            )}
        >
            <span className="flex items-baseline gap-2">
                {hue ? (
                    <span className="relative top-0.5">
                        <Dot c={hue} />
                    </span>
                ) : null}
                <span
                    className={cn(
                        'font-mono text-[12px] font-semibold',
                        active ? 'text-foreground' : 'text-muted-foreground'
                    )}
                >
                    {label}
                </span>
                {sub ? (
                    <span className="font-mono text-[10px] text-muted-foreground">
                        {sub}
                    </span>
                ) : null}
            </span>
            {count != null ? (
                <span className="rounded-full bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary">
                    {count} ✓
                </span>
            ) : null}
        </div>
    );
}

function SlotHead({ label }: { label: string }) {
    return (
        <div className="flex items-baseline justify-between px-3 pt-1.5 pb-0.5 pl-5">
            <span className="font-mono text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                slot {label}
            </span>
        </div>
    );
}

function Count({
    n,
    active,
    unit,
}: {
    n: number;
    active: boolean;
    unit: string;
}) {
    return (
        <span
            className={cn(
                'shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[10px]',
                active ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
            )}
        >
            {active ? `${n} ✓` : `${n} ${unit}`}
        </span>
    );
}

function MouseRow({
    mouse,
    inActiveCage,
    filterOn,
    isMatch,
    swatch,
    checked,
    onToggle,
    onOpen,
    onMove,
}: {
    mouse: MouseCell;
    inActiveCage: boolean;
    filterOn: boolean;
    isMatch: boolean;
    swatch?: string;
    checked: boolean;
    onToggle: () => void;
    onOpen: () => void;
    onMove: () => void;
}) {
    // active status → persistent left-border marker; emphasis/dim → filter match
    // when a filter is on, else active-cage membership. Markers never drop.
    const dimmed = filterOn ? !isMatch : !inActiveCage;
    return (
        <div
            className={cn(
                'group border-b border-l-2 border-border/60 px-3 py-2 pl-2 transition-opacity last:border-b-0',
                inActiveCage ? 'border-l-primary/70' : 'border-l-transparent',
                signalRowClass(mouse.signal),
                dimmed
                    ? filterOn
                        ? 'opacity-25'
                        : 'opacity-55'
                    : 'opacity-100'
            )}
        >
            <div className="flex items-baseline gap-2">
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={onToggle}
                    className="mt-0.5 size-3.5 shrink-0 cursor-pointer accent-primary"
                    aria-label={`select ${mouse.renderedId}`}
                />
                {swatch ? (
                    <span
                        className="mt-1 size-2.5 shrink-0 rounded-[3px]"
                        style={{ background: swatch }}
                        title={mouse.genotype}
                        aria-hidden
                    />
                ) : null}
                <button
                    type="button"
                    onClick={onOpen}
                    className="flex items-baseline gap-2 text-left hover:underline"
                >
                    <span
                        className={cn(
                            'font-mono text-[13px] font-semibold',
                            signalIdClass(mouse.signal)
                        )}
                    >
                        {mouse.renderedId}
                    </span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                        {mouse.genotype}
                    </span>
                </button>
                <span className="ml-auto font-mono text-[11px] text-muted-foreground">
                    {mouse.sex}
                </span>
                <Button
                    variant="outline"
                    size="xs"
                    className="text-muted-foreground opacity-70 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                    onClick={onMove}
                >
                    Move…
                </Button>
            </div>
            {mouse.attention ? (
                <p
                    className={cn(
                        'mt-0.5 pl-6 text-[11px]',
                        signalIdClass(mouse.signal)
                    )}
                >
                    {mouse.attention}
                </p>
            ) : null}
        </div>
    );
}
