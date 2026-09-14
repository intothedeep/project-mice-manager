'use client';

import type { Role, CaseTaskStatus } from '@repo/types';
import { setTaskStatus } from '@/lib/mockStore';
import { availableActions } from '@/lib/taskFlow';
import { taskSignalBg, taskSignalText } from '@/lib/signal';
import { StatusBadge } from '@/components/task-status';
import { CaseTimeline } from './CaseTimeline.client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ClientCaseCard } from '@/apis/getTasks.mock.api';

// Shared case-list accordion. Both MouseCaseDrawer and MouseDetailDrawer use
// this component so the two surfaces stay in lockstep.
//
// Expansion state is OWNED by the caller (MouseCaseDrawer needs to set it
// externally for its focus-resolution/scrollIntoView effect).
//
// Grouping: active (todo/doing/done/verified) above History (cancelled).
// Empty-state text is the caller's responsibility — CaseList only renders
// when cases.length > 0.
export function CaseList({
    cases,
    role,
    expandedCaseId,
    onToggle,
}: {
    cases: ClientCaseCard[];
    role: Role;
    expandedCaseId: number | null;
    onToggle: (id: number) => void;
}) {
    const activeCases = cases.filter((c) => c.status !== 'cancelled');
    const historyCases = cases.filter((c) => c.status === 'cancelled');

    function handleAction(caseId: number, to: CaseTaskStatus) {
        setTaskStatus(caseId, to, role);
    }

    return (
        <>
            {activeCases.length > 0 ? (
                <CaseGroup
                    label="Active"
                    cases={activeCases}
                    role={role}
                    expandedCaseId={expandedCaseId}
                    onToggle={onToggle}
                    onAction={handleAction}
                />
            ) : null}

            {historyCases.length > 0 ? (
                <CaseGroup
                    label="History"
                    cases={historyCases}
                    role={role}
                    expandedCaseId={expandedCaseId}
                    onToggle={onToggle}
                    onAction={handleAction}
                />
            ) : null}
        </>
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
        // id is required for focus-resolution scrollIntoView in MouseCaseDrawer.
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
