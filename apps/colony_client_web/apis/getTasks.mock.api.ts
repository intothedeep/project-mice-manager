import type { TaskCard, CaseTaskStatus } from '@repo/types';

// Mock fetcher for the Task bin. Named as the future real fetcher so the
// mock→real swap is one file. Tasks reference the same mice/cages as the grid
// fixture so the two screens tell one coherent story.

// Local bridge type: same shape as TaskCard but with the new 5-value lifecycle.
// Cannot edit @repo/types (other wave owns it) — this keeps the UI decoupled.
export type ClientTaskCard = Omit<TaskCard, 'status'> & {
    status: CaseTaskStatus;
};

const TASKS: ClientTaskCard[] = [
    {
        id: 1,
        taskType: 'Genotype',
        signal: 'instruction',
        status: 'todo',
        subjectKind: 'mouse',
        subjectLabel: 'M4BCW.2',
        detail: 're-clip (.2) — re-run PCR',
        dueDate: '2026-09-10',  // past → overdue border
        createdAt: '2026-09-03',
        assignee: 'Jia',
        doneBy: null,
        verifiedBy: null,
    },
    {
        id: 2,
        taskType: 'Check food',
        signal: 'note',
        status: 'todo',
        subjectKind: 'slot',
        subjectLabel: null,
        detail: 'Rack B — whole rack',
        dueDate: '2026-09-20',  // future → no overdue border
        createdAt: '2026-09-03',
        assignee: 'Lab (all)',
        doneBy: null,
        verifiedBy: null,
    },
    {
        id: 3,
        taskType: 'Set up mating',
        signal: 'plan',
        status: 'doing',  // NEW: in-progress state
        subjectKind: 'mouse',
        subjectLabel: 'F5AYL',
        detail: 'pair with M4BCW.2',
        dueDate: '2026-09-15',  // future → overdue only when past
        createdAt: '2026-09-03',
        assignee: 'Sam',
        doneBy: null,
        verifiedBy: null,
    },
    {
        id: 4,
        taskType: 'Move',
        signal: 'instruction',
        status: 'doing',  // another doing — past due → overdue
        subjectKind: 'mouse',
        subjectLabel: 'M4BCW',
        detail: 'cage 2413 → 2414',
        dueDate: '2026-09-07',  // past + doing → overdue
        createdAt: '2026-09-03',
        assignee: 'Jia',
        doneBy: null,
        verifiedBy: null,
    },
    {
        id: 5,
        taskType: 'Wean',
        signal: 'plan',
        status: 'done',
        subjectKind: 'litter',
        subjectLabel: 'litter BCX',
        detail: '2 pups → new cage',
        dueDate: '2026-09-06',
        createdAt: '2026-09-03',
        assignee: 'Sam',
        doneBy: 'Sam',
        verifiedBy: null,
    },
    {
        id: 6,
        taskType: 'Sac',
        signal: 'instruction',
        status: 'verified',
        subjectKind: 'mouse',
        subjectLabel: 'F5BGX',
        detail: 'endpoint reached',
        dueDate: '2026-09-05',
        createdAt: '2026-09-03',
        assignee: 'Jia',
        doneBy: 'Jia',
        verifiedBy: 'Dr. Lopez-Juarez',
    },
    {
        id: 7,
        taskType: 'Genotype',
        signal: 'instruction',
        status: 'verified',
        subjectKind: 'cage',
        subjectLabel: 'cage 2414',
        detail: 'unsexed pups U3BCX, U4BCX',
        dueDate: '2026-09-04',
        createdAt: '2026-09-03',
        assignee: 'Sam',
        doneBy: 'Sam',
        verifiedBy: 'Dr. Lopez-Juarez',
    },
    {
        id: 8,
        taskType: 'Check food',
        signal: 'note',
        status: 'cancelled',  // side-exit state
        subjectKind: 'slot',
        subjectLabel: null,
        detail: 'Rack C — superseded by full rack audit',
        dueDate: '2026-09-01',
        createdAt: '2026-09-01',
        assignee: null,
        doneBy: null,
        verifiedBy: null,
    },
];

// Seed for the client store; the real fetcher will replace this.
export const SEED_TASKS = TASKS;

export async function getTasks(): Promise<ClientTaskCard[]> {
    return TASKS;
}
