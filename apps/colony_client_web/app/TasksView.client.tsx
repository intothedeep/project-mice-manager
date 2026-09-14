'use client';

import type { Role, CaseTaskStatus } from '@repo/types';
import { isOverdue } from '@repo/types';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { availableActions } from '@/lib/taskFlow';
import { taskSignalBg, taskSignalText } from '@/lib/signal';
import { useTasks, setTaskStatus } from '@/lib/mockStore';
import type { ClientCaseCard } from '@/apis/getTasks.mock.api';
import { NewTaskDialog } from './NewTaskDialog.client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const ROLES: { role: Role; label: string }[] = [
    { role: 'staff', label: 'Staff' },
    { role: 'professor', label: 'Professor' },
    { role: 'admin', label: 'Admin' },
];

const COLUMNS: { status: CaseTaskStatus; label: string; hint: string }[] = [
    { status: 'todo', label: 'Todo', hint: 'dropped by professor' },
    { status: 'doing', label: 'Doing', hint: 'staff started' },
    { status: 'done', label: 'Done', hint: 'staff completed' },
    { status: 'verified', label: 'Verified', hint: 'professor confirmed' },
    { status: 'cancelled', label: 'Cancelled', hint: 'withdrawn' },
];

// Derive today as a local ISO date (YYYY-MM-DD). Using Intl to avoid UTC
// midnight drift that toISOString() introduces near midnight.
function localToday(): string {
    return new Intl.DateTimeFormat('en-CA').format(new Date());
}

export function TasksView() {
    const tasks = useTasks();
    const [role, setRole] = useState<Role>('staff');
    const [creating, setCreating] = useState(false);
    const today = localToday();

    // act uses the case id (c.id) — each card represents one case.
    function act(c: ClientCaseCard, to: CaseTaskStatus) {
        setTaskStatus(c.id, to, role);
    }

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                    Anyone can add a task; staff start + mark done, the
                    professor verifies. Advance buttons enable by role.
                </p>
                <div className="flex items-center gap-2">
                    <RoleSwitch
                        role={role}
                        onChange={setRole}
                    />
                    <Button
                        size="sm"
                        onClick={() => setCreating(true)}
                    >
                        <Plus className="size-3.5" /> New task
                    </Button>
                </div>
            </div>

            <NewTaskDialog
                open={creating}
                onClose={() => setCreating(false)}
            />

            <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
                {COLUMNS.map((col) => {
                    const items = tasks.filter((t) => t.status === col.status);
                    return (
                        <Card
                            key={col.status}
                            className="gap-0 py-0"
                        >
                            <div className="flex items-baseline justify-between border-b bg-muted/50 px-3 py-2">
                                <span className="flex items-center gap-1.5">
                                    <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                                        {col.label}
                                    </span>
                                    <StatusDot status={col.status} />
                                </span>
                                <span className="font-mono text-[10px] text-muted-foreground">
                                    {items.length}
                                </span>
                            </div>
                            <div className="flex min-h-[62vh] flex-col gap-2 p-2">
                                {items.length === 0 ? (
                                    <p className="px-1 py-4 text-center text-xs text-muted-foreground">
                                        {col.hint}
                                    </p>
                                ) : (
                                    items.map((c) => (
                                        <TaskItem
                                            key={c.id}
                                            task={c}
                                            role={role}
                                            today={today}
                                            onAct={act}
                                        />
                                    ))
                                )}
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}

// Small colour dot in the column header — quick visual index per state.
// Uses existing CSS variables: no new palette introduced.
function StatusDot({ status }: { status: CaseTaskStatus }) {
    const cls =
        status === 'todo'
            ? 'bg-muted-foreground/40'
            : status === 'doing'
              ? 'bg-primary'
              : status === 'done'
                ? 'bg-muted-foreground/60'
                : status === 'verified'
                  ? 'bg-signal-plan'
                  : 'bg-muted-foreground/20'; // cancelled
    return <span className={cn('inline-block size-1.5 rounded-full', cls)} />;
}

function RoleSwitch({
    role,
    onChange,
}: {
    role: Role;
    onChange: (r: Role) => void;
}) {
    return (
        <div className="inline-flex items-center gap-1 rounded-lg border bg-card p-0.5">
            <span className="px-1.5 text-[11px] text-muted-foreground">
                acting as
            </span>
            {ROLES.map((r) => (
                <button
                    key={r.role}
                    type="button"
                    onClick={() => onChange(r.role)}
                    className={cn(
                        'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                        role === r.role
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-accent'
                    )}
                >
                    {r.label}
                </button>
            ))}
        </div>
    );
}

// Status badge rendered on each card — small pill indicating lifecycle state.
function StatusBadge({ status }: { status: CaseTaskStatus }) {
    const [label, cls] =
        status === 'todo'
            ? ['todo', 'border-border text-muted-foreground']
            : status === 'doing'
              ? [
                    'doing',
                    'border-primary bg-primary text-primary-foreground',
                ]
              : status === 'done'
                ? ['done', 'border-border bg-muted text-muted-foreground']
                : status === 'verified'
                  ? [
                        'verified',
                        'border-signal-plan bg-signal-plan/10 text-signal-plan',
                    ]
                  : ['cancelled', 'border-border/40 text-muted-foreground/40']; // cancelled

    return (
        <span
            className={cn(
                'inline-block rounded-none border px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wide',
                cls
            )}
        >
            {label}
        </span>
    );
}

function TaskItem({
    task,
    role,
    today,
    onAct,
}: {
    task: ClientCaseCard;
    role: Role;
    today: string;
    onAct: (c: ClientCaseCard, to: CaseTaskStatus) => void;
}) {
    const actions = availableActions(role, task.status);
    const overdue = isOverdue(task, today);
    const cancelled = task.status === 'cancelled';

    return (
        <div
            className={cn(
                'border p-2.5',
                taskSignalBg(task.signal),
                // Overdue: coral-red thick border overrides the signal thin border.
                // Uses --signal-instruction (#d40000) — consistent with the existing
                // overdue text treatment and the overcrowding red in the grid.
                overdue
                    ? 'border-2 border-signal-instruction'
                    : 'border',
                cancelled && 'opacity-50'
            )}
        >
            <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
                <span className="flex min-w-0 items-baseline gap-2">
                    <span
                        className={cn(
                            'truncate text-[13px] font-semibold',
                            cancelled && 'line-through'
                        )}
                    >
                        {task.caseType}
                    </span>
                    <span
                        className={cn(
                            'shrink-0 text-[10px] font-medium',
                            taskSignalText(task.signal)
                        )}
                    >
                        {task.signal}
                    </span>
                </span>
                <div className="flex shrink-0 items-center gap-1.5">
                    <StatusBadge status={task.status} />
                    {task.subjectLabel ? (
                        <Badge
                            variant="secondary"
                            className="font-mono text-[10px]"
                        >
                            {task.subjectLabel}
                        </Badge>
                    ) : (
                        <Badge
                            variant="outline"
                            className="text-[10px] text-muted-foreground"
                        >
                            {task.subjectKind ?? 'slot'}
                        </Badge>
                    )}
                </div>
            </div>

            {task.detail ? (
                <p className="mt-1 text-[11px] text-muted-foreground">
                    {task.detail}
                </p>
            ) : null}

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono text-[10px] text-muted-foreground">
                <span>created {task.createdAt}</span>
                {task.dueDate ? (
                    <span
                        className={cn(
                            overdue && 'font-semibold text-signal-instruction'
                        )}
                    >
                        due {task.dueDate}
                        {overdue ? ' · overdue' : ''}
                    </span>
                ) : null}
                {task.assignee ? <span>→ {task.assignee}</span> : null}
                {task.doneBy ? <span>done: {task.doneBy}</span> : null}
                {task.verifiedBy ? <span>✓ {task.verifiedBy}</span> : null}
            </div>

            {actions.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                    {actions.map((a) => (
                        <Button
                            key={a.to}
                            size="xs"
                            variant={a.primary ? 'default' : 'outline'}
                            onClick={() => onAct(task, a.to)}
                        >
                            {a.label}
                        </Button>
                    ))}
                </div>
            ) : (
                <p className="mt-2 text-[10px] text-muted-foreground italic">
                    no action for {role} here
                </p>
            )}
        </div>
    );
}
