'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Sex } from '@repo/types';
import {
    addMouse,
    addCage,
    addSlot,
    peekNextLitterCode,
    suggestNextCageNumber,
    useColonyGrid,
    useLitterCodes,
    type AddCageInput,
    type AddMouseInput,
    type AddMouseResult,
    type AddSlotInput,
    type MouseSpec,
} from '@/lib/mockColonyStore';
import { parseLitterCode } from '@/lib/litterCode';
import { TODAY } from '@/lib/dueDates';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Combobox, type ComboOption } from '@/components/ui/combobox';

// Dialog fields:
//   sex       — M / F / U (default U)
//   litter    — combobox: pick an existing code, the auto-next code, or type + Add
//   pupNumber — integer ≥ 1
//   dob       — date (defaults to today)
//   line      — pick from the live colony's lines (filters cage options)
//   cage      — combobox over cage numbers; typing a new number creates a cage
//   slot      — combobox over slot labels; empty = first slot; typing = new slot
//   genotype  — free text, optional (defaults to '?')
//
// Optional prefill props (Step 6): initialLineId / initialCageId / initialSlotId
// seed the corresponding pickers on open. Prefill is resolved to display strings
// so the existing string-based state/validation logic is unchanged.
//
// Mode (line/cage/slot/mouse rail) is DERIVED from the prefill shape via
// resolveAddMode — never guessed from combobox state. Only the mouse rail
// forces a mouse; the three container rails default the "Add first mouse
// now" toggle OFF (line ≥ 1 cage, cage ≥ 1 slot, slot MAY be empty).
//
// SERVER ERA SWAP: submit() currently calls addMouse()/addSlot()/addCage()
// from the mock store. Replace with a POST to colony_server; the dialog
// fields stay the same.

const SELECT_CLASS =
    'h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50';

const SEX_OPTIONS: Sex[] = ['U', 'M', 'F'];

export type AddMode = 'cage' | 'slot' | 'mouse';

const MODE_TITLE: Record<AddMode, string> = {
    cage: 'Add cage',
    slot: 'Add slot',
    mouse: 'Add mouse',
};

// Prefill shape → target rail. cageId+slotId (mouse rail) must win over
// cageId alone (slot rail), which must win over lineId alone (cage rail) —
// ColonyGridView only ever sends one of those three shapes, plus {} from the
// standalone "Add mouse" button, which has no prefill and falls through to
// 'mouse' (adds into line[0]/cage[0], the dialog's original default).
export function resolveAddMode(prefill: {
    lineId?: number;
    cageId?: number;
    slotId?: number;
}): AddMode {
    if (prefill.cageId !== undefined && prefill.slotId !== undefined)
        return 'mouse';
    if (prefill.cageId !== undefined) return 'slot';
    if (prefill.lineId !== undefined) return 'cage';
    return 'mouse';
}

export type SubmitAction =
    | { kind: 'cage'; input: AddCageInput }
    | { kind: 'slot'; input: AddSlotInput }
    | { kind: 'mouse'; input: AddMouseInput }
    | { kind: 'none' };

// Picks the mutation + payload from the resolved combobox state. A brand-new
// cage/slot always wins over "place into the matched slot", mirroring
// colonyMutations' own layering (addCage/addSlot delegate to addMouse
// internally). `mouse` is only attached to a container payload when the
// toggle is on — never fabricated, per the bug this fixes.
export function buildSubmitAction(params: {
    isNewCage: boolean;
    isNewSlot: boolean;
    needsMouse: boolean;
    mouse: MouseSpec;
    lineId: number;
    newCageNumber: number;
    slotLabel: string;
    cageId?: number;
    existingSlotId?: number;
}): SubmitAction {
    const {
        isNewCage,
        isNewSlot,
        needsMouse,
        mouse,
        lineId,
        newCageNumber,
        slotLabel,
        cageId,
        existingSlotId,
    } = params;

    if (isNewCage) {
        return {
            kind: 'cage',
            input: {
                lineId,
                cageNumber: newCageNumber,
                slotLabel,
                mouse: needsMouse ? mouse : undefined,
            },
        };
    }
    if (isNewSlot) {
        if (cageId === undefined) return { kind: 'none' };
        return {
            kind: 'slot',
            input: { cageId, slotLabel, mouse: needsMouse ? mouse : undefined },
        };
    }
    if (!needsMouse || cageId === undefined || existingSlotId === undefined) {
        return { kind: 'none' };
    }
    return {
        kind: 'mouse',
        input: { ...mouse, cageId, slotId: existingSlotId },
    };
}

export function AddMouseDialog({
    open,
    onClose,
    initialLineId,
    initialCageId,
    initialSlotId,
}: {
    open: boolean;
    onClose: () => void;
    initialLineId?: number;
    initialCageId?: number;
    initialSlotId?: number;
}) {
    const colony = useColonyGrid();
    const lineOptions = useMemo(
        () =>
            colony.lines.map((l) => ({
                lineId: l.lineId,
                lineName: l.lineName,
                cages: l.cages.map((c) => ({
                    cageId: c.cageId,
                    cageNumber: c.cageNumber,
                    slots: c.slots.map((s) => ({
                        slotId: s.slotId,
                        label: s.label,
                    })),
                })),
            })),
        [colony]
    );

    const litterCodes = useLitterCodes();
    const nextAutoCode = peekNextLitterCode();

    // Mode never changes across a mount — the dialog is remounted (fresh
    // key) on every open, so deriving it straight from props is equivalent
    // to (and simpler than) tracking it in the open-effect below.
    const mode = useMemo(
        () =>
            resolveAddMode({
                lineId: initialLineId,
                cageId: initialCageId,
                slotId: initialSlotId,
            }),
        [initialLineId, initialCageId, initialSlotId]
    );

    // Resolve prefill IDs → display strings once on open.
    // WHY on open (not on mount): the dialog is conditionally mounted so mount ≈
    // open. Using an effect keyed on `open` also handles re-open after close with
    // different prefill values (no stale state).
    const [sex, setSex] = useState<Sex>('U');
    const [litterValue, setLitterValue] = useState<string>(nextAutoCode);
    const [pupNumber, setPupNumber] = useState('');
    const [dob, setDob] = useState(TODAY);
    const [lineId, setLineId] = useState<number>(colony.lines[0]?.lineId ?? 0);
    const [cageValue, setCageValue] = useState<string>(
        colony.lines[0]?.cages[0]?.cageNumber ?? ''
    );
    const [slotValue, setSlotValue] = useState('');
    // Container rails default OFF: creating an empty slot is the common case
    // (a cage is labelled and racked before an animal goes in). Not shown at
    // all on the mouse rail, where a mouse is always required.
    const [includeMouse, setIncludeMouse] = useState(false);
    const [genotype, setGenotype] = useState('');
    const [error, setError] = useState<string | null>(null);

    const needsMouse = mode === 'mouse' || includeMouse;

    // Seed from prefill props whenever the dialog opens. Resolves IDs to display
    // strings; falls back to defaults when the ID is absent or not found.
    useEffect(() => {
        if (!open) return;

        // Find the cage by initialCageId (searches all lines).
        let resolvedLineId = initialLineId ?? colony.lines[0]?.lineId ?? 0;
        let resolvedCageValue = '';
        let resolvedSlotValue = '';

        if (initialCageId !== undefined) {
            for (const l of colony.lines) {
                const cage = l.cages.find((c) => c.cageId === initialCageId);
                if (cage) {
                    // The cage's owning line must be selected so cageOptions includes it.
                    resolvedLineId = l.lineId;
                    resolvedCageValue = cage.cageNumber;
                    if (initialSlotId !== undefined) {
                        const slot = cage.slots.find(
                            (s) => s.slotId === initialSlotId
                        );
                        if (slot) resolvedSlotValue = slot.label;
                    }
                    break;
                }
            }
        } else if (initialLineId !== undefined) {
            // Only line prefilled — open in NEW-CAGE mode (empty field, never the
            // line's existing first cage) with a freely-editable next-number guess.
            resolvedCageValue = suggestNextCageNumber();
        } else {
            // No prefill: default to line[0] cage[0].
            resolvedCageValue = colony.lines[0]?.cages[0]?.cageNumber ?? '';
        }

        setSex('U');
        setLitterValue(peekNextLitterCode());
        setPupNumber('');
        setDob(TODAY);
        setLineId(resolvedLineId);
        setCageValue(resolvedCageValue);
        setSlotValue(resolvedSlotValue);
        setIncludeMouse(false);
        setGenotype('');
        setError(null);
    }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

    // --- Option lists + existing/new resolution ---
    const selectedLine = lineOptions.find((l) => l.lineId === lineId);
    const cages = selectedLine?.cages ?? [];
    const cageOptions: ComboOption[] = cages.map((c) => ({
        value: c.cageNumber,
        label: `cage ${c.cageNumber}`,
    }));
    const cageMatch = cages.find(
        (c) => c.cageNumber.toLowerCase() === cageValue.trim().toLowerCase()
    );
    const isNewCage = cageValue.trim() !== '' && !cageMatch;

    const slots = cageMatch?.slots ?? [];
    const slotOptions: ComboOption[] = slots.map((s) => ({
        value: s.label,
        label: `slot ${s.label}`,
    }));
    const slotMatch = slots.find(
        (s) => s.label.toLowerCase() === slotValue.trim().toLowerCase()
    );
    const isNewSlot =
        isNewCage || mode === 'slot' || (slotValue.trim() !== '' && !slotMatch);

    const litterOptions: ComboOption[] = [
        { value: nextAutoCode, label: `auto next: ${nextAutoCode}` },
        ...litterCodes
            .filter((c) => c !== nextAutoCode)
            .map((c) => ({ value: c })),
    ];

    // --- validation ---
    const pupNum = parseInt(pupNumber, 10);
    const litterOk = parseLitterCode(litterValue.trim()) !== null;
    const newCageNum = isNewCage ? parseInt(cageValue.trim(), 10) : NaN;
    const mouseMissing =
        needsMouse &&
        (!litterOk || !pupNumber || isNaN(pupNum) || pupNum < 1 || !dob);
    const containerMissing =
        cageValue.trim() === '' ||
        (isNewCage && (isNaN(newCageNum) || newCageNum < 1)) ||
        ((isNewCage || mode === 'slot') && slotValue.trim() === '');
    // Nothing would happen: existing cage + existing/first slot + toggle off.
    const nothingToSubmit = !isNewCage && !isNewSlot && !needsMouse;
    const isMissing = mouseMissing || containerMissing || nothingToSubmit;

    function handleLineChange(newLineId: number) {
        setLineId(newLineId);
        const line = lineOptions.find((l) => l.lineId === newLineId);
        // In cage mode the INTENT is a new cage, so switching lines must keep
        // offering one. Falling back to the line's first existing cage here
        // would flip isNewCage false and silently disable submit while the
        // title still says "Add cage" — a dead end with no message.
        setCageValue(
            mode === 'cage'
                ? suggestNextCageNumber()
                : (line?.cages[0]?.cageNumber ?? '')
        );
        setSlotValue('');
        setError(null);
    }

    function handleCageChange(value: string) {
        setCageValue(value);
        setSlotValue('');
        setError(null);
    }

    function submit() {
        if (isMissing) return;
        const mouse: MouseSpec = {
            sex,
            litterCode: litterValue.trim(),
            pupNumber: pupNum,
            dob,
            genotype: genotype.trim() || undefined,
            // The implicit toe punch is dated to now (when it physically
            // happens), never to dob — a mouse entered weeks after birth
            // must not inherit a birthday-dated punch.
            punchEffectiveAt: TODAY,
        };

        const action = buildSubmitAction({
            isNewCage,
            isNewSlot,
            needsMouse,
            mouse,
            lineId,
            newCageNumber: newCageNum,
            slotLabel: slotValue.trim(),
            cageId: cageMatch?.cageId,
            existingSlotId: slotMatch?.slotId ?? cageMatch?.slots[0]?.slotId,
        });

        let result: AddMouseResult;
        switch (action.kind) {
            case 'cage':
                result = addCage(action.input);
                break;
            case 'slot':
                result = addSlot(action.input);
                break;
            case 'mouse':
                result = addMouse(action.input);
                break;
            case 'none':
                setError(
                    'Cage has no slot — create a new slot label to place the mouse.'
                );
                return;
        }
        if (!result.ok) {
            setError(result.error);
            return;
        }
        onClose();
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(o) => !o && onClose()}
        >
            <DialogContent className="max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{MODE_TITLE[mode]}</DialogTitle>
                </DialogHeader>

                {mode !== 'mouse' ? (
                    <label className="mt-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                        <input
                            type="checkbox"
                            checked={includeMouse}
                            onChange={(e) => setIncludeMouse(e.target.checked)}
                        />
                        Add first mouse now
                        <span className="font-normal text-muted-foreground/70">
                            (off = leaves the slot empty)
                        </span>
                    </label>
                ) : null}

                {needsMouse ? (
                    <>
                        <Label text="Sex">
                            <select
                                className={SELECT_CLASS}
                                value={sex}
                                onChange={(e) => setSex(e.target.value as Sex)}
                            >
                                {SEX_OPTIONS.map((s) => (
                                    <option
                                        key={s}
                                        value={s}
                                    >
                                        {s === 'M'
                                            ? 'M — male'
                                            : s === 'F'
                                              ? 'F — female'
                                              : 'U — unsexed'}
                                    </option>
                                ))}
                            </select>
                        </Label>

                        <Label text="Litter code * (search or add)">
                            <Combobox
                                value={litterValue}
                                onChange={(v) => {
                                    setLitterValue(v);
                                    setError(null);
                                }}
                                options={litterOptions}
                                placeholder="search or add code"
                                addLabel={(t) => `+ Add litter ${t}`}
                                transform={(t) => t.toUpperCase()}
                            />
                        </Label>

                        <Label text="Pup number *">
                            <Input
                                type="number"
                                min={1}
                                placeholder="e.g. 9"
                                value={pupNumber}
                                onChange={(e) => setPupNumber(e.target.value)}
                            />
                        </Label>

                        <Label text="Date of birth *">
                            <Input
                                type="date"
                                value={dob}
                                onChange={(e) => setDob(e.target.value)}
                            />
                        </Label>
                    </>
                ) : null}

                <Label text="Line">
                    <select
                        className={SELECT_CLASS}
                        value={lineId}
                        onChange={(e) =>
                            handleLineChange(Number(e.target.value))
                        }
                    >
                        {lineOptions.map((l) => (
                            <option
                                key={l.lineId}
                                value={l.lineId}
                            >
                                {l.lineName}
                            </option>
                        ))}
                    </select>
                </Label>

                <Label text="Cage * (search or add)">
                    <Combobox
                        value={cageValue}
                        onChange={handleCageChange}
                        options={cageOptions}
                        placeholder="search or add cage #"
                        addLabel={(t) => `+ Add cage ${t}`}
                    />
                </Label>

                <Label
                    text={
                        isNewCage || mode === 'slot'
                            ? 'New slot label * (unique colony-wide)'
                            : 'Slot (search or add — first slot if empty)'
                    }
                >
                    <Combobox
                        value={slotValue}
                        onChange={(v) => {
                            setSlotValue(v);
                            setError(null);
                        }}
                        options={slotOptions}
                        placeholder="search or add slot"
                        addLabel={(t) => `+ Add slot ${t}`}
                        emptyLabel={
                            isNewCage || mode === 'slot'
                                ? undefined
                                : '— first slot —'
                        }
                    />
                </Label>

                {error ? (
                    <p className="mt-2 text-xs font-medium text-signal-instruction">
                        {error}
                    </p>
                ) : null}

                {needsMouse ? (
                    <Label text="Genotype (optional — defaults to ?)">
                        <Input
                            placeholder="e.g. Nf1 f/+"
                            value={genotype}
                            onChange={(e) => setGenotype(e.target.value)}
                        />
                    </Label>
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
                        disabled={isMissing}
                        onClick={submit}
                    >
                        {MODE_TITLE[mode]}
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
