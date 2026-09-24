'use client';

import type { ColonyGrid, MouseCell, MouseLocationRow } from '@repo/types';
import { useColonyGrid, useMouseLocations } from '@/lib/mockColonyStore';
import { formatDate } from '@/lib/dueDates';

// Where this mouse has been. Same shape as PunchSection: one append-only log,
// read through its own store hook, rendered oldest-first.
//
// A row records only WHERE THE MOUSE WENT. The "from" is the PREVIOUS row, so
// `from → to` is COMPOSED at read time and no row stores either end as text —
// the same reason a mouse's label is composed rather than stored. The first
// row has no predecessor and reads as a placement, not a move.
//
// Cage codes and slot labels are resolved from the live grid by id, never
// copied into the row: renaming a cage must not leave an old code frozen in
// the history.
function placeOf(grid: ColonyGrid, row: MouseLocationRow): string {
    for (const line of grid.lines)
        for (const cage of line.cages)
            for (const slot of cage.slots)
                if (slot.slotId === row.slotId)
                    return `${cage.code} / ${slot.label}`;
    return `cage ${row.cageId} / slot ${row.slotId}`;
}

export function MoveSection({ mouse }: { mouse: MouseCell }) {
    const grid = useColonyGrid();
    const rows = useMouseLocations(mouse.metaId);

    return (
        <section>
            <h3 className="mb-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                Location history
            </h3>

            {rows.length > 0 ? (
                <ol className="space-y-1">
                    {rows.map((row, i) => {
                        const prev = i > 0 ? rows[i - 1] : undefined;
                        return (
                            <li
                                key={row.locationId}
                                className="flex flex-wrap items-baseline gap-2 text-sm"
                            >
                                <span className="font-mono text-[11px] text-muted-foreground">
                                    {formatDate(row.effectiveAt)}
                                </span>
                                <span className="font-mono">
                                    {prev ? `${placeOf(grid, prev)} → ` : ''}
                                    {placeOf(grid, row)}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                    {row.reason}
                                </span>
                                {row.note ? (
                                    <span className="text-[11px] text-muted-foreground">
                                        {row.note}
                                    </span>
                                ) : null}
                            </li>
                        );
                    })}
                </ol>
            ) : (
                <p className="mt-2 text-xs text-muted-foreground italic">
                    no location history
                </p>
            )}
        </section>
    );
}
