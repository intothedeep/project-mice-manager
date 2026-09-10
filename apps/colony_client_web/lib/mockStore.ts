'use client';

import { useSyncExternalStore } from 'react';
import type { Role, TaskCard, TaskSignal, TaskStatus } from '@repo/types';
import { SEED_TASKS } from '@/apis/getTasks.mock.api';
import { SEED_UPCOMING, type UpcomingItem } from '@/apis/getUpcoming.mock.api';
import { expectedDeliveryOn, plugCheckOn, TODAY } from '@/lib/dueDates';
import type { TaskTypeDef } from '@/lib/taskTypes';

// Mock-era shared store. Both /tasks and /upcoming read from it, so a task
// created on one screen (and its auto-cascaded follow-ups) shows up on the
// other across route navigation. When the real server lands this is replaced by
// react-query + endpoints; nothing else in the UI changes.

const ACTOR: Record<Role, string> = {
    staff: 'You (staff)',
    professor: 'Dr. Lopez-Juarez',
    admin: 'Admin',
};

let tasks: TaskCard[] = SEED_TASKS;
let upcoming: UpcomingItem[] = SEED_UPCOMING;
let nextTaskId = Math.max(0, ...tasks.map((t) => t.id)) + 1;
let nextUpId = Math.max(0, ...upcoming.map((u) => u.id)) + 1;

const listeners = new Set<() => void>();
function emit() {
    listeners.forEach((l) => l());
}
function subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

export function useTasks(): TaskCard[] {
    return useSyncExternalStore(
        subscribe,
        () => tasks,
        () => tasks
    );
}
export function useUpcoming(): UpcomingItem[] {
    return useSyncExternalStore(
        subscribe,
        () => upcoming,
        () => upcoming
    );
}

export function setTaskStatus(id: number, to: TaskStatus, role: Role): void {
    tasks = tasks.map((t) =>
        t.id !== id
            ? t
            : {
                  ...t,
                  status: to,
                  doneBy: to === 'done' ? ACTOR[role] : t.doneBy,
                  verifiedBy:
                      to === 'verified'
                          ? ACTOR[role]
                          : to === 'open'
                            ? null
                            : t.verifiedBy,
              }
    );
    emit();
}

export interface NewTaskInput {
    def: TaskTypeDef;
    values: Record<string, string | string[]>;
    signal: TaskSignal;
    subjectLabel: string | null;
    detail: string | null;
    dueDate: string | null;
    assignee: string | null;
}

// Create a task (status=open) and, for a Mate, auto-enqueue its follow-ups
// (plug check +10d, expected delivery +20d) into Upcoming.
export function addTask(input: NewTaskInput): void {
    const card: TaskCard = {
        id: nextTaskId++,
        taskType: input.def.type,
        signal: input.signal,
        status: 'open',
        subjectKind: input.def.subjectKind,
        subjectLabel: input.subjectLabel,
        detail: input.detail,
        createdAt: TODAY,
        dueDate: input.dueDate,
        assignee: input.assignee,
        doneBy: null,
        verifiedBy: null,
        direction: input.values,
    };
    tasks = [card, ...tasks];

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
