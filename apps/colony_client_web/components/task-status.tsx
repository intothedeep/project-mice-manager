'use client';

import type { Role, CaseTaskStatus } from '@repo/types';
import { cn } from '@/lib/utils';

const ROLES: { role: Role; label: string }[] = [
    { role: 'staff', label: 'Staff' },
    { role: 'professor', label: 'Professor' },
    { role: 'admin', label: 'Admin' },
];

// Small colour dot in the column header — quick visual index per state.
// Uses existing CSS variables: no new palette introduced.
export function StatusDot({ status }: { status: CaseTaskStatus }) {
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

export function RoleSwitch({
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
export function StatusBadge({ status }: { status: CaseTaskStatus }) {
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
