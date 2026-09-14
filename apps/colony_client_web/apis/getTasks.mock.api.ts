import type { CaseCard, Task, CaseTaskStatus, TaskSubjectKind, TaskSignal } from '@repo/types';

// Mock fetcher for the Task bin. Named as the future real fetcher so the
// mock→real swap is one file.
//
// Model: a `case` groups work and owns mutable `current_status`; `tasks`
// (child rows) are immutable append-only status records — each row = the
// status the case moved to. The board renders ONE card per case, at its
// current_status column.
//
// When the real server lands: replace SEED_CASES/SEED_TASK_LOG with a fetch
// to colony_server; toCaseCard stays identical if the server sends the same
// two arrays. Or the server pre-projects — either way the swap is one file.

// ---------------------------------------------------------------------------
// Bridge types — local to this mock wave only.
// SWAP NOTE: when the real server pre-projects, replace with the server DTO.
// ---------------------------------------------------------------------------

// ClientCaseCard: what the UI renders. Derived by toCaseCard() from CaseCard +
// the task log. Extends CaseCard with display-only fields that CaseCard lacks:
//   detail    — rendered from case direction/notes (not in DB CaseCard)
//   assignee  — a future FK column on cases (open Q, not in CaseCard yet)
//   doneBy    — derived: actor of the latest 'done' task row for this case
//   verifiedBy — derived: actor of the latest 'verified' task row for this case
//   direction — type-specific payload (mirrors tasks.direction jsonb)
export type ClientCaseCard = Omit<CaseCard, 'status'> & {
    status: CaseTaskStatus;
    detail: string | null;
    assignee: string | null;
    doneBy: string | null;
    verifiedBy: string | null;
    direction?: Record<string, unknown>;
};

// ClientTask: one immutable child task-log row (append-only).
// SWAP NOTE: when the real server exposes Task rows directly, this is Task.
// Uses string actors (display names) instead of actor FK ids — mock-side only.
export type ClientTask = Pick<Task, 'id' | 'caseId' | 'status' | 'actorRole' | 'note' | 'createdAt'> & {
    actor: string; // display name (real: JOIN users ON actor_id)
};

// ---------------------------------------------------------------------------
// Projection: fold the task log for one case into the display fields.
// doneBy / verifiedBy = actor of the LATEST done / verified task row that
// follows the case's most recent 'todo' row (reopen clears them — rows before
// the last reopen are inert for display purposes).
// ---------------------------------------------------------------------------
export function toCaseCard(
    c: Omit<ClientCaseCard, 'doneBy' | 'verifiedBy'>,
    taskLog: ClientTask[]
): ClientCaseCard {
    const caseRows = taskLog
        .filter((t) => t.caseId === c.id)
        .sort((a, b) => a.id - b.id); // insertion order = chronological

    // Find the index of the last 'todo' row (reopen resets the history window).
    let lastTodoIdx = -1;
    caseRows.forEach((t, i) => {
        if (t.status === 'todo') lastTodoIdx = i;
    });

    // Only rows after the last todo are in the active history window.
    const active = caseRows.slice(lastTodoIdx + 1);

    // Latest done/verified actor in the active window.
    const doneRow = [...active].reverse().find((t) => t.status === 'done');
    const verifiedRow = [...active].reverse().find((t) => t.status === 'verified');

    return {
        ...c,
        doneBy: doneRow?.actor ?? null,
        verifiedBy: verifiedRow?.actor ?? null,
    };
}

// ---------------------------------------------------------------------------
// Seed data — cases store (mutable current_status) + task log (append-only).
// caseType values match TASK_TYPES[].type (single source of truth in lib/taskTypes.ts).
// ---------------------------------------------------------------------------

// Mutable case rows. doneBy / verifiedBy are NOT stored here — they are
// derived by toCaseCard() from SEED_TASK_LOG at read time.
export type SeedCaseRow = Omit<ClientCaseCard, 'doneBy' | 'verifiedBy'>;

export const SEED_CASES: SeedCaseRow[] = [
    {
        id: 1,
        caseType: 'Genotyping',            // was 'Genotype' — matches TASK_TYPES
        signal: 'instruction' as TaskSignal,
        status: 'todo' as CaseTaskStatus,
        subjectKind: 'mouse' as TaskSubjectKind,
        subjectLabel: 'M4BCW.2',
        detail: 're-clip (.2) — re-run PCR',
        dueDate: '2026-09-10',
        createdAt: '2026-09-03',
        assignee: 'Jia',
    },
    {
        id: 2,
        caseType: 'Check food',
        signal: 'note' as TaskSignal,
        status: 'todo' as CaseTaskStatus,
        subjectKind: 'slot' as TaskSubjectKind, // ⓐ: 'room' removed; 'slot' is closest
        subjectLabel: null,
        detail: 'Rack B — whole rack',
        dueDate: '2026-09-20',
        createdAt: '2026-09-03',
        assignee: 'Lab (all)',
    },
    {
        id: 3,
        caseType: 'Mate',                  // was 'Set up mating' — matches TASK_TYPES
        signal: 'plan' as TaskSignal,
        status: 'doing' as CaseTaskStatus,
        subjectKind: 'mouse' as TaskSubjectKind,
        subjectLabel: 'F5AYL',
        detail: 'pair with M4BCW.2',
        dueDate: '2026-09-15',
        createdAt: '2026-09-03',
        assignee: 'Sam',
    },
    {
        id: 4,
        caseType: 'Move',
        signal: 'instruction' as TaskSignal,
        status: 'doing' as CaseTaskStatus,
        subjectKind: 'mouse' as TaskSubjectKind,
        subjectLabel: 'M4BCW',
        detail: 'cage 2413 → 2414',
        dueDate: '2026-09-07',
        createdAt: '2026-09-03',
        assignee: 'Jia',
    },
    {
        id: 5,
        caseType: 'Wean',
        signal: 'plan' as TaskSignal,
        status: 'done' as CaseTaskStatus,
        subjectKind: 'litter' as TaskSubjectKind,
        subjectLabel: 'litter BCX',
        detail: '2 pups → new cage',
        dueDate: '2026-09-06',
        createdAt: '2026-09-03',
        assignee: 'Sam',
    },
    {
        id: 6,
        caseType: 'Sac',
        signal: 'instruction' as TaskSignal,
        status: 'verified' as CaseTaskStatus,
        subjectKind: 'mouse' as TaskSubjectKind,
        subjectLabel: 'F5BGX',
        detail: 'endpoint reached',
        dueDate: '2026-09-05',
        createdAt: '2026-09-03',
        assignee: 'Jia',
    },
    {
        id: 7,
        caseType: 'Genotyping',            // was 'Genotype' — matches TASK_TYPES
        signal: 'instruction' as TaskSignal,
        status: 'verified' as CaseTaskStatus,
        subjectKind: 'cage' as TaskSubjectKind,
        subjectLabel: 'cage 2414',
        detail: 'unsexed pups U3BCX, U4BCX',
        dueDate: '2026-09-04',
        createdAt: '2026-09-03',
        assignee: 'Sam',
    },
    {
        id: 8,
        caseType: 'Check food',
        signal: 'note' as TaskSignal,
        status: 'cancelled' as CaseTaskStatus,
        subjectKind: 'slot' as TaskSubjectKind, // ⓐ: 'room' removed; 'slot' is closest
        subjectLabel: null,
        detail: 'Rack C — superseded by full rack audit',
        dueDate: '2026-09-01',
        createdAt: '2026-09-01',
        assignee: null,
    },
];

// Append-only task log — each row = a status the case moved to.
// Proves doneBy / verifiedBy derivation:
//   case 5 → todo(system) + done(Sam)                → doneBy='Sam', verifiedBy=null
//   case 6 → todo(system) + doing(Jia) + done(Jia) + verified(Dr. Lopez-Juarez) → both set
//   case 7 → todo(system) + doing(Sam) + done(Sam) + verified(Dr. Lopez-Juarez) → both set
//   case 8 → todo(system) + cancelled(system)         → both null
//   cases 3,4 → todo(system) + doing(...)             → both null (no done/verified yet)
export const SEED_TASK_LOG: ClientTask[] = [
    // case 1 — todo only
    { id: 101, caseId: 1, status: 'todo',     actorRole: 'professor', actor: 'Dr. Lopez-Juarez', note: null, createdAt: '2026-09-03' },

    // case 2 — todo only
    { id: 201, caseId: 2, status: 'todo',     actorRole: 'professor', actor: 'Dr. Lopez-Juarez', note: null, createdAt: '2026-09-03' },

    // case 3 — todo + doing (doneBy/verifiedBy = null)
    { id: 301, caseId: 3, status: 'todo',     actorRole: 'professor', actor: 'Dr. Lopez-Juarez', note: null, createdAt: '2026-09-03' },
    { id: 302, caseId: 3, status: 'doing',    actorRole: 'staff',     actor: 'Sam',              note: null, createdAt: '2026-09-04' },

    // case 4 — todo + doing (doneBy/verifiedBy = null)
    { id: 401, caseId: 4, status: 'todo',     actorRole: 'professor', actor: 'Dr. Lopez-Juarez', note: null, createdAt: '2026-09-03' },
    { id: 402, caseId: 4, status: 'doing',    actorRole: 'staff',     actor: 'Jia',              note: null, createdAt: '2026-09-04' },

    // case 5 — todo + done → doneBy='Sam', verifiedBy=null
    { id: 501, caseId: 5, status: 'todo',     actorRole: 'professor', actor: 'Dr. Lopez-Juarez', note: null, createdAt: '2026-09-03' },
    { id: 502, caseId: 5, status: 'done',     actorRole: 'professor', actor: 'Sam',              note: null, createdAt: '2026-09-06' },

    // case 6 — full lifecycle → doneBy='Jia', verifiedBy='Dr. Lopez-Juarez'
    { id: 601, caseId: 6, status: 'todo',     actorRole: 'professor', actor: 'Dr. Lopez-Juarez', note: null, createdAt: '2026-09-03' },
    { id: 602, caseId: 6, status: 'doing',    actorRole: 'staff',     actor: 'Jia',              note: null, createdAt: '2026-09-04' },
    { id: 603, caseId: 6, status: 'done',     actorRole: 'professor', actor: 'Jia',              note: null, createdAt: '2026-09-05' },
    { id: 604, caseId: 6, status: 'verified', actorRole: 'professor', actor: 'Dr. Lopez-Juarez', note: null, createdAt: '2026-09-05' },

    // case 7 — full lifecycle → doneBy='Sam', verifiedBy='Dr. Lopez-Juarez'
    { id: 701, caseId: 7, status: 'todo',     actorRole: 'professor', actor: 'Dr. Lopez-Juarez', note: null, createdAt: '2026-09-03' },
    { id: 702, caseId: 7, status: 'doing',    actorRole: 'staff',     actor: 'Sam',              note: null, createdAt: '2026-09-03' },
    { id: 703, caseId: 7, status: 'done',     actorRole: 'professor', actor: 'Sam',              note: null, createdAt: '2026-09-04' },
    { id: 704, caseId: 7, status: 'verified', actorRole: 'professor', actor: 'Dr. Lopez-Juarez', note: null, createdAt: '2026-09-04' },

    // case 8 — todo + cancelled → both null
    { id: 801, caseId: 8, status: 'todo',      actorRole: 'professor', actor: 'Dr. Lopez-Juarez', note: null, createdAt: '2026-09-01' },
    { id: 802, caseId: 8, status: 'cancelled', actorRole: 'professor', actor: 'Dr. Lopez-Juarez', note: 'superseded by full rack audit', createdAt: '2026-09-01' },
];

// Seed for the client store; the real fetcher will replace this.
export const SEED_CASES_EXPORT = SEED_CASES;
export const SEED_TASK_LOG_EXPORT = SEED_TASK_LOG;

export async function getTasks(): Promise<ClientCaseCard[]> {
    return SEED_CASES.map((c) => toCaseCard(c, SEED_TASK_LOG));
}
