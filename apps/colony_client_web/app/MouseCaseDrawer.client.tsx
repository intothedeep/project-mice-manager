'use client';

import type { Role, SignalColor, CaseTaskStatus } from '@repo/types';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useTasks, setTaskStatus } from '@/lib/mockStore';
import { availableActions } from '@/lib/taskFlow';
import { taskSignalBg, taskSignalText, signalColorOf } from '@/lib/signal';
import { StatusBadge, RoleSwitch } from '@/components/task-status';
import { CaseTimeline } from './CaseTimeline.client';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ClientCaseCard } from '@/apis/getTasks.mock.api';

// CaseDrawerTarget — identifies which mouse's cases to show and how to focus.
// metaId is the stable DB identity; label is the renderedId for display only.
// signal (focus mode) must be a SignalColor so it matches the badge the user clicked.
export type CaseDrawerTarget =
    | { kind: 'list'; metaId: number; label: string }
    | { kind: 'focus'; metaId: number; label: string; signal: SignalColor };

export function MouseCaseDrawer({
    target,
    onClose,
}: {
    target: CaseDrawerTarget | null;
    onClose: () => void;
}) {
    const allCases = useTasks();
    const [role, setRole] = useState<Role>('staff');
    const [expandedCaseId, setExpandedCaseId] = useState<number | null>(null);
    // Track which target was last resolved so focus resolution only fires once
    // per target object change — not on every store write that updates activeCases.
    const resolvedTargetRef = useRef<CaseDrawerTarget | null>(null);
    // focusMiss: set at resolution time, not derived live — prevents the "no open
    // case matches" banner from re-appearing after the focused case advances past doing.
    const [focusMiss, setFocusMiss] = useState(false);

    // Filter cases for this mouse by metaId (not by label string).
    // Covers both:
    //   - single-subject cases: c.subjectMouseId === target.metaId
    //   - batch cases: c.mice?.includes(target.metaId)
    // This is the F5AYL fix: metaId 102 (pNf1 slot A8) and 402 (PlpCre slot B8)
    // share the same renderedId but have DIFFERENT cases — keying by metaId
    // ensures each mouse sees only its own cases.
    const mouseCases = useMemo(() => {
        if (!target) return [];
        return allCases.filter(
            (c) =>
                c.subjectMouseId === target.metaId ||
                c.mice?.includes(target.metaId)
        );
    }, [allCases, target]);

    const activeCases = useMemo(
        () => mouseCases.filter((c) => c.status !== 'cancelled'),
        [mouseCases]
    );
    const historyCases = useMemo(
        () => mouseCases.filter((c) => c.status === 'cancelled'),
        [mouseCases]
    );

    // R2 focus resolution: fires once per target change (not per store emit).
    // Each badge click produces a fresh object, so clicking the same badge again
    // re-resolves correctly. requestAnimationFrame defers scroll until after
    // Radix's sheet mount animation completes.
    useEffect(() => {
        // Same reference = store wrote but target did not change — skip resolution.
        if (target === resolvedTargetRef.current) return;
        resolvedTargetRef.current = target;

        if (!target || target.kind !== 'focus') {
            setExpandedCaseId(null);
            setFocusMiss(false);
            return;
        }

        const { signal } = target;
        // Match by SignalColor: find an open case whose signal maps to the same
        // SignalColor as the badge that was clicked.
        const match = activeCases.find(
            (c) =>
                signalColorOf(c.signal) === signal &&
                (c.status === 'todo' || c.status === 'doing')
        );
        if (match) {
            setExpandedCaseId(match.id);
            setFocusMiss(false);
            requestAnimationFrame(() => {
                document
                    .getElementById(`case-${match.id}`)
                    ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            });
        } else {
            setExpandedCaseId(null);
            setFocusMiss(true);
        }
    }, [target, activeCases]);

    function handleClose() {
        setExpandedCaseId(null);
        setFocusMiss(false);
        onClose();
    }

    return (
        <Sheet
            open={target != null}
            onOpenChange={(o) => !o && handleClose()}
        >
            <SheetContent>
                {target ? (
                    <>
                        <SheetHeader>
                            <SheetTitle className="flex items-center gap-2">
                                <span className="font-mono">
                                    {target.label}
                                </span>
                                <span className="text-xs text-muted-foreground font-normal">
                                    cases
                                </span>
                            </SheetTitle>
                            <div className="pt-1">
                                <RoleSwitch role={role} onChange={setRole} />
                            </div>
                        </SheetHeader>

                        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
                            {focusMiss ? (
                                <p className="text-xs text-muted-foreground italic">
                                    no open case matches this tag
                                </p>
                            ) : null}

                            {mouseCases.length === 0 ? (
                                <p className="text-xs text-muted-foreground italic">
                                    no cases for this mouse
                                </p>
                            ) : (
                                <>
                                    {activeCases.length > 0 ? (
                                        <CaseGroup
                                            label="Active"
                                            cases={activeCases}
                                            role={role}
                                            expandedCaseId={expandedCaseId}
                                            onToggle={(id) =>
                                                setExpandedCaseId((prev) =>
                                                    prev === id ? null : id
                                                )
                                            }
                                            onAction={(caseId, to) =>
                                                setTaskStatus(caseId, to, role)
                                            }
                                        />
                                    ) : null}

                                    {historyCases.length > 0 ? (
                                        <CaseGroup
                                            label="History"
                                            cases={historyCases}
                                            role={role}
                                            expandedCaseId={expandedCaseId}
                                            onToggle={(id) =>
                                                setExpandedCaseId((prev) =>
                                                    prev === id ? null : id
                                                )
                                            }
                                            onAction={(caseId, to) =>
                                                setTaskStatus(caseId, to, role)
                                            }
                                        />
                                    ) : null}
                                </>
                            )}
                        </div>

                        <div className="border-t px-5 py-3">
                            <Link
                                href="/tasks"
                                className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                            >
                                open in Tasks
                            </Link>
                        </div>
                    </>
                ) : null}
            </SheetContent>
        </Sheet>
    );
}

function CaseGroup({
    label,
    cases,
    role,
    expandedCaseId,
    onToggle,
    onAction,
}: {
    label: string;
    cases: ClientCaseCard[];
    role: Role;
    expandedCaseId: number | null;
    onToggle: (id: number) => void;
    onAction: (caseId: number, to: CaseTaskStatus) => void;
}) {
    return (
        <section>
            <h3 className="mb-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                {label}
            </h3>
            <div className="space-y-1">
                {cases.map((c) => (
                    <CaseItem
                        key={c.id}
                        c={c}
                        role={role}
                        expanded={expandedCaseId === c.id}
                        onToggle={() => onToggle(c.id)}
                        onAction={(to) => onAction(c.id, to)}
                    />
                ))}
            </div>
        </section>
    );
}

function CaseItem({
    c,
    role,
    expanded,
    onToggle,
    onAction,
}: {
    c: ClientCaseCard;
    role: Role;
    expanded: boolean;
    onToggle: () => void;
    onAction: (to: CaseTaskStatus) => void;
}) {
    const actions = availableActions(role, c.status);

    return (
        <div
            id={`case-${c.id}`}
            className={cn('border', taskSignalBg(c.signal))}
        >
            <button
                type="button"
                onClick={onToggle}
                className="flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left"
            >
                <span className="flex min-w-0 items-baseline gap-2">
                    <span className="truncate text-[13px] font-semibold">
                        {c.caseType}
                    </span>
                    <span
                        className={cn(
                            'shrink-0 text-[10px] font-medium',
                            taskSignalText(c.signal)
                        )}
                    >
                        {c.signal}
                    </span>
                </span>
                <span className="shrink-0">
                    <StatusBadge status={c.status} />
                </span>
            </button>

            {expanded ? (
                <div className="border-t px-2.5 py-2 space-y-3">
                    {c.detail ? (
                        <p className="text-[11px] text-muted-foreground">
                            {c.detail}
                        </p>
                    ) : null}

                    <CaseTimeline caseId={c.id} />

                    {actions.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                            {actions.map((a) => (
                                <Button
                                    key={a.to}
                                    size="xs"
                                    variant={a.primary ? 'default' : 'outline'}
                                    onClick={() => onAction(a.to)}
                                >
                                    {a.label}
                                </Button>
                            ))}
                        </div>
                    ) : (
                        <p className="text-[10px] text-muted-foreground italic">
                            no action for {role} here
                        </p>
                    )}
                </div>
            ) : null}
        </div>
    );
}
