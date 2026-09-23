'use client';

import { useMemo, useState } from 'react';
import type { TaskSignal } from '@repo/types';
import { addTask } from '@/lib/mockStore';
import { useColonyGrid, useLitterCodes } from '@/lib/mockColonyStore';
import { mouseLabelOf } from '@/lib/mouseIdentity';
import {
    GENE_CODES,
    TASK_TYPES,
    type FormField,
    type TaskTypeDef,
} from '@/lib/taskTypes';
import { TODAY, addDays } from '@/lib/dueDates';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CodeBadgeSelect } from '@/components/ui/code-badge-select';

type Values = Record<string, string | string[]>;

const SELECT_CLASS =
    'h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50';

export function NewTaskDialog({
    open,
    onClose,
    preset,
}: {
    open: boolean;
    onClose: () => void;
    // Batch mode: when set, create ONE case with subjectKind='mice' covering
    // all these mice. metaId drives the badge index; label is the mouseLabel.
    preset?: { metaId: number; label: string }[];
}) {
    // In batch mode the subject is the preset mice, so only mouse-subject task
    // types make sense and their own "mouse" field is hidden.
    const batch = preset != null && preset.length > 0;
    const TYPES = useMemo(
        () =>
            batch
                ? TASK_TYPES.filter((t) => t.subjectKind === 'mouse')
                : TASK_TYPES,
        [batch]
    );

    const [typeName, setTypeName] = useState(TYPES[0]!.type);
    const [signal, setSignal] = useState<TaskSignal>('instruction');
    const [values, setValues] = useState<Values>({});
    // Default due date is 1 week out (user directive) — a sensible lead time;
    // the user can still change it, and cascade types override via dueFromField.
    const [due, setDue] = useState(addDays(TODAY, 7));
    const [assignee, setAssignee] = useState('');

    // Litter options come from LIVE colony state, never a hand-kept list: a
    // litter exists only because a mouse carries its code, so the store's
    // derivation is the only thing that knows which ones there are. Read at the
    // component top (same as AddMouseDialog) and passed down, because
    // taskTypes.ts is a static schema module and cannot call a hook.
    const litterOptions = useLitterCodes();

    // Mouse and cage options come from the same LIVE state, for the same
    // reason: a mouse added through AddMouseDialog must be selectable as a
    // task subject immediately. Labels are COMPOSED here (mouseLabelOf), never
    // stored — the ".N" reclip suffix is a separate outer layer the dialog has
    // never shown, so it is not composed in.
    const grid = useColonyGrid();
    const mouseOptions = useMemo(
        () =>
            Array.from(
                new Set(
                    grid.lines.flatMap((l) =>
                        l.cages.flatMap((c) =>
                            c.slots.flatMap((s) =>
                                s.mice.map((m) => mouseLabelOf(m))
                            )
                        )
                    )
                )
            ),
        [grid]
    );
    const cageOptions = useMemo(
        () => grid.lines.flatMap((l) => l.cages.map((c) => c.cageNumber)),
        [grid]
    );

    const def = useMemo(
        () => TYPES.find((t) => t.type === typeName) ?? TYPES[0]!,
        [TYPES, typeName]
    );

    const shownFields = def.fields.filter(
        (f) => !(batch && f.kind === 'mouse')
    );

    function pickType(name: string) {
        setTypeName(name);
        setValues({});
    }
    function setField(key: string, v: string | string[]) {
        setValues((prev) => ({ ...prev, [key]: v }));
    }

    const missing = shownFields
        .filter((f) => f.required)
        .some((f) => {
            const v = values[f.key];
            return (
                v == null || v === '' || (Array.isArray(v) && v.length === 0)
            );
        });

    function reset() {
        setTypeName(TYPES[0]!.type);
        setSignal('instruction');
        setValues({});
        setDue(addDays(TODAY, 7));
        setAssignee('');
    }

    function submit() {
        if (missing) return;
        const subjectLabel = batch
            ? batchSubjectLabel(preset!.map((m) => m.label))
            : buildSubjectLabel(def, values);
        const dueDate = def.dueFromField
            ? String(values[def.dueFromField] || due)
            : due;
        addTask({
            def,
            signal,
            values,
            subjectLabel,
            detail: buildDetail(def, values),
            dueDate,
            assignee: assignee.trim() || null,
            // Pass mice pairs so addTask builds subjectKind='mice' case.
            mice: batch ? preset! : undefined,
        });
        reset();
        onClose();
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(o) => !o && onClose()}
        >
            <DialogContent className="max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {batch
                            ? `New task · ${preset!.length} mice`
                            : 'New task'}
                    </DialogTitle>
                </DialogHeader>

                {batch ? (
                    <p className="rounded-md bg-muted px-3 py-2 font-mono text-[11px]">
                        {preset!.map((m) => m.label).join(', ')}
                    </p>
                ) : null}

                <Label text="Type">
                    <select
                        className={SELECT_CLASS}
                        value={typeName}
                        onChange={(e) => pickType(e.target.value)}
                    >
                        {TYPES.map((t) => (
                            <option
                                key={t.type}
                                value={t.type}
                            >
                                {t.type}
                            </option>
                        ))}
                    </select>
                </Label>

                <Label text="Signal">
                    <select
                        className={SELECT_CLASS}
                        value={signal}
                        onChange={(e) =>
                            setSignal(e.target.value as TaskSignal)
                        }
                    >
                        <option value="instruction">instruction</option>
                        <option value="plan">plan</option>
                        <option value="note">note</option>
                    </select>
                </Label>

                {shownFields.map((f) => (
                    <Label
                        key={f.key}
                        text={f.label + (f.required ? ' *' : '')}
                    >
                        <FieldInput
                            field={f}
                            mouseOptions={mouseOptions}
                            cageOptions={cageOptions}
                            litterOptions={litterOptions}
                            value={values[f.key]}
                            onChange={(v) => setField(f.key, v)}
                        />
                    </Label>
                ))}

                {def.dueFromField ? null : (
                    <Label text="Due date">
                        <Input
                            type="date"
                            value={due}
                            onChange={(e) => setDue(e.target.value)}
                        />
                    </Label>
                )}

                <Label text="Assignee">
                    <Input
                        placeholder="person or group (optional)"
                        value={assignee}
                        onChange={(e) => setAssignee(e.target.value)}
                    />
                </Label>

                {def.cascade ? (
                    <p className="rounded-md bg-muted px-3 py-2 text-[11px] text-muted-foreground">
                        Creating this mating will auto-add a plug check (+10d)
                        and expected delivery (+20d) to Upcoming.
                    </p>
                ) : null}

                <DialogFooter>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onClose}
                    >
                        Cancel
                    </Button>
                    <Button
                        size="sm"
                        disabled={missing}
                        onClick={submit}
                    >
                        Create task
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function Label({
    text,
    children,
}: {
    text: string;
    children: React.ReactNode;
}) {
    return (
        <label className="mt-3 flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            {text}
            {children}
        </label>
    );
}

function FieldInput({
    field,
    mouseOptions,
    cageOptions,
    litterOptions,
    value,
    onChange,
}: {
    field: FormField;
    mouseOptions: string[];
    cageOptions: string[];
    litterOptions: string[];
    value: string | string[] | undefined;
    onChange: (v: string | string[]) => void;
}) {
    switch (field.kind) {
        case 'mouse':
        case 'cage':
        case 'litter': {
            const opts =
                field.kind === 'mouse'
                    ? mouseOptions
                    : field.kind === 'cage'
                      ? cageOptions
                      : litterOptions;
            return (
                <select
                    className={SELECT_CLASS}
                    value={(value as string) ?? ''}
                    onChange={(e) => onChange(e.target.value)}
                >
                    <option value="">— select —</option>
                    {opts.map((o) => (
                        <option
                            key={o}
                            value={o}
                        >
                            {field.kind === 'cage' ? `cage ${o}` : o}
                        </option>
                    ))}
                </select>
            );
        }
        case 'genes':
            // GENE_CODES, not the gene catalogue: a "genes to check" list is
            // about real markers, so it deliberately omits 'WT'.
            return (
                <CodeBadgeSelect
                    options={GENE_CODES}
                    selected={(value as string[]) ?? []}
                    onChange={onChange}
                />
            );
        case 'number':
            return (
                <Input
                    type="number"
                    value={(value as string) ?? ''}
                    onChange={(e) => onChange(e.target.value)}
                />
            );
        case 'date':
            return (
                <Input
                    type="date"
                    value={(value as string) ?? ''}
                    onChange={(e) => onChange(e.target.value)}
                />
            );
        default:
            return (
                <Input
                    value={(value as string) ?? ''}
                    onChange={(e) => onChange(e.target.value)}
                />
            );
    }
}

function batchSubjectLabel(labels: string[]): string {
    const head = labels.slice(0, 3).join(', ');
    return labels.length > 3
        ? `${labels.length} mice: ${head}…`
        : `${labels.length} mice: ${head}`;
}

function buildSubjectLabel(def: TaskTypeDef, values: Values): string | null {
    if (def.cascade) {
        return `${values.mother ?? '?'} × ${values.father ?? '?'}`;
    }
    if (def.subjectFrom) {
        const v = String(values[def.subjectFrom] ?? '');
        if (!v) return null;
        return def.subjectKind === 'cage' ? `cage ${v}` : v;
    }
    return null;
}

function buildDetail(def: TaskTypeDef, values: Values): string | null {
    const parts = def.fields
        .filter(
            (f) =>
                f.key !== def.subjectFrom &&
                f.key !== 'mother' &&
                f.key !== 'father' &&
                f.key !== 'matingDate'
        )
        .map((f) => {
            const v = values[f.key];
            if (v == null || v === '' || (Array.isArray(v) && v.length === 0)) {
                return null;
            }
            if (f.kind === 'genes') return (v as string[]).join(', ');
            if (f.key === 'toCage') return `→ cage ${v}`;
            if (f.kind === 'number') return `${v} ${f.label.toLowerCase()}`;
            return `${f.label.toLowerCase()}: ${v}`;
        })
        .filter(Boolean);
    return parts.length > 0 ? parts.join(' · ') : null;
}
