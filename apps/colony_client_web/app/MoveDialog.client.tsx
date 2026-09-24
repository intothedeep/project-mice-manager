'use client';

import { useState } from 'react';
import { useColonyGrid, applyColonyMove } from '@/lib/mockColonyStore';
import { findMousePlacement } from '@/lib/gridWalk';
import { findCageIdByCode, type MoveTarget } from '@/lib/gridMove';
import { TODAY } from '@/lib/dueDates';
import { MoveMenu } from './MoveMenu.client';

// The ONE place MoveMenu is mounted. Every surface that moves a mouse — the
// grid's Move button, and completing a Move case on the Tasks board or in a
// drawer — renders this and nothing else, so there is a single wiring of
// picker → applyColonyMove → refusal display rather than one per surface.
//
// The caller passes a metaId, not a placement: the mouse's current line/cage/
// slot is READ from the grid here, which is the location log's projection
// (mouseLocations.ts). A caller cannot hand in a stale placement because it
// never handles one.

export function MoveDialog({
    metaId,
    note,
    initialCageCode,
    onMoved,
    onClose,
}: {
    metaId: number;
    // mice.change_note — why this move happened. Omitted for a grid move.
    note?: string;
    // A Move case's destination, as the cage CODE the case stores.
    initialCageCode?: string;
    onMoved: () => void;
    onClose: () => void;
}) {
    const colony = useColonyGrid();
    const [error, setError] = useState<string | null>(null);
    const placement = findMousePlacement(colony, metaId);

    // The mouse left the rack while the dialog was opening. Nothing to move.
    if (!placement) return null;

    function applyMove(target: MoveTarget) {
        // A move can be REFUSED (a duplicate new-slot label, a cage that went
        // away). Keep the dialog open and say so — closing it on failure is
        // how a refusal becomes invisible and looks like a silent success.
        const result = applyColonyMove(metaId, target, TODAY, note);
        if (!result.ok) {
            setError(result.error);
            return;
        }
        setError(null);
        onMoved();
    }

    return (
        <MoveMenu
            colony={colony}
            mouse={placement.mouse}
            currentLineId={placement.lineId}
            currentCageId={placement.cageId}
            currentSlotId={placement.slotId}
            initialCageId={
                initialCageCode
                    ? findCageIdByCode(colony, initialCageCode)
                    : undefined
            }
            error={error}
            onMove={applyMove}
            onClose={onClose}
        />
    );
}
