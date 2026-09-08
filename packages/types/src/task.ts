// View DTO + shared enums for the Task bin (ticket queue).
//
// Mirrors the `tasks` table's head-row after resolution: the current status
// only, with subject + actor fields flattened for display. The role/status
// enums are shared so the client and the (future) service agree on the words.

export type TaskStatus = 'open' | 'done' | 'verified' | 'cancelled';

// Who is acting. `professor` = the director/PI; `staff` = lab members.
export type Role = 'staff' | 'professor' | 'admin';

export type TaskSubjectKind = 'mouse' | 'cage' | 'litter' | 'room';

export interface TaskCard {
    id: number;
    taskType: string; // e.g. "Genotype", "Wean", "Set up mating", "Check food"
    status: TaskStatus;
    subjectKind: TaskSubjectKind | null; // null = room-level task (0 subjects)
    subjectLabel: string | null; // e.g. "M4BCW", "cage 2413", "litter BCW"
    detail: string | null; // rendered from tasks.direction, e.g. "2413 → 2414"
    dueDate: string | null; // ISO date
    assignee: string | null; // person or group display name
    doneBy: string | null;
    verifiedBy: string | null;
}
