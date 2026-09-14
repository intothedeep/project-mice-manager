'use client';

import type { MouseCell } from '@repo/types';
import { signalIdClass, dateColorOf } from '@/lib/signal';
import { useTasks, useTaskLog } from '@/lib/mockStore';
import { buildReclipIndex, composeMouseLabel } from '@/lib/mouseLabel';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface SelectedMouse {
    mouse: MouseCell;
    lineName: string;
    cageNumber: string;
    slotLabel: string;
}

// Store-driven: the drawer reflects the SAME live data as the dashboard grid —
// identity from the MouseCell, cases + append-only history from the case store
// (useTasks / useTaskLog). No separate getMouseDetail seed (which drifted).
export function MouseDetailDrawer({
    selected,
    onClose,
}: {
    selected: SelectedMouse | null;
    onClose: () => void;
}) {
    const cases = useTasks();
    const taskLog = useTaskLog();

    const m = selected?.mouse;
    const metaId = m?.metaId ?? -1;

    // This mouse's cases (single-subject or batch membership).
    const mouseCases = m
        ? cases.filter(
              (c) => c.subjectMouseId === metaId || c.mice?.includes(metaId)
          )
        : [];
    // Append-only history = the task-log rows of this mouse's cases, chronological.
    const caseIds = new Set(mouseCases.map((c) => c.id));
    const history = taskLog
        .filter((t) => caseIds.has(t.caseId))
        .slice()
        .sort((a, b) => a.id - b.id);
    // .N re-clip label (read-time derived, same as the grid).
    const label = m
        ? composeMouseLabel(
              m.renderedId,
              buildReclipIndex(cases).get(metaId) ?? 0
          )
        : '';

    return (
        <Sheet
            open={selected != null}
            onOpenChange={(o) => !o && onClose()}
        >
            <SheetContent>
                {selected && m ? (
                    <>
                        <SheetHeader>
                            <SheetTitle className="flex items-center gap-2">
                                <span
                                    className={cn(
                                        'font-mono',
                                        signalIdClass(m.signal)
                                    )}
                                >
                                    {label}
                                </span>
                                <Badge
                                    variant={
                                        m.isAlive ? 'secondary' : 'outline'
                                    }
                                    className="text-[10px]"
                                >
                                    {m.isAlive ? m.sex : 'dead'}
                                </Badge>
                            </SheetTitle>
                            <p className="font-mono text-xs text-muted-foreground">
                                {selected.lineName} › cage {selected.cageNumber}{' '}
                                › slot {selected.slotLabel}
                            </p>
                        </SheetHeader>

                        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
                            {m.attention ? (
                                <p
                                    className={cn(
                                        'rounded-md bg-muted px-3 py-2 text-xs',
                                        signalIdClass(m.signal)
                                    )}
                                >
                                    {m.attention}
                                </p>
                            ) : null}

                            <Section label="Identity">
                                <Field
                                    k="genotype"
                                    v={m.genotype}
                                />
                                <Field
                                    k="dob"
                                    v={m.dob ?? '—'}
                                />
                                <Field
                                    k="sex"
                                    v={m.isAlive ? m.sex : `${m.sex} (dead)`}
                                />
                            </Section>

                            {m.parents &&
                            (m.parents.father || m.parents.mother) ? (
                                <Section label="Parents">
                                    <ul className="space-y-1">
                                        {(['mother', 'father'] as const).map(
                                            (role) => {
                                                const p = m.parents?.[role];
                                                if (!p) return null;
                                                return (
                                                    <li
                                                        key={role}
                                                        className="flex items-baseline gap-2 text-sm"
                                                    >
                                                        <span className="w-14 shrink-0 text-xs text-muted-foreground">
                                                            {role}
                                                        </span>
                                                        <span className="font-mono">
                                                            {p.renderedId}
                                                        </span>
                                                        <span className="font-mono text-[11px] text-muted-foreground">
                                                            {p.genotype ?? ''}
                                                        </span>
                                                    </li>
                                                );
                                            }
                                        )}
                                    </ul>
                                </Section>
                            ) : null}

                            {m.mates.length > 0 ? (
                                <Section label="Mates">
                                    <ul className="space-y-1">
                                        {m.mates.map((mt, i) => (
                                            <li
                                                key={i}
                                                className="flex items-center gap-2 text-sm"
                                            >
                                                <span
                                                    className="inline-block size-2.5 rounded-sm"
                                                    style={{
                                                        background: mt.color,
                                                    }}
                                                />
                                                <span className="font-mono">
                                                    {mt.partnerId}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </Section>
                            ) : null}

                            <Section label="Cases">
                                {mouseCases.length > 0 ? (
                                    <ul className="space-y-1.5">
                                        {mouseCases.map((c) => (
                                            <li
                                                key={c.id}
                                                className="flex items-center gap-2 text-sm"
                                            >
                                                <span className="font-medium">
                                                    {c.caseType}
                                                </span>
                                                <Badge
                                                    variant="outline"
                                                    className="text-[10px]"
                                                >
                                                    {c.status}
                                                </Badge>
                                                {c.dueDate ? (
                                                    <span
                                                        className={cn(
                                                            'font-mono text-[11px]',
                                                            dateColorOf(
                                                                c.status,
                                                                c.signal
                                                            )
                                                        )}
                                                    >
                                                        {c.dueDate}
                                                    </span>
                                                ) : null}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <Muted>no cases</Muted>
                                )}
                            </Section>

                            <Section label="History — append-only">
                                {history.length > 0 ? (
                                    <ol className="relative space-y-3 border-l border-border pl-4">
                                        {history.map((h) => {
                                            const c = mouseCases.find(
                                                (x) => x.id === h.caseId
                                            );
                                            return (
                                                <li
                                                    key={h.id}
                                                    className="relative"
                                                >
                                                    <span className="absolute top-1 -left-[21px] size-2 rounded-full border border-background bg-primary/70" />
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="font-mono text-[11px] text-muted-foreground">
                                                            {h.createdAt}
                                                        </span>
                                                        <span className="text-[11px] text-muted-foreground">
                                                            {h.actor}
                                                        </span>
                                                    </div>
                                                    <p className="text-[13px]">
                                                        {c?.caseType ?? 'case'} →{' '}
                                                        {h.status}
                                                    </p>
                                                </li>
                                            );
                                        })}
                                    </ol>
                                ) : (
                                    <Muted>no activity</Muted>
                                )}
                            </Section>
                        </div>
                    </>
                ) : null}
            </SheetContent>
        </Sheet>
    );
}

function Section({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <section>
            <h3 className="mb-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                {label}
            </h3>
            {children}
        </section>
    );
}

function Field({ k, v }: { k: string; v: string }) {
    return (
        <div className="flex items-baseline gap-2 text-sm">
            <span className="w-14 shrink-0 text-xs text-muted-foreground">
                {k}
            </span>
            <span className="font-mono">{v}</span>
        </div>
    );
}

function Muted({ children }: { children: React.ReactNode }) {
    return <p className="text-xs text-muted-foreground italic">{children}</p>;
}
