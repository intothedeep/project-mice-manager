'use client';

import { useState } from 'react';
import type { UpcomingItem } from '@/apis/getUpcoming.mock.api';
import { dueStatus, daysUntil, TODAY } from '@/lib/dueDates';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// --- kinds ---

const KIND_LABELS: Record<UpcomingItem['kind'], string> = {
    'plug-check': 'Plug check',
    delivery: 'Delivery',
    wean: 'Wean',
    genotype: 'Genotype',
};

const ALL_KINDS = Object.keys(KIND_LABELS) as UpcomingItem['kind'][];

// --- sections ---

type Section = {
    key: ReturnType<typeof dueStatus>;
    label: string;
    emptyHint: string;
};

const SECTIONS: Section[] = [
    {
        key: 'overdue',
        label: 'Overdue',
        emptyHint: 'nothing overdue',
    },
    {
        key: 'today',
        label: 'Today',
        emptyHint: 'nothing due today',
    },
    {
        key: 'soon',
        label: 'This week',
        emptyHint: 'nothing in the next 3 days',
    },
    {
        key: 'later',
        label: 'Later',
        emptyHint: 'nothing scheduled further out',
    },
];

// --- colour helpers ---

function statusRowClass(status: ReturnType<typeof dueStatus>): string {
    switch (status) {
        case 'overdue':
            return 'border-signal-instruction/40 bg-background';
        case 'today':
        case 'soon':
            return 'bg-signal-flag-fill/50 border-signal-flag-line/60';
        default:
            return 'bg-background';
    }
}

function statusTextClass(status: ReturnType<typeof dueStatus>): string {
    switch (status) {
        case 'overdue':
            return 'text-signal-instruction';
        case 'today':
        case 'soon':
            return 'text-amber-700';
        default:
            return 'text-muted-foreground';
    }
}

function relativeDayLabel(n: number): string {
    if (n === 0) return 'today';
    if (n === 1) return 'tomorrow';
    if (n === -1) return '1 day ago';
    if (n > 0) return `in ${n} days`;
    return `${Math.abs(n)} days ago`;
}

// --- filter toggle ---

function KindToggle({
    active,
    onChange,
}: {
    active: Set<UpcomingItem['kind']>;
    onChange: (k: UpcomingItem['kind']) => void;
}) {
    return (
        <div className="inline-flex flex-wrap items-center gap-1 rounded-lg border bg-card p-0.5">
            <span className="px-1.5 text-[11px] text-muted-foreground">
                show
            </span>
            {ALL_KINDS.map((k) => (
                <button
                    key={k}
                    type="button"
                    onClick={() => onChange(k)}
                    className={cn(
                        'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                        active.has(k)
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-accent'
                    )}
                >
                    {KIND_LABELS[k]}
                </button>
            ))}
        </div>
    );
}

// --- item card ---

function UpcomingItemCard({ item }: { item: UpcomingItem }) {
    const status = dueStatus(item.dueDate, TODAY);
    const n = daysUntil(item.dueDate, TODAY);

    return (
        <div className={cn('rounded-md border p-2.5', statusRowClass(status))}>
            <div className="flex items-start justify-between gap-2">
                <span className="text-[13px] font-semibold">{item.title}</span>
                <Badge
                    variant="secondary"
                    className="font-mono text-[10px]"
                >
                    {item.subjectLabel}
                </Badge>
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono text-[10px] text-muted-foreground">
                <span className={cn('font-medium', statusTextClass(status))}>
                    {item.dueDate} · {relativeDayLabel(n)}
                </span>
                <Badge
                    variant="outline"
                    className="text-[10px]"
                >
                    {KIND_LABELS[item.kind]}
                </Badge>
            </div>

            {item.note ? (
                <p className="mt-1 text-[11px] text-muted-foreground">
                    {item.note}
                </p>
            ) : null}
        </div>
    );
}

// --- section ---

function SectionPanel({
    section,
    items,
}: {
    section: Section;
    items: UpcomingItem[];
}) {
    const sorted = [...items].sort((a, b) =>
        a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0
    );

    return (
        <Card className="gap-0 py-0">
            <div className="flex items-baseline justify-between border-b bg-muted/50 px-3 py-2">
                <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                    {section.label}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                    {items.length}
                </span>
            </div>
            <div className="flex flex-col gap-2 p-2">
                {sorted.length === 0 ? (
                    <p className="px-1 py-4 text-center text-xs text-muted-foreground">
                        {section.emptyHint}
                    </p>
                ) : (
                    sorted.map((item) => (
                        <UpcomingItemCard
                            key={item.id}
                            item={item}
                        />
                    ))
                )}
            </div>
        </Card>
    );
}

// --- main export ---

export function UpcomingView({ initial }: { initial: UpcomingItem[] }) {
    const [activeKinds, setActiveKinds] = useState<Set<UpcomingItem['kind']>>(
        new Set(ALL_KINDS)
    );

    function toggleKind(k: UpcomingItem['kind']) {
        setActiveKinds((prev) => {
            const next = new Set(prev);
            if (next.has(k)) {
                // never collapse to empty — keep at least one kind active
                if (next.size > 1) next.delete(k);
            } else {
                next.add(k);
            }
            return next;
        });
    }

    const filtered = initial.filter((item) => activeKinds.has(item.kind));

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                    Dates are computed automatically from mating and birth
                    records — no manual entry.
                </p>
                <KindToggle
                    active={activeKinds}
                    onChange={toggleKind}
                />
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                {SECTIONS.map((section) => (
                    <SectionPanel
                        key={section.key}
                        section={section}
                        items={filtered.filter(
                            (item) =>
                                dueStatus(item.dueDate, TODAY) === section.key
                        )}
                    />
                ))}
            </div>
        </div>
    );
}
