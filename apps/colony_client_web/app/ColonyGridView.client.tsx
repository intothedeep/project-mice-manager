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
import { Search, X } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { MoveMenu } from './MoveMenu.client';

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
    const [activeLineId, setActiveLineId] = useState(
        initial.lines[0]?.lineId ?? 0
    );
    const [activeCageId, setActiveCageId] = useState(
        initial.lines[0]?.cages[0]?.cageId ?? 0
    );
    const [moving, setMoving] = useState<Moving | null>(null);

    const on = isFilterActive(filter);
    const match = useMemo(
        () => (m: MouseCell) => matchesMouse(m, filter),
        [filter]
    );

    function selectLine(l: GridLine) {
        setActiveLineId(l.lineId);
        setActiveCageId(l.cages[0]?.cageId ?? 0);
    }
    function selectCage(l: GridLine, c: GridCage) {
        setActiveLineId(l.lineId);
        setActiveCageId(c.cageId);
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
            />

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(190px,15rem)_minmax(230px,19rem)_1fr]">
                {/* ── Pane 1: lines ── */}
                <Pane title="Lines">
                    {colony.lines.map((l) => (
                        <PaneRow
                            key={l.lineId}
                            selected={l.lineId === activeLineId}
                            onClick={() => selectLine(l)}
                        >
                            <span className="truncate font-mono text-[13px]">
                                {l.lineName}
                            </span>
                            <Count
                                n={countMatches(lineMice(l), filter, on)}
                                active={on}
                                unit="mice"
                            />
                        </PaneRow>
                    ))}
                </Pane>

                {/* ── Pane 2: ALL cages; children of the active line are highlighted ── */}
                <Pane title="Cages — all lines">
                    {colony.lines.map((l) => (
                        <div key={l.lineId}>
                            <GroupHead
                                active={l.lineId === activeLineId}
                                label={l.lineName}
                            />
                            {l.cages.map((c) => (
                                <PaneRow
                                    key={c.cageId}
                                    selected={c.cageId === activeCageId}
                                    highlight={l.lineId === activeLineId}
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

                {/* ── Pane 3: ALL mice; the active cage's mice are highlighted ── */}
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
    onClick,
    children,
}: {
    selected: boolean;
    highlight?: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'flex w-full items-center justify-between gap-2 border-l-2 px-3 py-2 text-left transition-colors',
                selected
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
    label,
    sub,
    count,
}: {
    active: boolean;
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
    onMove,
}: {
    mouse: MouseCell;
    inActiveCage: boolean;
    filterOn: boolean;
    isMatch: boolean;
    onMove: () => void;
}) {
    // Two orthogonal axes:
    //  · active status → persistent left-border marker on the active cage's mice.
    //  · emphasis/dim  → filter match drives it when a filter is on; otherwise
    //                    active-cage membership does. Active markers never drop.
    const dimmed = filterOn ? !isMatch : !inActiveCage;
    return (
        <div
            className={cn(
                'group border-b border-l-2 border-border/60 px-3 py-2 pl-5 transition-opacity last:border-b-0',
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
                        'mt-0.5 text-[11px]',
                        signalIdClass(mouse.signal)
                    )}
                >
                    {mouse.attention}
                </p>
            ) : null}
        </div>
    );
}
