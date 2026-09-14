import type { CaseTaskStatus, TaskSignal } from '@repo/types';
import type { ClientCaseCard, ClientTask } from '@/apis/getTasks.mock.api';

// Read-time join: colour + date for the PLUG/DELIV/TISSUE/GENOTYPING grid cells,
// derived from the case store (never stored). Same pattern as badgeIndex /
// buildReclipIndex — the date + its status/signal come from the backing case.

export type DateColumn = 'plug' | 'deliv' | 'tissue' | 'genotyping';

export interface DateCaseHit {
    date: string | null; // done-date when closed, else the planned dueDate
    status: CaseTaskStatus;
    signal: TaskSignal;
}

const TYPE_TO_COL: Record<string, DateColumn> = {
    'Plug check': 'plug',
    'Birth / delivery': 'deliv',
    'Tissue collection': 'tissue',
    Genotyping: 'genotyping',
};

const SIGNAL_RANK: Record<TaskSignal, number> = {
    instruction: 3,
    plan: 2,
    note: 1,
};
const isOpen = (s: CaseTaskStatus) => s === 'todo' || s === 'doing';

// Precedence when several cases hit one (mouse, column): an OPEN case beats a
// closed one; among open, instruction > plan > note; among closed, later date wins.
function pick(a: DateCaseHit, b: DateCaseHit): DateCaseHit {
    const ao = isOpen(a.status);
    const bo = isOpen(b.status);
    if (ao !== bo) return ao ? a : b;
    if (ao) return SIGNAL_RANK[a.signal] >= SIGNAL_RANK[b.signal] ? a : b;
    return (a.date ?? '') >= (b.date ?? '') ? a : b;
}

// buildDateCaseIndex — Map<metaId, {col: hit}>. mouse-subject cases (tissue,
// genotyping) key by subjectMouseId / mice[]. mate-subject cases (plug, deliv)
// are seeded onto the DAM's metaId in the mock (subjectMouseId/mice) — the join
// only reads subjectMouseId/mice. TODO real: resolve subject_mate_id -> dam.
export function buildDateCaseIndex(
    cases: ClientCaseCard[],
    taskLog: ClientTask[]
): Map<number, Partial<Record<DateColumn, DateCaseHit>>> {
    // Latest done/verified date per case, from the append-only log.
    const doneDate = new Map<number, string>();
    for (const t of taskLog) {
        if (t.status === 'done' || t.status === 'verified') {
            const prev = doneDate.get(t.caseId);
            if (!prev || t.createdAt > prev) doneDate.set(t.caseId, t.createdAt);
        }
    }

    const index = new Map<number, Partial<Record<DateColumn, DateCaseHit>>>();
    for (const c of cases) {
        const col = TYPE_TO_COL[c.caseType];
        if (!col) continue;
        const date =
            c.status === 'done' || c.status === 'verified'
                ? doneDate.get(c.id) ?? c.dueDate
                : c.dueDate;
        const hit: DateCaseHit = { date, status: c.status, signal: c.signal };

        const metaIds = new Set<number>();
        if (c.subjectMouseId != null) metaIds.add(c.subjectMouseId);
        c.mice?.forEach((m) => metaIds.add(m));

        for (const metaId of metaIds) {
            const row = index.get(metaId) ?? {};
            const cur = row[col];
            row[col] = cur ? pick(cur, hit) : hit;
            index.set(metaId, row);
        }
    }
    return index;
}
