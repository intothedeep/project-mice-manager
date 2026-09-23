'use client';

import type { Role, CaseTaskStatus } from '@repo/types';
import { isOverdue } from '@repo/types';
import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { availableActions } from '@/lib/taskFlow';
import { TODAY } from '@/lib/dueDates';
import { taskSignalBg, taskSignalText } from '@/lib/signal';
import { useTasks, setTaskStatus } from '@/lib/mockStore';
import { formatDate } from '@/lib/dueDates';
import type { ClientCaseCard } from '@/apis/getTasks.mock.api';
import { buildReclipIndex, composeMouseLabel } from '@/lib/mouseLabel';
import { CaseTimeline } from './CaseTimeline.client';
import { NewTaskDialog } from './NewTaskDialog.client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { StatusDot, StatusBadge, RoleSwitch } from '@/components/task-status';

const COLUMNS: { status: CaseTaskStatus; label: string; hint: string }[] = [
    { status: 'todo', label: 'Todo', hint: 'dropped by professor' },
    { status: 'doing', label: 'Doing', hint: 'staff started' },
    { status: 'done', label: 'Done', hint: 'staff completed' },
    { status: 'verified', label: 'Verified', hint: 'professor confirmed' },
    { status: 'cancelled', label: 'Cancelled', hint: 'withdrawn' },
];

export function TasksView() {
    const tasks = useTasks();
    const [role, setRole] = useState<Role>('staff');
    const [creating, setCreating] = useState(false);
    // Pinned, not the real clock — see lib/colors.ts lifeStage for why a mock
    // whose display depends on when you open it cannot be checked.
    const today = TODAY;

    // Reclip index (T5): same helper as grid — one pass over all cases.
    const reclipIndex = useMemo(() => buildReclipIndex(tasks), [tasks]);

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
                                            reclipIndex={reclipIndex}
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

function TaskItem({
    task,
    role,
    today,
    reclipIndex,
    onAct,
}: {
    task: ClientCaseCard;
    role: Role;
    today: string;
    reclipIndex: Map<number, number>;
    onAct: (c: ClientCaseCard, to: CaseTaskStatus) => void;
}) {
    const actions = availableActions(role, task.status);
    const overdue = isOverdue(task, today);
    const cancelled = task.status === 'cancelled';

    // Compose the subject label with the reclip suffix when the case targets
    // a single mouse (subjectKind='mouse'). Batch/litter/cage labels stay as-is.
    const displaySubjectLabel = task.subjectLabel
        ? task.subjectMouseId != null
            ? composeMouseLabel(
                  task.subjectLabel,
                  reclipIndex.get(task.subjectMouseId) ?? 0
              )
            : task.subjectLabel
        : null;

    return (
        <div
            className={cn(
                'border p-2.5',
                taskSignalBg(task.signal),
                // Overdue: coral-red thick border overrides the signal thin border.
                // Uses --signal-instruction (#d40000) — consistent with the existing
                // overdue text treatment and the overcrowding red in the grid.
                overdue ? 'border-2 border-signal-instruction' : 'border',
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
                    {displaySubjectLabel ? (
                        <Badge
                            variant="secondary"
                            className="font-mono text-[10px]"
                        >
                            {displaySubjectLabel}
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
                {task.dueDate ? (
                    <span
                        className={cn(
                            overdue && 'font-semibold text-signal-instruction'
                        )}
                    >
                        due {formatDate(task.dueDate)}
                        {overdue ? ' · overdue' : ''}
                    </span>
                ) : null}
                {task.assignee ? <span>→ {task.assignee}</span> : null}
            </div>

            {/* append-only log — each step: date · actor · status (user) */}
            <div className="mt-2">
                <CaseTimeline caseId={task.id} />
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
