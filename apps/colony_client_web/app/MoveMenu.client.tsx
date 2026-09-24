'use client';

import type { ColonyGrid, MouseCell } from '@repo/types';
import { useMemo, useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import type { MoveTarget } from '@/lib/gridMove';
import { useTasks } from '@/lib/mockStore';
import { buildMouseLabelIndex } from '@/lib/mouseLabel';
import { mouseLabelOf } from '@/lib/mouseIdentity';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// Cascade destination picker: line › cage › slot. Only VALID destinations are
// offered — same line by default; other lines are shown but flagged as a
// cross-line move (a warning, not a hard block — that policy is still open).
// Reuses the colony tree already loaded; no extra fetch.

const NEW_SLOT = 'new';

interface Props {
    colony: ColonyGrid;
    mouse: MouseCell;
    currentLineId: number;
    currentCageId: number;
    currentSlotId: number;
    error: string | null; // a REFUSED move (duplicate slot label, cage gone)
    onMove: (target: MoveTarget) => void;
    onClose: () => void;
}

function Step({ n, label }: { n: number; label: string }) {
    return (
        <div className="mt-3 mb-1 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <span className="flex size-4 items-center justify-center rounded-full bg-secondary font-mono text-[10px]">
                {n}
            </span>
            {label}
        </div>
    );
}

export function MoveMenu({
    colony,
    mouse,
    currentLineId,
    currentCageId,
    currentSlotId,
    error,
    onMove,
    onClose,
}: Props) {
    const [lineId, setLineId] = useState(currentLineId);
    const [cageId, setCageId] = useState<number | null>(null);
    const [slotChoice, setSlotChoice] = useState<string | null>(null);
    const [newLabel, setNewLabel] = useState('');
    // The SAME index the grid and the task board read, so the dialog cannot
    // name the animal differently from the cell it was opened from: a bare
    // mouseLabelOf() here dropped the ".N" reclip suffix. Falls back to the
    // base name only if the mouse is not on the rack the index walked.
    const cases = useTasks();
    const mouseLabels = useMemo(
        () => buildMouseLabelIndex(colony, cases),
        [colony, cases]
    );
    const mouseLabel = mouseLabels.get(mouse.metaId) ?? mouseLabelOf(mouse);

    const line = colony.lines.find((l) => l.lineId === lineId);
    const cage = line?.cages.find((c) => c.cageId === cageId) ?? null;
    const isCrossLine = lineId !== currentLineId;
    const slotIsNew = slotChoice === NEW_SLOT;
    const slotId = slotIsNew ? null : Number(slotChoice);

    const canMove =
        cageId != null &&
        slotChoice != null &&
        slotId !== currentSlotId &&
        (!slotIsNew || newLabel.trim() !== '');

    function pickLine(id: number) {
        setLineId(id);
        setCageId(null);
        setSlotChoice(null);
    }

    function confirm() {
        if (cageId == null || slotChoice == null) return;
        onMove(
            slotIsNew
                ? { cageId, newSlotLabel: newLabel }
                : { cageId, slotId: slotId! }
        );
    }

    const crumb = [
        line?.lineName,
        cage ? `cage ${cage.code}` : '…',
        slotIsNew
            ? `slot ${newLabel.trim() || '?'} (new)`
            : slotChoice != null
              ? `slot ${cage?.slots.find((s) => s.slotId === slotId)?.label}`
              : '…',
    ].join('  ›  ');

    return (
        <Dialog
            open
            onOpenChange={(o) => !o && onClose()}
        >
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        Move{' '}
                        <span className="font-mono text-signal-instruction">
                            {mouseLabel}
                        </span>
                    </DialogTitle>
                </DialogHeader>

                <Step
                    n={1}
                    label="Line"
                />
                <RadioGroup
                    value={String(lineId)}
                    onValueChange={(v) => pickLine(Number(v))}
                >
                    {colony.lines.map((l) => (
                        <label
                            key={l.lineId}
                            className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-accent"
                        >
                            <RadioGroupItem value={String(l.lineId)} />
                            <span className="font-mono">{l.lineName}</span>
                            {l.lineId === currentLineId ? (
                                <span className="ml-auto text-[10px] text-muted-foreground">
                                    same line
                                </span>
                            ) : (
                                <span className="ml-auto flex items-center gap-1 text-[10px] text-signal-instruction">
                                    <TriangleAlert className="size-3" />
                                    cross-line
                                </span>
                            )}
                        </label>
                    ))}
                </RadioGroup>

                <Step
                    n={2}
                    label="Cage"
                />
                <RadioGroup
                    value={cageId != null ? String(cageId) : ''}
                    onValueChange={(v) => {
                        setCageId(Number(v));
                        setSlotChoice(null);
                    }}
                >
                    {(line?.cages ?? []).map((c) => (
                        <label
                            key={c.cageId}
                            className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-accent"
                        >
                            <RadioGroupItem value={String(c.cageId)} />
                            <span className="font-mono">cage {c.code}</span>
                            {c.cageId === currentCageId ? (
                                <span className="ml-auto text-[10px] text-muted-foreground">
                                    current
                                </span>
                            ) : null}
                        </label>
                    ))}
                </RadioGroup>

                <Step
                    n={3}
                    label="Slot"
                />
                <RadioGroup
                    value={slotChoice ?? ''}
                    onValueChange={setSlotChoice}
                >
                    {(cage?.slots ?? []).map((s) => (
                        <label
                            key={s.slotId}
                            className={cn(
                                'flex items-center gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-accent',
                                s.slotId === currentSlotId
                                    ? 'cursor-not-allowed opacity-50'
                                    : 'cursor-pointer'
                            )}
                        >
                            <RadioGroupItem
                                value={String(s.slotId)}
                                disabled={s.slotId === currentSlotId}
                            />
                            <span className="font-mono">slot {s.label}</span>
                            <span className="ml-auto text-[10px] text-muted-foreground">
                                {s.slotId === currentSlotId
                                    ? 'here'
                                    : `${s.mice.length} mice`}
                            </span>
                        </label>
                    ))}
                    {cage ? (
                        <label className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-accent">
                            <RadioGroupItem value={NEW_SLOT} />
                            <span>＋ new slot</span>
                            {slotIsNew ? (
                                <Input
                                    autoFocus
                                    value={newLabel}
                                    onChange={(e) =>
                                        setNewLabel(e.target.value)
                                    }
                                    placeholder="e.g. D8"
                                    className="ml-auto h-7 w-24 font-mono"
                                />
                            ) : null}
                        </label>
                    ) : null}
                </RadioGroup>

                {isCrossLine ? (
                    <p className="mt-3 flex items-start gap-2 rounded-md border border-signal-instruction/30 bg-signal-instruction/5 px-3 py-2 text-xs text-signal-instruction">
                        <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                        Cross-line move — {mouseLabel} would leave its line.
                        Allowed, but confirm this is intended.
                    </p>
                ) : null}

                <div className="mt-3 rounded-md bg-muted px-3 py-2 font-mono text-xs">
                    {crumb}
                </div>

                {error ? (
                    <p className="mt-1 text-xs font-medium text-signal-instruction">
                        {error}
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
                        disabled={!canMove}
                        onClick={confirm}
                    >
                        Move
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
