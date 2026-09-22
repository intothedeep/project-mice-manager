// DTOs and helpers for the Case model (0021_cases_and_task_events).
//
// `TaskStatus` here supersedes the one in task.ts: 'open' is renamed 'todo'
// and 'doing' is new. Role, TaskSubjectKind, TaskSignal are re-exported from
// task.ts to avoid duplicate definitions that would drift apart.

// Re-export shared enums from task.ts so there is exactly one definition.
export type { Role, TaskSubjectKind, TaskSignal } from './task';

// New 5-value lifecycle ('open' → 'todo'; 'doing' added).
// The old 4-value TaskStatus in task.ts is kept for the parallel app wave.
export type TaskStatus = 'todo' | 'doing' | 'done' | 'verified' | 'cancelled';

// ---------------------------------------------------------------------------
// CaseCard — flattened read DTO for the case bin / upcoming-work view.
// Mirrors TaskCard from task.ts but against the new two-table model:
// status comes from cases.current_status (denorm cache); history lives in
// tasks (renamed from task_events in 0023).
// ---------------------------------------------------------------------------
import type { TaskSubjectKind, TaskSignal } from './task';

export interface CaseCard {
    id: number; // cases.id
    caseType: string; // e.g. 'genotype', 'plug_check', 'wean'
    signal: TaskSignal; // resolved from cases.signal_id -> signals.type
    status: TaskStatus; // cases.current_status (denorm cache)
    subjectKind: TaskSubjectKind | null; // null when no specific subject entity
    subjectLabel: string | null; // e.g. 'M4BCW', 'cage 2413', 'litter BCW'
    // subjectMouseId: the resolved mouse_meta.id for single-subject 'mouse' cases.
    // Also present on 'mice' batch cases (always null — membership is in case_mice).
    // Optional for backward compat — consumers that only read subject_kind='mouse'
    // and 'mice' need this; other kinds leave it absent.
    subjectMouseId?: number | null;
    // mice: metaIds of all members for 'mice' batch cases. Populated by the server
    // JOIN on case_mice; absent for all other subject kinds.
    mice?: number[];
    createdAt: string; // ISO datetime (cases.created_at)
    dueDate: string | null; // ISO date (cases.due_date)
    // OPEN QUESTION: assigned_to absent from cases spec — flagged for architect
    // review (see 0021 header). Will be added as a FK column when decided.
}

// ---------------------------------------------------------------------------
// Task — one row from tasks (renamed from task_events in 0023).
// Immutable status record: each row = a status the case moved to.
// Rows are INSERT-only; status is assigned at creation and NEVER changes.
// ---------------------------------------------------------------------------
import type { Role } from './task';

export interface Task {
    id: number;
    caseId: number;
    status: TaskStatus; // the state the case MOVED TO with this task record
    actorId: number;
    actorRole: Role;
    note: string | null;
    createdAt: string; // ISO datetime
}

// ---------------------------------------------------------------------------
// isOverdue — PURE derived helper. NOT stored; computed at read.
// A case is overdue when it is active (todo or doing) and past its due date.
// ISO date strings compare lexicographically — no Date parsing needed.
// Returns false when dueDate is null (no deadline set).
// ---------------------------------------------------------------------------
export function isOverdue(
    c: Pick<CaseCard, 'status' | 'dueDate'>,
    today: string // ISO date 'YYYY-MM-DD'
): boolean {
    if (c.dueDate === null) return false;
    if (c.status !== 'todo' && c.status !== 'doing') return false;
    return c.dueDate < today;
}
