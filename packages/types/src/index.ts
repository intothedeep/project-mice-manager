// Shared DTOs for the colony automation project.
// Add typed interfaces here as the API surface grows.
export type {
    SignalColor,
    Sex,
    MouseCell,
    GridSlot,
    GridCage,
    GridLine,
    ColonyGrid,
} from './grid';

export type { TaskStatus, Role, TaskSubjectKind, TaskCard } from './task';

export type {
    GeneCall,
    ParentRef,
    HistoryEvent,
    MouseDetail,
} from './mouseDetail';
