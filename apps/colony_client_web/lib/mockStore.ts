'use client';

import { useSyncExternalStore } from 'react';
import type { Role, TaskSignal, CaseTaskStatus } from '@repo/types';
import {
    SEED_CASES_EXPORT,
    SEED_TASK_LOG_EXPORT,
    toCaseCard,
    type ClientCaseCard,
    type ClientTask,
    type SeedCaseRow,
} from '@/apis/getTasks.mock.api';
import { SEED_UPCOMING, type UpcomingItem } from '@/apis/getUpcoming.mock.api';
import { expectedDeliveryOn, plugCheckOn, TODAY } from '@/lib/dueDates';
import type { TaskTypeDef } from '@/lib/taskTypes';

// Mock-era shared store. Both /tasks and /upcoming read from it, so a task
// created on one screen (and its auto-cascaded follow-ups) shows up on the
// other across route navigation. When the real server lands this is replaced by
// react-query + endpoints; nothing else in the UI changes.
//
// Two stores mirror the real DB schema:
//   cases    — mutable current_status (the case identity row)
//   taskLog  — append-only immutable child task rows (status records)
//
// toCaseCard() projects them into a flat ClientCaseCard for the UI.
// The projected array is cached in `projectedCases` and recomputed after every
// mutating operation (before emit) so useSyncExternalStore returns a stable
// reference between renders — avoids infinite React re-render loops.

const ACTOR: Record<Role, string> = {
    staff: 'You (staff)',
    professor: 'Dr. Lopez-Juarez',
    admin: 'Admin',
};

// ---- state -----------------------------------------------------------------

let cases: SeedCaseRow[] = SEED_CASES_EXPORT;
let taskLog: ClientTask[] = SEED_TASK_LOG_EXPORT;
let upcoming: UpcomingItem[] = SEED_UPCOMING;

let nextCaseId = Math.max(0, ...cases.map((c) => c.id)) + 1;
let nextTaskId = Math.max(0, ...taskLog.map((t) => t.id)) + 1;
let nextUpId   = Math.max(0, ...upcoming.map((u) => u.id)) + 1;

// Cached projection — recomputed on every write, returned as-is on reads.
let projectedCases: ClientCaseCard[] = reproject();

function reproject(): ClientCaseCard[] {
    return cases.map((c) => toCaseCard(c, taskLog));
}

// ---- subscription ----------------------------------------------------------

const listeners = new Set<() => void>();
function emit() {
    projectedCases = reproject();
    listeners.forEach((l) => l());
}
function subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

// ---- public reads ----------------------------------------------------------

export function useTasks(): ClientCaseCard[] {
    return useSyncExternalStore(
        subscribe,
        () => projectedCases,
        () => projectedCases
    );
}
export function useUpcoming(): UpcomingItem[] {
    return useSyncExternalStore(
        subscribe,
        () => upcoming,
        () => upcoming
    );
}

// ---- public writes ---------------------------------------------------------

// setTaskStatus: dual write — appends a child task-log row AND updates the
// case's current_status cache. Mirrors the real server's ADVANCE transaction
// (INSERT child tasks row + UPDATE cases.current_status).
export function setTaskStatus(caseId: number, to: CaseTaskStatus, role: Role): void {
    // 1. Update the case's mutable status cache.
    cases = cases.map((c) =>
        c.id !== caseId ? c : { ...c, status: to }
    );

    // 2. Append an immutable child task-log row.
    const taskRow: ClientTask = {
        id: nextTaskId++,
        caseId,
        status: to,
        actorRole: role,
        actor: ACTOR[role],
        note: null,
        createdAt: TODAY,
    };
    taskLog = [...taskLog, taskRow];

    emit();
}

// NewTaskInput — same shape as before; addTask does not take a role because
// NewTaskDialog (outside file ownership) does not pass one. The first todo
// task-log row's actor is display-inert (displayed fields come from done/
// verified rows), so a fixed default is correct here.
export interface NewTaskInput {
    def: TaskTypeDef;
    values: Record<string, string | string[]>;
    signal: TaskSignal;
    subjectLabel: string | null;
    detail: string | null;
    dueDate: string | null;
    assignee: string | null;
}

// addTask: creates a case (status=todo) + its first todo task-log row.
// For a Mate, auto-enqueues plug-check + delivery into Upcoming.
export function addTask(input: NewTaskInput): void {
    const caseId = nextCaseId++;

    // 1. Insert the case row (status=todo).
    const caseRow: SeedCaseRow = {
        id: caseId,
        caseType: input.def.type,
        signal: input.signal,
        status: 'todo',
        subjectKind: input.def.subjectKind,
        subjectLabel: input.subjectLabel,
        detail: input.detail,
        createdAt: TODAY,
        dueDate: input.dueDate,
        assignee: input.assignee,
        direction: input.values,
    };
    cases = [caseRow, ...cases];

    // 2. Append the first todo task-log row (actor = staff default; display-
    //    inert since doneBy/verifiedBy only fold done/verified rows).
    const taskRow: ClientTask = {
        id: nextTaskId++,
        caseId,
        status: 'todo',
        actorRole: 'staff',
        actor: ACTOR.staff,
        note: null,
        createdAt: TODAY,
    };
    taskLog = [...taskLog, taskRow];

    // 3. Mate cascade — auto-create upcoming events.
    if (input.def.cascade) {
        const matingDate = String(
            input.values.matingDate ?? input.dueDate ?? ''
        );
        const subject = input.subjectLabel ?? 'new mating';
        if (matingDate) {
            upcoming = [
                {
                    id: nextUpId++,
                    kind: 'plug-check',
                    title: 'Plug check',
                    subjectLabel: subject,
                    subjectKind: 'mate',
                    dueDate: plugCheckOn(matingDate),
                    note: 'auto-created from mating',
                },
                {
                    id: nextUpId++,
                    kind: 'delivery',
                    title: 'Expected delivery',
                    subjectLabel: subject,
                    subjectKind: 'mate',
                    dueDate: expectedDeliveryOn(matingDate),
                    note: 'auto-created from mating',
                },
                ...upcoming,
            ];
        }
    }

    emit();
}
