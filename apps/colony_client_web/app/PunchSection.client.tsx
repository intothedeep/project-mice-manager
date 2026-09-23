'use client';

import { useState } from 'react';
import type { MouseCell, PunchLocation } from '@repo/types';
import { addPunch, removePunch, usePunchLog } from '@/lib/mockColonyStore';
import { TODAY } from '@/lib/dueDates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { SELECT_CLASS, PUNCH_LOCATION_OPTIONS } from './AddMouseDialog.client';

// `untagged` is minted with the mouse and never removed, so it is not an
// option a user can add. addPunch refuses it too — this only hides it.
const ADDABLE_LOCATIONS = PUNCH_LOCATION_OPTIONS.filter(
    (p) => p !== 'untagged'
);

// Task 13, punch half. ONE mutation path — addPunch/removePunch (step 7's
// store wrappers) — with two views on it: this section's active/history list,
// and IdentitySection's read-only "N active ear punches" projection. No
// second add/remove control belongs anywhere else.
//
// History comes from usePunchLog(metaId), not MouseCell.punches — a removed
// row stays visible here with deletedAt set while it drops out of the grid's
// active list.
export function PunchSection({ mouse }: { mouse: MouseCell }) {
    const log = usePunchLog(mouse.metaId);
    const [location, setLocation] = useState<PunchLocation>('ear');
    const [effectiveAt, setEffectiveAt] = useState(TODAY);
    const [note, setNote] = useState('');
    const [error, setError] = useState<string | null>(null);

    function handleAdd() {
        const result = addPunch({
            metaId: mouse.metaId,
            location,
            effectiveAt,
            ...(note.trim() ? { note: note.trim() } : {}),
        });
        if (!result.ok) {
            setError(result.error);
            return;
        }
        setNote('');
        setError(null);
    }

    function handleRemove(punchId: number) {
        // Soft-delete only (rules/core.md): removePunch tombstones the log
        // row with deletedAt and masks it out of the grid's active list — it
        // never splices the record itself. An `untagged` row is REFUSED
        // (ok: false) — surface that instead of silently doing nothing.
        const result = removePunch({ punchId, deletedAt: TODAY });
        if (!result.ok) {
            setError(result.error);
            return;
        }
        setError(null);
    }

    const rows = log.slice().sort((a, b) => a.punchId - b.punchId);

    return (
        <section>
            <h3 className="mb-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                Punches
            </h3>

            <div className="flex flex-wrap items-center gap-2 rounded-md border border-border p-2">
                <select
                    className={cn(SELECT_CLASS, 'w-auto')}
                    value={location}
                    onChange={(e) => {
                        const next = ADDABLE_LOCATIONS.find(
                            (p) => p === e.target.value
                        );
                        if (next) setLocation(next);
                    }}
                >
                    {ADDABLE_LOCATIONS.map((p) => (
                        <option
                            key={p}
                            value={p}
                        >
                            {p}
                        </option>
                    ))}
                </select>
                <Input
                    type="date"
                    className="w-36"
                    value={effectiveAt}
                    onChange={(e) => setEffectiveAt(e.target.value)}
                />
                <Input
                    placeholder="note (optional)"
                    className="min-w-32 flex-1"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                />
                <Button
                    size="xs"
                    onClick={handleAdd}
                >
                    Add
                </Button>
            </div>
            {error ? (
                <p className="mt-1 text-xs font-medium text-signal-instruction">
                    {error}
                </p>
            ) : null}

            {rows.length > 0 ? (
                <ol className="mt-2 space-y-1">
                    {rows.map((p) => (
                        <li
                            key={p.punchId}
                            className={cn(
                                'flex items-center gap-2 text-sm',
                                p.deletedAt &&
                                    'text-muted-foreground line-through'
                            )}
                        >
                            <span className="font-mono">{p.location}</span>
                            <span className="font-mono text-[11px] text-muted-foreground">
                                {p.effectiveAt}
                            </span>
                            {p.note ? (
                                <span className="text-[11px] text-muted-foreground">
                                    {p.note}
                                </span>
                            ) : null}
                            {p.deletedAt ? (
                                <span className="text-[10px] text-muted-foreground/70 no-underline">
                                    removed
                                </span>
                            ) : p.location === 'untagged' ? null : (
                                <Button
                                    size="xs"
                                    variant="ghost"
                                    onClick={() => handleRemove(p.punchId)}
                                >
                                    Remove
                                </Button>
                            )}
                        </li>
                    ))}
                </ol>
            ) : (
                <p className="mt-2 text-xs text-muted-foreground italic">
                    no punches
                </p>
            )}
        </section>
    );
}
