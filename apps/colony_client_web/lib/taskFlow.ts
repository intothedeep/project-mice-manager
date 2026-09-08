import type { Role, TaskStatus } from '@repo/types';

// Pure task-transition rules. Lives here for the prototype; moves to
// @repo/domain once the SERVICE layer also enforces it (the DB does not — it
// is a service rule). The service will call the SAME function shape.
//
// Default matrix (TBD-with-professor, from the plan):
//   staff:     open → done
//   professor: done → verified | reopen(→open) | cancel; open → cancel
//   admin:     any → any
const ALLOWED: Record<
    'staff' | 'professor',
    Array<[TaskStatus, TaskStatus]>
> = {
    staff: [['open', 'done']],
    professor: [
        ['done', 'verified'],
        ['done', 'open'], // reopen
        ['verified', 'open'], // reopen a verified task
        ['open', 'cancelled'],
        ['done', 'cancelled'],
    ],
};

export function canTransition(
    role: Role,
    from: TaskStatus,
    to: TaskStatus
): boolean {
    if (from === to) return false;
    if (role === 'admin') return true;
    return ALLOWED[role].some(([f, t]) => f === from && t === to);
}

export interface TaskAction {
    to: TaskStatus;
    label: string;
    primary: boolean;
}

const ACTIONS: TaskAction[] = [
    { to: 'done', label: 'Mark done', primary: true },
    { to: 'verified', label: 'Verify', primary: true },
    { to: 'open', label: 'Reopen', primary: false },
    { to: 'cancelled', label: 'Cancel', primary: false },
];

// The actions a given role may take from a given status — drives the buttons.
export function availableActions(role: Role, from: TaskStatus): TaskAction[] {
    return ACTIONS.filter((a) => canTransition(role, from, a.to));
}
