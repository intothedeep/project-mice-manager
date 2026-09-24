import type { Sex, TaskSubjectKind } from '@repo/types';
import { GENE_CATALOG_CODES } from '@/apis/getGenes.mock.api';

// Data-driven form schema for creating tasks. task_type selects which extra
// fields appear; the extra values land in the task's `direction` payload (the
// tasks.direction jsonb). Adding a new task type = one entry here.

// The gene catalogue MINUS 'WT' — derived, never a second hand-kept list, so a
// gene added to the catalogue cannot silently go missing from this picker.
// 'WT' is excluded because it is not a marker anyone can CHECK FOR: it is the
// absence of markers, which is what a genotyping result reports when no gene is
// found. Assigning a genotype does offer it (that picker uses the full
// catalogue); asking "which genes should we check" cannot.
export const GENE_CODES: readonly string[] = GENE_CATALOG_CODES.filter(
    (code) => code !== 'WT'
);

export type FieldKind =
    'mouse' | 'cage' | 'litter' | 'genes' | 'date' | 'number' | 'text';

// Optional constraint on a `mouse` field: the picker offers only mice of this
// sex. Present on the breeding fields only — a mating needs a known female and
// a known male, so 'U' (sex not yet recorded) is excluded by construction
// rather than by a validation message (owner, 2026-09-24).
// Deliberately NOT a separate FieldKind: a 'dam' kind would render exactly
// like 'mouse' and duplicate the branch. One optional field, no new branch.

export interface FormField {
    key: string;
    label: string;
    kind: FieldKind;
    sex?: Sex; // `mouse` fields only — see the note above FormField
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
                sex: 'F',
                required: true,
            },
            {
                key: 'father',
                label: 'Father (♂)',
                kind: 'mouse',
                sex: 'M',
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
        // Mate-cycle event following a mating, but the subject is the DAM: a
        // plug check is performed on one female mouse, not on a cage and not
        // on the pair. So it keys by subjectMouseId like every other
        // mouse-subject case, which is also what the fixture already does.
        type: 'Plug check',
        subjectKind: 'mouse',
        subjectFrom: 'mouse',
        fields: [
            {
                key: 'mouse',
                label: 'Dam (♀)',
                kind: 'mouse',
                sex: 'F',
                required: true,
            },
        ],
    },
    {
        // Mate-cycle event: birth/delivery follows plug check, and the dam is
        // the subject of both — she is the one who delivers. The cage is only
        // where she lives. Same correction as Plug check above (owner,
        // 2026-09-24). Like plug check, 'mate'/'cage' did not route this
        // anywhere: buildDateCaseIndex reads caseType for the column and
        // subjectMouseId for the row, so the old shape only kept it OUT of the
        // deliv column it was already mapped to.
        type: 'Birth / delivery',
        subjectKind: 'mouse',
        subjectFrom: 'mouse',
        fields: [
            {
                key: 'mouse',
                label: 'Dam (♀)',
                kind: 'mouse',
                sex: 'F',
                required: true,
            },
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
