'use client';

import type { ColonyGrid, MouseCell, Role } from '@repo/types';
import { useState } from 'react';
import { signalIdClass } from '@/lib/signal';
import { useTasks, useTaskLog } from '@/lib/mockStore';
import { useColonyGrid } from '@/lib/mockColonyStore';
import { buildReclipIndex, composeMouseLabel } from '@/lib/mouseLabel';
import { mouseLabelOf } from '@/lib/mouseIdentity';
import { RoleSwitch } from '@/components/task-status';
import { CaseList } from './CaseList.client';
import { IdentitySection } from './IdentitySection.client';
import { PunchSection } from './PunchSection.client';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// metaId -> MouseCell over the whole colony. `selected.mouse` is a snapshot
// captured at click-time by ColonyGridView, so it goes stale the moment the
// drawer itself writes a patch (e.g. sex) via the store — look the live cell
// up fresh on every render instead of trusting the snapshot for anything that
// can change while the drawer stays open.
function findMouseByMetaId(
    colony: ColonyGrid,
    metaId: number
): MouseCell | undefined {
    for (const l of colony.lines)
        for (const c of l.cages)
            for (const s of c.slots)
                for (const m of s.mice) if (m.metaId === metaId) return m;
    return undefined;
}

export interface SelectedMouse {
    mouse: MouseCell;
    lineName: string;
    cageNumber: string;
    slotLabel: string;
}

// Store-driven: the drawer reflects the SAME live data as the dashboard grid —
// identity from the MouseCell, cases + append-only history from the case store
// (useTasks / useTaskLog). There is no separate mock-detail fetch; the drawer
// reads only from the live colony/case stores.
export function MouseDetailDrawer({
    selected,
    onClose,
    resolveParentLabel,
}: {
    selected: SelectedMouse | null;
    onClose: () => void;
    // Resolves an in-grid ParentCell's label from its own MouseCell (plan §5
    // Q46 option C) — same resolver ColonyGridView hands to ParentRow. null =
    // the parent's metaId has no row in this payload (not-found fallback).
    resolveParentLabel: (metaId: number) => string | null;
}) {
    const cases = useTasks();
    const taskLog = useTaskLog();
    const colony = useColonyGrid();
    const [role, setRole] = useState<Role>('staff');
    const [expandedCaseId, setExpandedCaseId] = useState<number | null>(null);

    // Not-found fallback (e.g. mid-transition) keeps the stale snapshot rather
    // than crashing. Editing still WORKS on that path: Save calls updateMouse,
    // which returns {ok:false} for an unknown metaId, and IdentitySection shows
    // the error instead of writing anything.
    const m = selected
        ? (findMouseByMetaId(colony, selected.mouse.metaId) ?? selected.mouse)
        : undefined;
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
              mouseLabelOf(m),
              buildReclipIndex(cases).get(metaId) ?? 0
          )
        : '';

    function handleClose() {
        setExpandedCaseId(null);
        onClose();
    }

    return (
        <Sheet
            open={selected != null}
            onOpenChange={(o) => !o && handleClose()}
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

                            <IdentitySection
                                key={`identity-${metaId}`}
                                mouse={m}
                                reclipCount={
                                    buildReclipIndex(cases).get(metaId) ?? 0
                                }
                            />

                            <PunchSection
                                key={`punch-${metaId}`}
                                mouse={m}
                            />

                            {m.parents &&
                            (m.parents.father || m.parents.mother) ? (
                                <Section label="Parents">
                                    <ul className="space-y-1">
                                        {(['mother', 'father'] as const).map(
                                            (parentRole) => {
                                                const p =
                                                    m.parents?.[parentRole];
                                                if (!p) return null;
                                                // plan §5 Q46 option C: in-grid
                                                // parent -> resolve + compose its
                                                // own MouseCell; outside parent ->
                                                // its snapshot string.
                                                const pLabel =
                                                    p.metaId == null
                                                        ? p.snapshotLabel
                                                        : (resolveParentLabel(
                                                              p.metaId
                                                          ) ?? '(unresolved)');
                                                return (
                                                    <li
                                                        key={parentRole}
                                                        className="flex items-baseline gap-2 text-sm"
                                                    >
                                                        <span className="w-14 shrink-0 text-xs text-muted-foreground">
                                                            {parentRole}
                                                        </span>
                                                        <span className="font-mono">
                                                            {pLabel}
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
                                <div className="pt-1 pb-2">
                                    <RoleSwitch
                                        role={role}
                                        onChange={setRole}
                                    />
                                </div>
                                {mouseCases.length > 0 ? (
                                    <div className="space-y-5">
                                        <CaseList
                                            cases={mouseCases}
                                            role={role}
                                            expandedCaseId={expandedCaseId}
                                            onToggle={(id) =>
                                                setExpandedCaseId((prev) =>
                                                    prev === id ? null : id
                                                )
                                            }
                                        />
                                    </div>
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
                                                        {c?.caseType ?? 'case'}{' '}
                                                        → {h.status}
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

function Muted({ children }: { children: React.ReactNode }) {
    return <p className="text-xs text-muted-foreground italic">{children}</p>;
}
