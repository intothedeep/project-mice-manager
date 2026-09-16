'use client';

import { useState } from 'react';
import { addLine } from '@/lib/mockColonyStore';
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
// Collects lineName (required) and an optional hex color for nominalGenotypeColor.

export function AddLineDialog({
    open,
    onClose,
}: {
    open: boolean;
    onClose: () => void;
}) {
    const [lineName, setLineName] = useState('');
    const [color, setColor] = useState('');
    const [error, setError] = useState<string | null>(null);

    const isMissing = lineName.trim() === '';

    function submit() {
        if (isMissing) return;
        const result = addLine({
            lineName: lineName.trim(),
            nominalGenotypeColor: color.trim() || null,
        });
        if (!result.ok) {
            setError(result.error);
            return;
        }
        setLineName('');
        setColor('');
        setError(null);
        onClose();
    }

    function handleClose() {
        setLineName('');
        setColor('');
        setError(null);
        onClose();
    }

    return (
        <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
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
                        onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
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

                {error ? (
                    <p className="mt-2 text-xs font-medium text-signal-instruction">
                        {error}
                    </p>
                ) : null}

                <DialogFooter>
                    <Button variant="outline" size="sm" onClick={handleClose}>
                        Cancel
                    </Button>
                    <Button size="sm" disabled={isMissing} onClick={submit}>
                        Add line
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
