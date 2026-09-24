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
import { moveMouseToCage } from '@/lib/mockColonyStore';
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
let nextUpId = Math.max(0, ...upcoming.map((u) => u.id)) + 1;

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
// Returns the whole append-only task log. taskLog is reassigned (not mutated)
// on every write, so the reference is stable between writes — no extra cache
// needed (mirrors useTasks / the projectedCases pattern).
export function useTaskLog(): ClientTask[] {
    return useSyncExternalStore(
        subscribe,
        () => taskLog,
        () => taskLog
    );
}

// ---- public writes ---------------------------------------------------------

type SetTaskStatusResult = { ok: true } | { ok: false; error: string };

// A Move case that reaches `done` must MOVE THE MOUSE (owner ruling) — a case
// marked done with the animal still in its old cage is the bug this exists to
// close. The move is attempted BEFORE the status is written and a refusal
// ABORTS the advance: a `done` Move whose mouse did not move would be the
// same lie in a new place.
//
// 'verified' acts too, and not as a duplicate: an ADMIN may jump straight
// from 'doing' to 'verified' (taskFlow.ts — admin is any→any), which would
// otherwise verify a move that never happened. Running it twice is harmless
// because a move to where the mouse already is is refused as a no-op by the
// pure layer, so no second version row is minted.
//
// 'cancelled'/'todo' undo nothing: a version log is append-only, so putting
// the mouse back is its own move, not the erasure of this one.
//
// A BATCH Move (subjectKind 'mice') moves every member. It aborts on the
// first refusal rather than half-moving the batch and reporting success —
// the mice already moved keep their rows, which is the truth about the rack.
function enactCase(c: SeedCaseRow, to: CaseTaskStatus): SetTaskStatusResult {
    if (c.caseType !== 'Move') return { ok: true };
    if (to !== 'done' && to !== 'verified') return { ok: true };

    const metaIds =
        c.mice && c.mice.length > 0
            ? c.mice
            : c.subjectMouseId != null
              ? [c.subjectMouseId]
              : [];
    if (metaIds.length === 0) {
        return { ok: false, error: 'This Move case names no mouse.' };
    }
    const toCage = c.direction?.toCage;
    if (typeof toCage !== 'string' || !toCage) {
        return {
            ok: false,
            error: 'This Move case names no destination cage.',
        };
    }
    for (const metaId of metaIds) {
        const moved = moveMouseToCage(
            metaId,
            toCage,
            TODAY,
            `Move case #${c.id}`
        );
        if (!moved.ok) return moved;
    }
    return { ok: true };
}

// setTaskStatus: dual write — appends a child task-log row AND updates the
// case's current_status cache. Mirrors the real server's ADVANCE transaction
// (INSERT child tasks row + UPDATE cases.current_status).
export function setTaskStatus(
    caseId: number,
    to: CaseTaskStatus,
    role: Role
): SetTaskStatusResult {
    // 0. Carry out what the case ACTUALLY asks for, before recording that it
    //    was carried out.
    const target = cases.find((c) => c.id === caseId);
    if (target) {
        const enacted = enactCase(target, to);
        if (!enacted.ok) return enacted;
    }

    // 1. Update the case's mutable status cache.
    cases = cases.map((c) => (c.id !== caseId ? c : { ...c, status: to }));

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
    return { ok: true };
}

// NewTaskInput — shape passed from the dialog into addTask.
// mice: present when the task covers N mice as a batch (subjectKind='mice').
// When mice is set, a single case covering all N mice is created instead of
// per-mouse cases. Single-subject cases leave mice undefined.
export interface NewTaskInput {
    def: TaskTypeDef;
    values: Record<string, string | string[]>;
    signal: TaskSignal;
    // Stored ONLY for 'mate', the one kind with nothing to point at. Every
    // other kind carries an id or a code below and its name is composed at
    // read time.
    subjectLabel: string | null;
    // The picked mouse's metaId for def.subjectKind === 'mouse'. The dialog
    // pickers carry ids, so no label lookup is needed (and none is done — two
    // mice may display the same name, as 102/402 did).
    subjectMouseId: number | null;
    // The picked litter's CODE for def.subjectKind === 'litter'. The code is
    // the litter's identity (litters.litter_code is UNIQUE); the 'litter '
    // prefix the old stored label carried was display text, not part of it.
    subjectLitterCode: string | null;
    detail: string | null;
    dueDate: string | null;
    assignee: string | null;
    // Batch mode: N mice in one case. When present and non-empty, addTask
    // creates ONE case with subjectKind='mice' covering all metaIds. Ids
    // only — the header is composed from them at read time, so a member's
    // name is never copied onto the case.
    mice?: number[];
}

// addTask: creates a case (status=todo) + its first todo task-log row.
// Batch path: mice[] present → ONE case with subjectKind='mice', all metaIds
// in the mice[] field. No per-mouse cases, and no stored header.
// Single-subject path: mice absent → one case, subjectKind from def.subjectKind,
// subjectMouseId carried through from the dialog's picker (NOT resolved from a
// mouseLabel — that is the 102-vs-402 ambiguity). Only a 'mate' case stores a
// label; every other kind's name is resolved from its id or code at read time.
// For a Mate, auto-enqueues plug-check + delivery into Upcoming.
export function addTask(input: NewTaskInput): void {
    const caseId = nextCaseId++;

    let caseRow: SeedCaseRow;

    if (input.mice && input.mice.length > 0) {
        // Batch path: N mice → ONE case, subjectKind='mice'.
        caseRow = {
            id: caseId,
            caseType: input.def.type,
            signal: input.signal,
            status: 'todo',
            subjectKind: 'mice',
            subjectLabel: null,
            subjectMouseId: null,
            mice: input.mice,
            detail: input.detail,
            createdAt: TODAY,
            dueDate: input.dueDate,
            assignee: input.assignee,
            direction: input.values,
        };
    } else {
        // Single-subject path.
        const kind = input.def.subjectKind;
        caseRow = {
            id: caseId,
            caseType: input.def.type,
            signal: input.signal,
            status: 'todo',
            subjectKind: kind,
            subjectLabel: kind === 'mate' ? input.subjectLabel : null,
            subjectMouseId: kind === 'mouse' ? input.subjectMouseId : null,
            subjectLitterCode:
                kind === 'litter' ? input.subjectLitterCode : null,
            detail: input.detail,
            createdAt: TODAY,
            dueDate: input.dueDate,
            assignee: input.assignee,
            direction: input.values,
        };
    }

    cases = [caseRow, ...cases];

    // Append the first todo task-log row (actor = staff default; display-
    // inert since doneBy/verifiedBy only fold done/verified rows).
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

    // Mate cascade — auto-create upcoming events (single-subject only).
    if (!input.mice?.length && input.def.cascade) {
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
