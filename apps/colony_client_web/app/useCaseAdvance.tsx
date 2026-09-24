'use client';

import { useState, type ReactNode } from 'react';
import type { CaseTaskStatus, Role } from '@repo/types';
import { setTaskStatus, type PendingMove } from '@/lib/mockStore';
import { MoveDialog } from './MoveDialog.client';

// Advancing a case, once, for every surface that has advance buttons (the
// Tasks board and the drawer case list). Both had their own copy of "call
// setTaskStatus, show the refusal"; a Move case now also needs a dialog in
// between, and two copies of that would be two chances to get the cancel
// wrong.
//
// The flow: advance() asks the store. A Move case whose mouse is not yet in
// the target cage comes back refused WITH `needsMove`, which opens MoveMenu
// prefilled with that cage (the slot is the person's to pick — the case never
// named one). A successful move re-asks the store, which now either advances
// or names the NEXT member of a batch, one dialog per mouse.
//
// CANCEL: onClose only clears `pending`. There is no status write on this path
// at all, and the store refused the advance before the dialog ever opened — so
// a closed dialog leaves the case exactly where it was, and the next attempt
// is refused on the same terms. The guarantee is the store's, not this file's.

interface Pending extends PendingMove {
    caseId: number;
    to: CaseTaskStatus;
}

export function useCaseAdvance(role: Role): {
    advance: (caseId: number, to: CaseTaskStatus) => void;
    error: string | null;
    moveDialog: ReactNode;
} {
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState<Pending | null>(null);

    function advance(caseId: number, to: CaseTaskStatus) {
        const result = setTaskStatus(caseId, to, role);
        if (result.ok) {
            setError(null);
            setPending(null);
            return;
        }
        if (result.needsMove) {
            // Not an error to the person: it is the next thing to do.
            setError(null);
            setPending({ caseId, to, ...result.needsMove });
            return;
        }
        setError(result.error);
        setPending(null);
    }

    return {
        advance,
        error,
        moveDialog: pending ? (
            <MoveDialog
                key={pending.metaId}
                metaId={pending.metaId}
                initialCageCode={pending.toCage}
                onMoved={() => advance(pending.caseId, pending.to)}
                onClose={() => setPending(null)}
            />
        ) : null,
    };
}
