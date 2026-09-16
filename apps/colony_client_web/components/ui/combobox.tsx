'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

// Editable combobox: type to filter the option list, or commit a brand-new
// value via the "+ Add" row. Selection is the ONLY commit gesture — typing
// alone never mutates `value`, so a half-typed query (e.g. "A" while aiming for
// "A8") can never leak in at submit. Inline expansion (the list pushes content
// down rather than overlaying) so it never clips inside a scrollable Dialog and
// needs no popover dependency.

export type ComboOption = { value: string; label?: string };

const FIELD_CLASS =
    'h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50';

export function Combobox({
    value,
    onChange,
    options,
    placeholder,
    addLabel,
    emptyLabel,
    transform,
}: {
    value: string;
    onChange: (value: string) => void;
    options: ComboOption[];
    placeholder?: string;
    /** When set, a "+ Add" row appears for a non-empty query with no exact match. */
    addLabel?: (text: string) => string;
    /** When set, a row that clears the value (e.g. slot "— first slot —"). */
    emptyLabel?: string;
    /** Applied to typed text before it becomes the query (e.g. uppercase). */
    transform?: (text: string) => string;
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');

    // Closed-state display: the matching option's label (or the raw value for a
    // created value that isn't in the option list).
    const display = useMemo(() => {
        if (!value) return '';
        const opt = options.find(
            (o) => o.value.toLowerCase() === value.toLowerCase()
        );
        return opt?.label ?? value;
    }, [value, options]);

    const q = query.trim().toLowerCase();
    const filtered = q
        ? options.filter(
              (o) =>
                  (o.label ?? o.value).toLowerCase().includes(q) ||
                  o.value.toLowerCase().includes(q)
          )
        : options;
    const hasExact = options.some((o) => o.value.toLowerCase() === q);
    const showAdd = Boolean(addLabel) && q.length > 0 && !hasExact;

    function commit(next: string) {
        onChange(next);
        setQuery('');
        setOpen(false);
    }

    return (
        <div className="relative">
            <input
                className={FIELD_CLASS}
                value={open ? query : display}
                placeholder={placeholder}
                onFocus={() => {
                    setOpen(true);
                    setQuery('');
                }}
                onChange={(e) =>
                    setQuery(transform ? transform(e.target.value) : e.target.value)
                }
                // Close on blur; list items use onMouseDown-preventDefault below
                // so a click commits before this fires.
                onBlur={() => setOpen(false)}
            />
            {open ? (
                <ul
                    className="mt-1 max-h-48 overflow-y-auto rounded-md border border-input bg-background py-1 text-sm shadow-sm"
                    onMouseDown={(e) => e.preventDefault()}
                >
                    {emptyLabel !== undefined ? (
                        <Row onClick={() => commit('')} muted>
                            {emptyLabel}
                        </Row>
                    ) : null}
                    {filtered.map((o) => (
                        <Row
                            key={o.value}
                            onClick={() => commit(o.value)}
                            active={o.value.toLowerCase() === value.toLowerCase()}
                        >
                            {o.label ?? o.value}
                        </Row>
                    ))}
                    {filtered.length === 0 && !showAdd ? (
                        <li className="px-3 py-1.5 text-muted-foreground">No matches</li>
                    ) : null}
                    {showAdd ? (
                        <Row onClick={() => commit(query.trim())}>
                            {addLabel!(query.trim())}
                        </Row>
                    ) : null}
                </ul>
            ) : null}
        </div>
    );
}

function Row({
    children,
    onClick,
    active,
    muted,
}: {
    children: React.ReactNode;
    onClick: () => void;
    active?: boolean;
    muted?: boolean;
}) {
    return (
        <li>
            <button
                type="button"
                onClick={onClick}
                className={cn(
                    'block w-full px-3 py-1.5 text-left hover:bg-muted',
                    active && 'bg-muted font-medium',
                    muted && 'text-muted-foreground'
                )}
            >
                {children}
            </button>
        </li>
    );
}
