import type { Role, CaseTaskStatus } from '@repo/types';

// Pure task-transition rules. Lives here for the prototype; moves to
// @repo/domain once the SERVICE layer also enforces it (the DB does not — it
// is a service rule). The service will call the SAME function shape.
//
// 5-value lifecycle matrix (user 2026-09-14 — REVISES 2026-09-13):
//   staff:     todo→doing (Start), doing→done (complete)
//   professor: todo→doing, doing→done, done→verified
//   admin:     any→any — REOPEN (→todo) and CANCEL are ADMIN-ONLY
const ALLOWED: Record<
    'staff' | 'professor',
    Array<[CaseTaskStatus, CaseTaskStatus]>
> = {
    staff: [
        ['todo', 'doing'], // start work
        ['doing', 'done'], // complete
    ],
    professor: [
        ['todo', 'doing'],
        ['doing', 'done'],
        ['done', 'verified'],
    ],
};

export function canTransition(
    role: Role,
    from: CaseTaskStatus,
    to: CaseTaskStatus
): boolean {
    if (from === to) return false;
    if (role === 'admin') return true;
    return ALLOWED[role].some(([f, t]) => f === from && t === to);
}

export interface TaskAction {
    to: CaseTaskStatus;
    label: string;
    primary: boolean;
}

const ACTIONS: TaskAction[] = [
    { to: 'doing', label: 'Start', primary: true },
    { to: 'done', label: 'Mark done', primary: true },
    { to: 'verified', label: 'Verify', primary: true },
    { to: 'todo', label: 'Reopen', primary: false },
    { to: 'cancelled', label: 'Cancel', primary: false },
];

// The actions a given role may take from a given status — drives the buttons.
export function availableActions(role: Role, from: CaseTaskStatus): TaskAction[] {
    return ACTIONS.filter((a) => canTransition(role, from, a.to));
}
