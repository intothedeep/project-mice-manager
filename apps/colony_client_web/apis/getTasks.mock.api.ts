import type { TaskCard } from '@repo/types';

// Mock fetcher for the Task bin. Named as the future real fetcher so the
// mock→real swap is one file. Tasks reference the same mice/cages as the grid
// fixture so the two screens tell one coherent story.

const TASKS: TaskCard[] = [
    {
        id: 1,
        taskType: 'Genotype',
        status: 'open',
        subjectKind: 'mouse',
        subjectLabel: 'M4BCW.2',
        detail: 're-clip (.2) — re-run PCR',
        dueDate: '2026-09-10',
        assignee: 'Jia',
        doneBy: null,
        verifiedBy: null,
    },
    {
        id: 2,
        taskType: 'Check food',
        status: 'open',
        subjectKind: 'room',
        subjectLabel: null,
        detail: 'Rack B — whole rack',
        dueDate: '2026-09-08',
        assignee: 'Lab (all)',
        doneBy: null,
        verifiedBy: null,
    },
    {
        id: 3,
        taskType: 'Set up mating',
        status: 'open',
        subjectKind: 'mouse',
        subjectLabel: 'F5AYL',
        detail: 'pair with M4BCW.2',
        dueDate: '2026-09-11',
        assignee: 'Sam',
        doneBy: null,
        verifiedBy: null,
    },
    {
        id: 4,
        taskType: 'Move',
        status: 'done',
        subjectKind: 'mouse',
        subjectLabel: 'M4BCW',
        detail: 'cage 2413 → 2414',
        dueDate: '2026-09-07',
        assignee: 'Jia',
        doneBy: 'Jia',
        verifiedBy: null,
    },
    {
        id: 5,
        taskType: 'Wean',
        status: 'done',
        subjectKind: 'litter',
        subjectLabel: 'litter BCX',
        detail: '2 pups → new cage',
        dueDate: '2026-09-06',
        assignee: 'Sam',
        doneBy: 'Sam',
        verifiedBy: null,
    },
    {
        id: 6,
        taskType: 'Sac',
        status: 'verified',
        subjectKind: 'mouse',
        subjectLabel: 'F5BGX',
        detail: 'endpoint reached',
        dueDate: '2026-09-05',
        assignee: 'Jia',
        doneBy: 'Jia',
        verifiedBy: 'Dr. Lopez-Juarez',
    },
    {
        id: 7,
        taskType: 'Genotype',
        status: 'verified',
        subjectKind: 'cage',
        subjectLabel: 'cage 2414',
        detail: 'unsexed pups U3BCX, U4BCX',
        dueDate: '2026-09-04',
        assignee: 'Sam',
        doneBy: 'Sam',
        verifiedBy: 'Dr. Lopez-Juarez',
    },
];

// Seed for the client store; the real fetcher will replace this.
export const SEED_TASKS = TASKS;

export async function getTasks(): Promise<TaskCard[]> {
    return TASKS;
}
