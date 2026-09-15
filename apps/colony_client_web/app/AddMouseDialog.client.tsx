'use client';

import { useMemo, useState } from 'react';
import type { Sex } from '@repo/types';
import {
    addMouse,
    peekNextLitterCode,
    useColonyGrid,
    useLitterCodes,
} from '@/lib/mockColonyStore';
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

// Dialog fields:
//   sex        — M / F / U (default U)
//   litter     — select from existing codes or auto-new sentinel
//   pupNumber  — integer ≥ 1
//   dob        — date (defaults to today)
//   line       — pick from SEED_COLONY.lines (filters cage options)
//   cage       — existing cage (by cageId) OR new-cage sentinel
//   slot       — existing slot OR new-slot sentinel (forced new when cage is new)
//   genotype   — free text, optional (defaults to '?')
//
// SERVER ERA SWAP: submit() currently calls addMouse() from the mock store.
// Replace with a POST to colony_server; the server handles mouse_meta INSERT +
// mice version-row INSERT + litter FK. The dialog fields stay the same.

const SELECT_CLASS =
    'h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50';

const SEX_OPTIONS: Sex[] = ['U', 'M', 'F'];

// Sentinel slot-select value meaning "create a new slot label" (vs an existing
// slotId or '' for the cage's first slot).
const NEW_SLOT = '__new__' as const;

// Sentinel cage-select value meaning "create a new cage in the selected line".
// Mirrors the NEW_SLOT pattern so both selects are structurally symmetric.
const NEW_CAGE = '__new_cage__' as const;

// Sentinel litter-select value meaning "use the auto-generated next code".
const LITTER_NEW = '__new_litter__' as const;

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

    // useLitterCodes returns DISTINCT codes latest-first from the live store.
    const litterCodes = useLitterCodes();
    // peekNextLitterCode is a pure read from the counter — no hook needed.
    const nextAutoCode = peekNextLitterCode();

    const [sex, setSex] = useState<Sex>('U');
    // Default litter selection is the auto-sentinel (most common case: new litter).
    const [litterChoice, setLitterChoice] = useState<string>(LITTER_NEW);
    const [pupNumber, setPupNumber] = useState('');
    const [dob, setDob] = useState(TODAY);
    const [lineId, setLineId] = useState<number>(colony.lines[0]?.lineId ?? 0);
    const [cageChoice, setCageChoice] = useState<number | typeof NEW_CAGE>(
        colony.lines[0]?.cages[0]?.cageId ?? NEW_CAGE
    );
    const [newCageNumber, setNewCageNumber] = useState('');
    // Slot select carries a number (existing slot), '' (first slot), or the
    // NEW_SLOT sentinel (create a new label — revealed input below).
    const [slotChoice, setSlotChoice] = useState<number | '' | typeof NEW_SLOT>('');
    const [newSlotLabel, setNewSlotLabel] = useState('');
    const [genotype, setGenotype] = useState('');
    // Rejection from the store surfaces here.
    const [error, setError] = useState<string | null>(null);

    // Cage options filtered by selected line.
    const selectedLine = lineOptions.find((l) => l.lineId === lineId);
    const cageOptions = selectedLine?.cages ?? [];

    const creatingCage = cageChoice === NEW_CAGE;
    // When creating a new cage, the slot area is always in new-slot mode — a
    // fresh cage has no existing slots to choose from.
    const creatingSlot = creatingCage || slotChoice === NEW_SLOT;

    // Slot options filtered by selected cage (irrelevant when creating a cage).
    const selectedCage = creatingCage
        ? null
        : cageOptions.find((c) => c.cageId === cageChoice);
    const slotOptions = selectedCage?.slots ?? [];

    function handleLineChange(newLineId: number) {
        setLineId(newLineId);
        const line = lineOptions.find((l) => l.lineId === newLineId);
        const firstCage = line?.cages[0];
        if (firstCage) {
            setCageChoice(firstCage.cageId);
            setSlotChoice('');
        } else {
            setCageChoice(NEW_CAGE);
            setSlotChoice(NEW_SLOT);
        }
        setNewCageNumber('');
        setError(null);
    }

    function handleCageChange(value: string) {
        setError(null);
        if (value === NEW_CAGE) {
            setCageChoice(NEW_CAGE);
            // Force new-slot mode — a new cage has no slots to choose from.
            setSlotChoice(NEW_SLOT);
        } else {
            setCageChoice(Number(value));
            setSlotChoice('');
        }
        setNewCageNumber('');
    }

    // The actual litter code to submit: auto sentinel → use the peeked code.
    const resolvedLitterCode =
        litterChoice === LITTER_NEW ? nextAutoCode : litterChoice;

    const pupNum = parseInt(pupNumber, 10);
    const newCageNum = newCageNumber.trim() ? parseInt(newCageNumber, 10) : NaN;

    const isMissing =
        !resolvedLitterCode ||
        !pupNumber ||
        isNaN(pupNum) ||
        pupNum < 1 ||
        !dob ||
        (creatingCage && (isNaN(newCageNum) || newCageNum < 1)) ||
        (creatingSlot && !newSlotLabel.trim());

    function reset() {
        setSex('U');
        setLitterChoice(LITTER_NEW);
        setPupNumber('');
        setDob(TODAY);
        setLineId(lineOptions[0]?.lineId ?? 0);
        const firstCage = lineOptions[0]?.cages[0];
        setCageChoice(firstCage?.cageId ?? NEW_CAGE);
        setNewCageNumber('');
        setSlotChoice('');
        setNewSlotLabel('');
        setGenotype('');
        setError(null);
    }

    function submit() {
        if (isMissing) return;
        const result = addMouse({
            sex,
            litterCode: resolvedLitterCode,
            pupNumber: pupNum,
            dob,
            ...(creatingCage
                ? {
                      newCageNumber: newCageNum,
                      lineId,
                      newSlotLabel: newSlotLabel.trim(),
                  }
                : {
                      cageId: cageChoice as number,
                      slotId: typeof slotChoice === 'number' ? slotChoice : undefined,
                      newSlotLabel: slotChoice === NEW_SLOT ? newSlotLabel.trim() : undefined,
                  }),
            genotype: genotype.trim() || undefined,
        });
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

                <Label text="Litter code *">
                    <select
                        className={SELECT_CLASS}
                        value={litterChoice}
                        onChange={(e) => setLitterChoice(e.target.value)}
                    >
                        <option value={LITTER_NEW}>+ new (auto): {nextAutoCode}</option>
                        {litterCodes.map((code) => (
                            <option key={code} value={code}>
                                {code}
                            </option>
                        ))}
                    </select>
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

                <Label text="Cage *">
                    <select
                        className={SELECT_CLASS}
                        value={creatingCage ? NEW_CAGE : String(cageChoice)}
                        onChange={(e) => handleCageChange(e.target.value)}
                    >
                        {cageOptions.map((c) => (
                            <option key={c.cageId} value={c.cageId}>
                                cage {c.cageNumber}
                            </option>
                        ))}
                        <option value={NEW_CAGE}>+ new cage…</option>
                    </select>
                </Label>

                {creatingCage ? (
                    <Label text="New cage number * (unique colony-wide)">
                        <Input
                            type="number"
                            min={1}
                            placeholder="e.g. 2600"
                            value={newCageNumber}
                            onChange={(e) => {
                                setNewCageNumber(e.target.value);
                                setError(null);
                            }}
                        />
                    </Label>
                ) : null}

                {/* Slot select — hidden when creating a new cage (forced new-slot) */}
                {!creatingCage ? (
                    <Label text="Slot (optional — uses first slot if omitted)">
                        <select
                            className={SELECT_CLASS}
                            value={slotChoice}
                            onChange={(e) => {
                                const v = e.target.value;
                                setError(null);
                                setSlotChoice(
                                    v === NEW_SLOT ? NEW_SLOT : v ? Number(v) : ''
                                );
                            }}
                        >
                            <option value="">— any (first slot) —</option>
                            {slotOptions.map((s) => (
                                <option key={s.slotId} value={s.slotId}>
                                    slot {s.label}
                                </option>
                            ))}
                            <option value={NEW_SLOT}>+ new slot…</option>
                        </select>
                    </Label>
                ) : null}

                {creatingSlot ? (
                    <Label text="New slot label * (unique colony-wide)">
                        <Input
                            placeholder="e.g. A8"
                            value={newSlotLabel}
                            onChange={(e) => {
                                setNewSlotLabel(e.target.value);
                                setError(null);
                            }}
                        />
                    </Label>
                ) : null}

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
