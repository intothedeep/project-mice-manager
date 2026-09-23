// Shared DTOs for the colony automation project.
// Add typed interfaces here as the API surface grows.
export type {
    SignalColor,
    Sex,
    PunchLocation,
    PunchRef,
    GeneRef,
    MouseCaseTag,
    ParentCell,
    MouseParents,
    MateRef,
    MouseDates,
    MouseCell,
    GridSlot,
    GridCage,
    GridLine,
    ColonyGrid,
} from './grid';

export type { PunchRow } from './punchRow';

// gene.ts: the gene CATALOGUE row. What a mouse carries is GeneRef (grid.ts).
export type { Gene } from './gene';

// task.ts: old 4-value TaskStatus ('open'|'done'|'verified'|'cancelled') and
// TaskCard — kept intact while apps/colony_client_web (parallel wave) migrates
// to the new Case model. Do NOT remove until that wave renames its imports.
export type {
    TaskStatus,
    Role,
    TaskSubjectKind,
    TaskSignal,
    TaskCard,
} from './task';

// case.ts: new two-table Case model (0021). Exports the new 5-value lifecycle
// as CaseTaskStatus to avoid shadowing the old TaskStatus above. Role,
// TaskSubjectKind, TaskSignal are NOT re-exported here — they are already
// exported from task.ts above (single definition, same values).
export type { TaskStatus as CaseTaskStatus, CaseCard, Task } from './case';

// isOverdue is a value export (pure function), not a type — needs its own line.
export { isOverdue } from './case';
