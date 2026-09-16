'use client';

import { useMemo, useState } from 'react';
import type { Sex } from '@repo/types';
import {
    addMouse,
    peekNextLitterCode,
    useColonyGrid,
    useLitterCodes,
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
// litter / cage / slot are COMBOBOXES (search-or-add). Values are the globally
// unique display strings (litter code / cage number / slot label); submit()
// resolves each to "existing vs new" by a case-insensitive lookup, matching the
// store's global-dedupe semantics. This removes the former select + sentinel +
// revealed-input trio.
//
// SERVER ERA SWAP: submit() currently calls addMouse() from the mock store.
// Replace with a POST to colony_server; the dialog fields stay the same.

const SELECT_CLASS =
    'h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50';

const SEX_OPTIONS: Sex[] = ['U', 'M', 'F'];

export function AddMouseDialog({
    open,
    onClose,
}: {
    open: boolean;
    onClose: () => void;
}) {
    // Picker options derive from the LIVE store, not a frozen seed snapshot —
    // so a slot the user just created shows up for the next littermate.
    const colony = useColonyGrid();
    const lineOptions = useMemo(
        () =>
            colony.lines.map((l) => ({
                lineId: l.lineId,
                lineName: l.lineName,
                cages: l.cages.map((c) => ({
                    cageId: c.cageId,
                    cageNumber: c.cageNumber,
                    slots: c.slots.map((s) => ({ slotId: s.slotId, label: s.label })),
                })),
            })),
        [colony]
    );

    // Distinct existing codes latest-first + the next auto code (pure counter read).
    const litterCodes = useLitterCodes();
    const nextAutoCode = peekNextLitterCode();

    const [sex, setSex] = useState<Sex>('U');
    // litter/cage/slot are plain display strings (see file header).
    const [litterValue, setLitterValue] = useState<string>(nextAutoCode);
    const [pupNumber, setPupNumber] = useState('');
    const [dob, setDob] = useState(TODAY);
    const [lineId, setLineId] = useState<number>(colony.lines[0]?.lineId ?? 0);
    const [cageValue, setCageValue] = useState<string>(
        colony.lines[0]?.cages[0]?.cageNumber ?? ''
    );
    const [slotValue, setSlotValue] = useState(''); // '' = first slot
    const [genotype, setGenotype] = useState('');
    // Rejection from the store surfaces here.
    const [error, setError] = useState<string | null>(null);

    // --- Option lists + existing/new resolution (case-insensitive, matching the
    //     store's dedupe). Cage number and slot label are globally unique, so a
    //     lookup unambiguously tells existing from new. ---
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
    const isNewSlot = isNewCage || (slotValue.trim() !== '' && !slotMatch);

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
    const isMissing =
        !litterOk ||
        !pupNumber ||
        isNaN(pupNum) ||
        pupNum < 1 ||
        !dob ||
        cageValue.trim() === '' ||
        (isNewCage && (isNaN(newCageNum) || newCageNum < 1)) ||
        // A brand-new cage has no slots — the user must name its first slot.
        (isNewCage && slotValue.trim() === '');

    function handleLineChange(newLineId: number) {
        setLineId(newLineId);
        const line = lineOptions.find((l) => l.lineId === newLineId);
        setCageValue(line?.cages[0]?.cageNumber ?? '');
        setSlotValue('');
        setError(null);
    }

    function handleCageChange(value: string) {
        setCageValue(value);
        setSlotValue(''); // cage changed → prior slot label no longer applies
        setError(null);
    }

    function reset() {
        setSex('U');
        // Fresh peek: the counter may have advanced on the insert we just made.
        setLitterValue(peekNextLitterCode());
        setPupNumber('');
        setDob(TODAY);
        const firstLine = lineOptions[0];
        setLineId(firstLine?.lineId ?? 0);
        setCageValue(firstLine?.cages[0]?.cageNumber ?? '');
        setSlotValue('');
        setGenotype('');
        setError(null);
    }

    function submit() {
        if (isMissing) return;
        const base = {
            sex,
            litterCode: litterValue.trim(),
            pupNumber: pupNum,
            dob,
            genotype: genotype.trim() || undefined,
        };
        const result = addMouse(
            isNewCage
                ? {
                      ...base,
                      newCageNumber: newCageNum,
                      lineId,
                      newSlotLabel: slotValue.trim(),
                  }
                : {
                      ...base,
                      cageId: cageMatch!.cageId,
                      slotId:
                          !isNewSlot && slotValue.trim() !== ''
                              ? slotMatch!.slotId
                              : undefined,
                      newSlotLabel: isNewSlot ? slotValue.trim() : undefined,
                  }
        );
        if (!result.ok) {
            // Keep the dialog open so the user can fix the issue.
            setError(result.error);
            return;
        }
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
                    <DialogTitle>Add mouse</DialogTitle>
                </DialogHeader>

                <Label text="Sex">
                    <select
                        className={SELECT_CLASS}
                        value={sex}
                        onChange={(e) => setSex(e.target.value as Sex)}
                    >
                        {SEX_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                                {s === 'M' ? 'M — male' : s === 'F' ? 'F — female' : 'U — unsexed'}
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

                <Label text="Line">
                    <select
                        className={SELECT_CLASS}
                        value={lineId}
                        onChange={(e) => handleLineChange(Number(e.target.value))}
                    >
                        {lineOptions.map((l) => (
                            <option key={l.lineId} value={l.lineId}>
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
                        isNewCage
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
                        emptyLabel={isNewCage ? undefined : '— first slot —'}
                    />
                </Label>

                {error ? (
                    <p className="mt-2 text-xs font-medium text-signal-instruction">
                        {error}
                    </p>
                ) : null}

                <Label text="Genotype (optional — defaults to ?)">
                    <Input
                        placeholder="e.g. Nf1 f/+"
                        value={genotype}
                        onChange={(e) => setGenotype(e.target.value)}
                    />
                </Label>

                <DialogFooter>
                    <Button variant="outline" size="sm" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button size="sm" disabled={isMissing} onClick={submit}>
                        Add mouse
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
