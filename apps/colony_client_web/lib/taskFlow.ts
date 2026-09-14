import type { Role, CaseTaskStatus } from '@repo/types';

// Pure task-transition rules. Lives here for the prototype; moves to
// @repo/domain once the SERVICE layer also enforces it (the DB does not — it
// is a service rule). The service will call the SAME function shape.
//
// 5-value lifecycle matrix (0021):
//   staff:     todo → doing ("Start") only — staff must NOT mark done
//              (user directive 2026-09-13); done/verified/cancel are professor's.
//   professor: doing → done | done → verified | reopen (→todo) any active/done
//              | cancel (todo/doing/done)
//   admin:     any → any
const ALLOWED: Record<
    'staff' | 'professor',
    Array<[CaseTaskStatus, CaseTaskStatus]>
> = {
    staff: [
        ['todo', 'doing'],  // start work only — no doing→done for staff
    ],
    professor: [
        ['doing', 'done'],      // professor can also mark done directly
        ['done', 'verified'],
        ['doing', 'todo'],      // reopen back to todo
        ['done', 'todo'],       // reopen
        ['verified', 'todo'],   // reopen a verified task
        ['todo', 'cancelled'],
        ['doing', 'cancelled'],
        ['done', 'cancelled'],
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
