'use client';

import type { Role, CaseTaskStatus } from '@repo/types';
import { useTaskLog } from '@/lib/mockStore';
import { availableActions } from '@/lib/taskFlow';
import { taskSignalBg, taskSignalText } from '@/lib/signal';
import { StatusBadge } from '@/components/task-status';
import { CaseTimeline } from './CaseTimeline.client';
import { useCaseAdvance } from './useCaseAdvance';
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

    // A status change can be REFUSED — a Move case cannot reach `done` while
    // the mouse is in the wrong cage (mockStore.pendingMoveFor) — and a Move
    // case needs the slot picker before it can be done at all. Both live in
    // the hook, shared with the Tasks board.
    const { advance, error, moveDialog } = useCaseAdvance(role);

    return (
        <>
            {moveDialog}
            {error ? (
                <p className="text-xs font-medium text-signal-instruction">
                    {error}
                </p>
            ) : null}
            {activeCases.length > 0 ? (
                <CaseGroup
                    label="Active"
                    cases={activeCases}
                    role={role}
                    expandedCaseId={expandedCaseId}
                    onToggle={onToggle}
                    onAction={advance}
                />
            ) : null}

            {historyCases.length > 0 ? (
                <CaseGroup
                    label="History"
                    cases={historyCases}
                    role={role}
                    expandedCaseId={expandedCaseId}
                    onToggle={onToggle}
                    onAction={advance}
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

// Per-status accountability: WHO did each lifecycle step (from the append-only
// task log) + the case assignee. Surfaces "assigned to A but B worked on it" —
// the todo row shows creator → assignee; each later status shows its actor.
const RESP_ORDER: CaseTaskStatus[] = [
    'todo',
    'doing',
    'done',
    'verified',
    'cancelled',
];
function CaseResponsibility({
    caseId,
    assignee,
}: {
    caseId: number;
    assignee: string | null;
}) {
    // Latest actor per status (last log row of that status wins).
    const actor = new Map<CaseTaskStatus, string>();
    useTaskLog()
        .filter((t) => t.caseId === caseId)
        .slice()
        .sort((a, b) => a.id - b.id)
        .forEach((t) => actor.set(t.status, t.actor));

    const rows = RESP_ORDER.filter((s) => actor.has(s));
    if (rows.length === 0) return null;

    return (
        <div className="space-y-0.5 text-[11px]">
            {rows.map((s) => (
                <div
                    key={s}
                    className="flex items-baseline gap-2"
                >
                    <span className="w-16 shrink-0 tracking-wide text-muted-foreground uppercase">
                        {s}
                    </span>
                    <span className="font-medium">
                        {s === 'todo' && assignee
                            ? `${actor.get(s)} → ${assignee}`
                            : actor.get(s)}
                    </span>
                </div>
            ))}
        </div>
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

                    <CaseResponsibility
                        caseId={c.id}
                        assignee={c.assignee}
                    />

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
