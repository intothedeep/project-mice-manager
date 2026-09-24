'use client';

import { useEffect, useState } from 'react';
import { addLine, suggestNextCageCode } from '@/lib/mockColonyStore';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Small dialog for creating a new mouse line (+ line tail affordance).
// Collects lineName (required), an optional hex color for nominalGenotypeColor,
// and — since line >= 1 cage is a structural invariant (colonyMutations.ts) —
// the first cage code + slot label. No mouse: this dialog never created one.

export function AddLineDialog({
    open,
    onClose,
}: {
    open: boolean;
    onClose: () => void;
}) {
    const [lineName, setLineName] = useState('');
    const [color, setColor] = useState('');
    // Recomputed on OPEN, not at mount: this dialog stays mounted for the
    // life of the page, so a mount-time suggestion goes stale the moment a
    // cage is added elsewhere and then pre-fills a duplicate code.
    const [cageCode, setCageCode] = useState('');
    const [slotLabel, setSlotLabel] = useState('');
    const [error, setError] = useState<string | null>(null);

    const cageCodeNum = parseInt(cageCode.trim(), 10);
    const isMissing =
        lineName.trim() === '' ||
        cageCode.trim() === '' ||
        isNaN(cageCodeNum) ||
        cageCodeNum < 1 ||
        slotLabel.trim() === '';

    function submit() {
        if (isMissing) return;
        const result = addLine({
            lineName: lineName.trim(),
            nominalGenotypeColor: color.trim() || null,
            cageCode: cageCode.trim(),
            slotLabel: slotLabel.trim(),
        });
        if (!result.ok) {
            setError(result.error);
            return;
        }
        reset();
        onClose();
    }

    // Seed the cage suggestion whenever the dialog OPENS. This component stays
    // mounted for the life of the page, so a mount-time value goes stale as soon
    // as a cage is created elsewhere and would then pre-fill a duplicate.
    useEffect(() => {
        if (!open) return;
        setCageCode(suggestNextCageCode());
    }, [open]);

    function reset() {
        setLineName('');
        setColor('');
        setCageCode(suggestNextCageCode());
        setSlotLabel('');
        setError(null);
    }

    function handleClose() {
        reset();
        onClose();
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(o) => !o && handleClose()}
        >
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add line</DialogTitle>
                </DialogHeader>

                <label className="mt-3 flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                    Line name *
                    <Input
                        autoFocus
                        placeholder="e.g. pNf1 flox;ccEGFP"
                        value={lineName}
                        onChange={(e) => {
                            setLineName(e.target.value);
                            setError(null);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') submit();
                        }}
                    />
                </label>

                <label className="mt-3 flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                    Genotype colour (optional hex, e.g. #4f9cf9)
                    <Input
                        placeholder="#4f9cf9"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                    />
                </label>

                <label className="mt-3 flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                    First cage number * (unique colony-wide)
                    <Input
                        type="number"
                        min={1}
                        placeholder="e.g. 12"
                        value={cageCode}
                        onChange={(e) => {
                            setCageCode(e.target.value);
                            setError(null);
                        }}
                    />
                </label>

                <label className="mt-3 flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                    First slot label * (unique colony-wide)
                    <Input
                        placeholder="e.g. F5"
                        value={slotLabel}
                        onChange={(e) => {
                            setSlotLabel(e.target.value);
                            setError(null);
                        }}
                    />
                </label>

                {error ? (
                    <p className="mt-2 text-xs font-medium text-signal-instruction">
                        {error}
                    </p>
                ) : null}

                <DialogFooter>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleClose}
                    >
                        Cancel
                    </Button>
                    <Button
                        size="sm"
                        disabled={isMissing}
                        onClick={submit}
                    >
                        Add line
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
