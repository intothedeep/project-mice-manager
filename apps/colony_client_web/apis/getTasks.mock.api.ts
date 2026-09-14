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
        // T3: reassigned from subjectMouseId 401 → 101 (M4BCW.2 was the same
        // animal, not a second mouse). subjectLabel is the BASE — the derived
        // ".N" suffix is composed at read time by composeMouseLabel().
        id: 1,
        caseType: 'Genotyping',            // was 'Genotype' — matches TASK_TYPES
        signal: 'instruction' as TaskSignal,
        status: 'todo' as CaseTaskStatus,
        subjectKind: 'mouse' as TaskSubjectKind,
        subjectLabel: 'M4BCW',
        subjectMouseId: 101,               // metaId: M4BCW in pNf1 flox cage 2413 slot A8
        detail: 're-clip — re-run PCR',
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
        subjectMouseId: null,
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
        subjectMouseId: 402,               // metaId: F5AYL in PlpCre;Ai14 cage 2502 slot B8
        detail: 'pair with M4BCW',
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
        subjectMouseId: 101,               // metaId: M4BCW in pNf1 flox cage 2413 slot A8
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
        subjectMouseId: null,
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
        subjectMouseId: 301,               // metaId: F5BGX in PlpCre;Ai14 cage 2501 slot F8
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
        subjectMouseId: null,
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
        subjectMouseId: null,
        detail: 'Rack C — superseded by full rack audit',
        dueDate: '2026-09-01',
        createdAt: '2026-09-01',
        assignee: null,
    },
    {
        // Batch case: ONE case covering U3BCX (202) and U4BCX (203) together.
        // subjectKind='mice' → no individual subject FK; membership in mice[].
        id: 9,
        caseType: 'Genotyping',
        signal: 'plan' as TaskSignal,
        status: 'todo' as CaseTaskStatus,
        subjectKind: 'mice' as TaskSubjectKind,
        subjectLabel: '2 mice: U3BCX, U4BCX',
        subjectMouseId: null,
        mice: [202, 203],
        detail: null,
        dueDate: '2026-09-20',
        createdAt: '2026-09-03',
        assignee: 'Jia',
    },

    // T7 — Parity seed cases.
    // Previously-badged metaIds needing ≥1 open case each:
    //   103  (M4+10AZZ)  → note case → signalColorOf('note')='flag'
    //   501  (M1BCW)     → note case → 'flag'
    //   502  (F9AYL)     → plan case (Mate) → 'plan'
    //   602  (F3WT)      → note case → 'flag'
    //   603  (U5BFA)     → plan case (Genotyping) → 'plan'
    // 202/203 already covered by case 9; 402 by case 3; 101 by case 4.
    {
        id: 10,
        caseType: 'Genes to check',
        signal: 'note' as TaskSignal,
        status: 'todo' as CaseTaskStatus,
        subjectKind: 'mouse' as TaskSubjectKind,
        subjectLabel: 'M4+10AZZ',
        subjectMouseId: 103,
        detail: "pooled '+10' notation — meaning TBD with professor",
        dueDate: '2026-09-25',
        createdAt: '2026-09-03',
        assignee: null,
    },
    {
        id: 11,
        caseType: 'Genotyping',
        signal: 'note' as TaskSignal,
        status: 'todo' as CaseTaskStatus,
        subjectKind: 'mouse' as TaskSubjectKind,
        subjectLabel: 'M1BCW',
        subjectMouseId: 501,
        detail: 're-genotype this week',
        dueDate: '2026-09-25',
        createdAt: '2026-09-03',
        assignee: null,
    },
    {
        id: 12,
        caseType: 'Mate',
        signal: 'plan' as TaskSignal,
        status: 'todo' as CaseTaskStatus,
        subjectKind: 'mouse' as TaskSubjectKind,
        subjectLabel: 'F9AYL',
        subjectMouseId: 502,
        detail: 'plug check scheduled',
        dueDate: '2026-09-25',
        createdAt: '2026-09-03',
        assignee: 'Sam',
    },
    {
        id: 13,
        caseType: 'Genes to check',
        signal: 'note' as TaskSignal,
        status: 'todo' as CaseTaskStatus,
        subjectKind: 'mouse' as TaskSubjectKind,
        subjectLabel: 'F3WT',
        subjectMouseId: 602,
        detail: 'small wound on flank — monitor',
        dueDate: '2026-09-25',
        createdAt: '2026-09-03',
        assignee: null,
    },
    {
        id: 14,
        caseType: 'Genotyping',
        signal: 'plan' as TaskSignal,
        status: 'todo' as CaseTaskStatus,
        subjectKind: 'mouse' as TaskSubjectKind,
        subjectLabel: 'U5BFA',
        subjectMouseId: 603,
        detail: 'sex + genotype pending',
        dueDate: '2026-09-25',
        createdAt: '2026-09-03',
        assignee: 'Jia',
    },

    // Demo: M4BCW (metaId 101) carries MULTIPLE open 'instruction' cases so its
    // instruction badge shows a COUNT (3 = case 4 Move + 15 + 16). The badge
    // renders the number only when count > 1 (ColonyGridView bySignal).
    {
        // Still TODO — contributes 0 to reclipCount (only done/verified count).
        id: 15,
        caseType: 'Tissue collection',
        signal: 'instruction' as TaskSignal,
        status: 'todo' as CaseTaskStatus,
        subjectKind: 'mouse' as TaskSubjectKind,
        subjectLabel: 'M4BCW',
        subjectMouseId: 101,
        detail: 'tail clip for PCR',
        dueDate: '2026-09-12',
        createdAt: '2026-09-03',
        assignee: 'Jia',
    },
    {
        id: 16,
        caseType: 'Genotyping',
        signal: 'instruction' as TaskSignal,
        status: 'todo' as CaseTaskStatus,
        subjectKind: 'mouse' as TaskSubjectKind,
        subjectLabel: 'M4BCW',
        subjectMouseId: 101,
        detail: 'confirm Nf1 flox band',
        dueDate: '2026-09-13',
        createdAt: '2026-09-03',
        assignee: 'Sam',
    },
    // ...plus a 'plan' and a 'note' case on the SAME mouse (101) so M4BCW shows
    // MULTIPLE badge types at once: instruction(3) + plan + note(→flag).
    {
        id: 17,
        caseType: 'Mate',
        signal: 'plan' as TaskSignal,
        status: 'todo' as CaseTaskStatus,
        subjectKind: 'mouse' as TaskSubjectKind,
        subjectLabel: 'M4BCW',
        subjectMouseId: 101,
        detail: 'pair after genotyping confirmed',
        dueDate: '2026-09-18',
        createdAt: '2026-09-03',
        assignee: 'Sam',
    },
    {
        id: 18,
        caseType: 'Genes to check',
        signal: 'note' as TaskSignal,
        status: 'todo' as CaseTaskStatus,
        subjectKind: 'mouse' as TaskSubjectKind,
        subjectLabel: 'M4BCW',
        subjectMouseId: 101,
        detail: 'verify line records vs cage card',
        dueDate: '2026-09-22',
        createdAt: '2026-09-03',
        assignee: null,
    },

    // T3 — Two DONE Tissue collection cases for metaId 101 (M4BCW).
    // reclipCount(101) = 2 → composeMouseLabel('M4BCW', 2) = 'M4BCW.2'.
    // These are COMPLETED cases (done); case 15 stays todo and contributes 0.
    {
        id: 19,
        caseType: 'Tissue collection',
        signal: 'instruction' as TaskSignal,
        status: 'done' as CaseTaskStatus,
        subjectKind: 'mouse' as TaskSubjectKind,
        subjectLabel: 'M4BCW',
        subjectMouseId: 101,
        detail: 'first tail clip — initial genotyping',
        dueDate: '2024-09-01',
        createdAt: '2024-08-28',
        assignee: 'Jia',
    },
    {
        id: 20,
        caseType: 'Tissue collection',
        signal: 'instruction' as TaskSignal,
        status: 'done' as CaseTaskStatus,
        subjectKind: 'mouse' as TaskSubjectKind,
        subjectLabel: 'M4BCW',
        subjectMouseId: 101,
        detail: 're-clip — second tissue sample for PCR confirmation',
        dueDate: '2026-09-03',
        createdAt: '2026-09-01',
        assignee: 'Jia',
    },

    // T3 — One DONE Tissue collection case for metaId 501 (M1BCW).
    // reclipCount(501) = 1 → composeMouseLabel('M1BCW', 1) = 'M1BCW' (bare).
    // Demonstrates N=1 → no suffix.
    {
        id: 21,
        caseType: 'Tissue collection',
        signal: 'instruction' as TaskSignal,
        status: 'done' as CaseTaskStatus,
        subjectKind: 'mouse' as TaskSubjectKind,
        subjectLabel: 'M1BCW',
        subjectMouseId: 501,
        detail: 'initial tail clip',
        dueDate: '2024-03-15',
        createdAt: '2024-03-12',
        assignee: 'Sam',
    },

    // date-colour demo: PLUG on a dam (mock keys it to the dam; TODO real
    // subject_mate_id→dam) → open instruction = RED; a clean done Tissue →
    // NORMAL ink (completion date). red/blue also via cases 1 (genotyping) + 9 (plan).
    {
        id: 22,
        caseType: 'Plug check',
        signal: 'instruction' as TaskSignal,
        status: 'todo' as CaseTaskStatus,
        subjectKind: 'mouse' as TaskSubjectKind,
        subjectLabel: 'F9AYL',
        subjectMouseId: 502,
        detail: 'check for plug',
        dueDate: '2026-09-18',
        createdAt: '2026-09-14',
        assignee: 'Jia',
    },
    {
        id: 23,
        caseType: 'Tissue collection',
        signal: 'plan' as TaskSignal,
        status: 'done' as CaseTaskStatus,
        subjectKind: 'mouse' as TaskSubjectKind,
        subjectLabel: 'F5BGX',
        subjectMouseId: 301,
        detail: 'tail clip stored',
        dueDate: '2026-09-05',
        createdAt: '2026-09-03',
        assignee: 'Sam',
    },
];

// Append-only task log — each row = a status the case moved to.
// Proves doneBy / verifiedBy derivation:
//   case 5 → todo(system) + done(Sam)                → doneBy='Sam', verifiedBy=null
//   case 6 → todo(system) + doing(Jia) + done(Jia) + verified(Dr. Lopez-Juarez) → both set
//   case 7 → todo(system) + doing(Sam) + done(Sam) + verified(Dr. Lopez-Juarez) → both set
//   case 8 → todo(system) + cancelled(system)         → both null
//   cases 3,4 → todo(system) + doing(...)             → both null (no done/verified yet)
//   cases 19,20,21 → todo(system) + done(...)         → doneBy set, verifiedBy=null
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

    // case 9 — batch (mice: 202, 203) — todo only
    { id: 901, caseId: 9, status: 'todo',      actorRole: 'professor', actor: 'Dr. Lopez-Juarez', note: null, createdAt: '2026-09-03' },

    // T7 parity cases — all todo only
    { id: 1001, caseId: 10, status: 'todo', actorRole: 'professor', actor: 'Dr. Lopez-Juarez', note: null, createdAt: '2026-09-03' },
    { id: 1101, caseId: 11, status: 'todo', actorRole: 'professor', actor: 'Dr. Lopez-Juarez', note: null, createdAt: '2026-09-03' },
    { id: 1201, caseId: 12, status: 'todo', actorRole: 'professor', actor: 'Dr. Lopez-Juarez', note: null, createdAt: '2026-09-03' },
    { id: 1301, caseId: 13, status: 'todo', actorRole: 'professor', actor: 'Dr. Lopez-Juarez', note: null, createdAt: '2026-09-03' },
    { id: 1401, caseId: 14, status: 'todo', actorRole: 'professor', actor: 'Dr. Lopez-Juarez', note: null, createdAt: '2026-09-03' },

    // M4BCW (101) showcase — 3 instruction + 1 plan + 1 note, all open (todo)
    { id: 1501, caseId: 15, status: 'todo', actorRole: 'professor', actor: 'Dr. Lopez-Juarez', note: null, createdAt: '2026-09-03' },
    { id: 1601, caseId: 16, status: 'todo', actorRole: 'professor', actor: 'Dr. Lopez-Juarez', note: null, createdAt: '2026-09-03' },
    { id: 1701, caseId: 17, status: 'todo', actorRole: 'professor', actor: 'Dr. Lopez-Juarez', note: null, createdAt: '2026-09-03' },
    { id: 1801, caseId: 18, status: 'todo', actorRole: 'professor', actor: 'Dr. Lopez-Juarez', note: null, createdAt: '2026-09-03' },

    // T3 — Done Tissue collection log rows (todo→done) for cases 19, 20, 21.
    // case 19 → doneBy='Jia'
    { id: 1901, caseId: 19, status: 'todo', actorRole: 'professor', actor: 'Dr. Lopez-Juarez', note: null, createdAt: '2024-08-28' },
    { id: 1902, caseId: 19, status: 'done', actorRole: 'staff',     actor: 'Jia',              note: null, createdAt: '2024-09-01' },
    // case 20 → doneBy='Jia'
    { id: 2001, caseId: 20, status: 'todo', actorRole: 'professor', actor: 'Dr. Lopez-Juarez', note: null, createdAt: '2026-09-01' },
    { id: 2002, caseId: 20, status: 'done', actorRole: 'staff',     actor: 'Jia',              note: null, createdAt: '2026-09-03' },
    // case 21 (M1BCW, metaId 501, N=1 → bare label) → doneBy='Sam'
    { id: 2101, caseId: 21, status: 'todo', actorRole: 'professor', actor: 'Dr. Lopez-Juarez', note: null, createdAt: '2024-03-12' },
    { id: 2102, caseId: 21, status: 'done', actorRole: 'staff',     actor: 'Sam',              note: null, createdAt: '2024-03-15' },

    // date-colour demo (cases 22 plug / 23 done tissue)
    { id: 2201, caseId: 22, status: 'todo', actorRole: 'professor', actor: 'Dr. Lopez-Juarez', note: null, createdAt: '2026-09-14' },
    { id: 2301, caseId: 23, status: 'todo', actorRole: 'professor', actor: 'Dr. Lopez-Juarez', note: null, createdAt: '2026-09-03' },
    { id: 2302, caseId: 23, status: 'done', actorRole: 'staff',     actor: 'Sam',              note: null, createdAt: '2026-09-05' },
];

// Seed for the client store; the real fetcher will replace this.
export const SEED_CASES_EXPORT = SEED_CASES;
export const SEED_TASK_LOG_EXPORT = SEED_TASK_LOG;

export async function getTasks(): Promise<ClientCaseCard[]> {
    return SEED_CASES.map((c) => toCaseCard(c, SEED_TASK_LOG));
}
