'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';

// EditableCell — wraps any children; on activation swaps to an input (or
// select). Each instance owns its own editing + draft local state — no lifted
// grid edit mode. Callers get onCommit(next) → string|null (null = ok; string
// = error message). Esc cancels without committing.
//
// Double-click activation is wired by the PARENT (not here), so this atom
// stays unaware of the click-timer vs. dblclick conflict on the id cell.

interface BaseProps {
    /** Current stored value (used to seed draft on activate). */
    value: string;
    /** Called on Enter/blur commit. Returns error string if rejected, null if ok. */
    onCommit: (next: string) => string | null;
    children: React.ReactNode;
    className?: string;
    inputClassName?: string;
    title?: string;
}

interface TextProps extends BaseProps {
    type?: 'text' | 'date';
    options?: never;
}

interface SelectProps extends BaseProps {
    type: 'select';
    options: { value: string; label: string }[];
}

type Props = TextProps | SelectProps;

export function EditableCell({
    value,
    onCommit,
    children,
    className,
    inputClassName,
    type = 'text',
    options,
    title,
}: Props) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState('');
    const [error, setError] = useState<string | null>(null);
    // Guard against double-commit: Enter triggers blur; both must not commit.
    const committedRef = useRef(false);
    // Guard against Esc-cancel triggering a commit on the subsequent blur.
    const cancelledRef = useRef(false);
    const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

    const activate = useCallback(() => {
        setDraft(value);
        setError(null);
        setEditing(true);
        committedRef.current = false;
        cancelledRef.current = false;
    }, [value]);

    // Focus the input once it mounts.
    useEffect(() => {
        if (editing) {
            inputRef.current?.focus();
            if (inputRef.current && 'select' in inputRef.current) {
                (inputRef.current as HTMLInputElement).select();
            }
        }
    }, [editing]);

    const commit = useCallback(() => {
        if (committedRef.current || cancelledRef.current) return;
        committedRef.current = true;
        const err = onCommit(draft);
        if (err) {
            // Stay in edit mode and surface the error.
            setError(err);
            committedRef.current = false;
            // Re-focus so user can fix the value.
            requestAnimationFrame(() => inputRef.current?.focus());
            return;
        }
        setEditing(false);
        setError(null);
    }, [draft, onCommit]);

    const cancel = useCallback(() => {
        cancelledRef.current = true;
        setEditing(false);
        setError(null);
    }, []);

    if (!editing) {
        return (
            <div
                className={cn('cursor-default', className)}
                onDoubleClick={activate}
                title={title}
                data-editable-cell
            >
                {children}
            </div>
        );
    }

    const sharedInputClass = cn(
        'h-full w-full bg-background font-mono text-[11px] outline-none ring-1 ring-primary px-1',
        error && 'ring-destructive',
        inputClassName
    );

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Esc cancels — must stop propagation so the global Esc (closes search)
        // doesn't fire. Enter commits.
        if (e.key === 'Escape') {
            e.stopPropagation();
            cancel();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            commit();
        }
    };

    if (type === 'select' && options) {
        return (
            <div
                className={cn('relative', className)}
                title={error ?? undefined}
            >
                <select
                    ref={inputRef as React.RefObject<HTMLSelectElement>}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={commit}
                    onKeyDown={handleKeyDown}
                    onClick={(e) => e.stopPropagation()}
                    className={sharedInputClass}
                >
                    {options.map((o) => (
                        <option
                            key={o.value}
                            value={o.value}
                        >
                            {o.label}
                        </option>
                    ))}
                </select>
                {error ? (
                    <span className="absolute -bottom-4 left-0 z-20 whitespace-nowrap bg-destructive px-1 text-[9px] text-destructive-foreground">
                        {error}
                    </span>
                ) : null}
            </div>
        );
    }

    return (
        <div
            className={cn('relative', className)}
            title={error ?? undefined}
        >
            <input
                ref={inputRef as React.RefObject<HTMLInputElement>}
                type={type === 'date' ? 'date' : 'text'}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={handleKeyDown}
                onClick={(e) => e.stopPropagation()}
                className={sharedInputClass}
            />
            {error ? (
                <span className="absolute -bottom-4 left-0 z-20 whitespace-nowrap bg-destructive px-1 text-[9px] text-destructive-foreground">
                    {error}
                </span>
            ) : null}
        </div>
    );
}
