import type { TaskSubjectKind } from '@repo/types';

// Data-driven form schema for creating tasks. task_type selects which extra
// fields appear; the extra values land in the task's `direction` payload (the
// tasks.direction jsonb). Adding a new task type = one entry here.

export const GENE_CODES = ['Nf1', 'PlpCre', 'Ai14', 'ccEGFP'] as const;
export const LITTER_CODES = ['BCW', 'BCX', 'AZZ', 'BGX'] as const;

export type FieldKind =
    'mouse' | 'cage' | 'litter' | 'genes' | 'date' | 'number' | 'text';

export interface FormField {
    key: string;
    label: string;
    kind: FieldKind;
    required?: boolean;
}

export interface TaskTypeDef {
    type: string; // task_type value + display label
    subjectKind: TaskSubjectKind;
    subjectFrom: string | null; // field key whose value is the subject label (null = no specific entity)
    fields: FormField[];
    cascade?: boolean; // mate → auto plug-check(+10) + delivery(+20)
    dueFromField?: string; // date field the due date defaults from (else today)
}

export const TASK_TYPES: TaskTypeDef[] = [
    {
        type: 'Mate',
        subjectKind: 'mate',
        subjectFrom: null, // subject label built from mother × father
        cascade: true,
        dueFromField: 'matingDate',
        fields: [
            {
                key: 'mother',
                label: 'Mother (♀)',
                kind: 'mouse',
                required: true,
            },
            {
                key: 'father',
                label: 'Father (♂)',
                kind: 'mouse',
                required: true,
            },
            {
                key: 'matingDate',
                label: 'Mating date',
                kind: 'date',
                required: true,
            },
        ],
    },
    {
        type: 'Plug check',
        subjectKind: 'cage',
        subjectFrom: 'cage',
        fields: [{ key: 'cage', label: 'Cage', kind: 'cage', required: true }],
    },
    {
        type: 'Birth / delivery',
        subjectKind: 'cage',
        subjectFrom: 'cage',
        fields: [
            { key: 'cage', label: 'Cage', kind: 'cage', required: true },
            { key: 'pupCount', label: 'Pup count', kind: 'number' },
        ],
    },
    {
        type: 'Wean',
        subjectKind: 'litter',
        subjectFrom: 'litter',
        fields: [
            { key: 'litter', label: 'Litter', kind: 'litter', required: true },
        ],
    },
    {
        type: 'Genes to check',
        subjectKind: 'mouse',
        subjectFrom: 'mouse',
        fields: [
            { key: 'mouse', label: 'Mouse', kind: 'mouse', required: true },
            {
                key: 'genes',
                label: 'Genes to check',
                kind: 'genes',
                required: true,
            },
        ],
    },
    {
        // Tail/ear tissue sampling — the step BEFORE genotyping (PCR runs on it).
        type: 'Tissue collection',
        subjectKind: 'mouse',
        subjectFrom: 'mouse',
        fields: [
            { key: 'mouse', label: 'Mouse', kind: 'mouse', required: true },
            { key: 'collectDate', label: 'Collection date', kind: 'date' },
        ],
    },
    {
        type: 'Genotyping',
        subjectKind: 'mouse',
        subjectFrom: 'mouse',
        fields: [
            { key: 'mouse', label: 'Mouse', kind: 'mouse', required: true },
            { key: 'genes', label: 'Markers', kind: 'genes', required: true },
            { key: 'pcrDate', label: 'PCR date', kind: 'date' },
        ],
    },
    {
        type: 'Move',
        subjectKind: 'mouse',
        subjectFrom: 'mouse',
        fields: [
            { key: 'mouse', label: 'Mouse', kind: 'mouse', required: true },
            { key: 'toCage', label: 'To cage', kind: 'cage', required: true },
        ],
    },
    {
        // 'room' subject kind was removed in 0023. 'slot' is the closest equivalent
        // for rack/area-level tasks until a dedicated UI kind is added.
        type: 'Check food',
        subjectKind: 'slot',
        subjectFrom: null,
        fields: [{ key: 'area', label: 'Area', kind: 'text' }],
    },
    {
        type: 'Sac',
        subjectKind: 'mouse',
        subjectFrom: 'mouse',
        fields: [
            { key: 'mouse', label: 'Mouse', kind: 'mouse', required: true },
            { key: 'reason', label: 'Reason', kind: 'text' },
        ],
    },
];
