'use client';

import type { Role, TaskCard, TaskStatus } from '@repo/types';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { availableActions } from '@/lib/taskFlow';
import { useTasks, setTaskStatus } from '@/lib/mockStore';
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

const COLUMNS: { status: TaskStatus; label: string; hint: string }[] = [
    { status: 'open', label: 'Open', hint: 'dropped by professor' },
    { status: 'done', label: 'Done', hint: 'staff completed' },
    { status: 'verified', label: 'Verified', hint: 'professor confirmed' },
];

const TODAY = '2026-09-08';

export function TasksView() {
    const tasks = useTasks();
    const [role, setRole] = useState<Role>('staff');
    const [creating, setCreating] = useState(false);

    function act(task: TaskCard, to: TaskStatus) {
        setTaskStatus(task.id, to, role);
    }

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                    Anyone can add a task; staff mark done, the professor
                    verifies. Advance buttons enable by role.
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

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {COLUMNS.map((col) => {
                    const items = tasks.filter((t) => t.status === col.status);
                    return (
                        <Card
                            key={col.status}
                            className="gap-0 py-0"
                        >
                            <div className="flex items-baseline justify-between border-b bg-muted/50 px-3 py-2">
                                <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                                    {col.label}
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
                                    items.map((t) => (
                                        <TaskItem
                                            key={t.id}
                                            task={t}
                                            role={role}
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

function TaskItem({
    task,
    role,
    onAct,
}: {
    task: TaskCard;
    role: Role;
    onAct: (t: TaskCard, to: TaskStatus) => void;
}) {
    const actions = availableActions(role, task.status);
    const overdue = task.status === 'open' && task.dueDate! < TODAY;

    return (
        <div className="rounded-md border bg-background p-2.5">
            <div className="flex items-start justify-between gap-2">
                <span className="text-[13px] font-semibold">
                    {task.taskType}
                </span>
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
                        room
                    </Badge>
                )}
            </div>

            {task.detail ? (
                <p className="mt-1 text-[11px] text-muted-foreground">
                    {task.detail}
                </p>
            ) : null}

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono text-[10px] text-muted-foreground">
                {task.dueDate ? (
                    <span className={cn(overdue && 'text-signal-instruction')}>
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
