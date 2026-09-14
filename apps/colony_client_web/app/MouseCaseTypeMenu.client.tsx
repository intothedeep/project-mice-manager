'use client';

import { useEffect, useRef } from 'react';
import { TASK_TYPES, type TaskTypeDef } from '@/lib/taskTypes';
import { cn } from '@/lib/utils';

// Mouse-subject task types — the only ones relevant when right-clicking a mouse cell.
const MOUSE_TYPES: TaskTypeDef[] = TASK_TYPES.filter(
    (t) => t.subjectKind === 'mouse'
);

interface Props {
    x: number;
    y: number;
    onPick: (def: TaskTypeDef) => void;
    onClose: () => void;
}

// Viewport-clamp constants (approximate panel dimensions).
const PANEL_W = 176; // ~w-44
const ITEM_H = 32;
const PANEL_H = MOUSE_TYPES.length * ITEM_H + 8; // 8px padding

export function MouseCaseTypeMenu({ x, y, onPick, onClose }: Props) {
    const firstRef = useRef<HTMLButtonElement>(null);

    // Clamp so the panel never overflows the viewport edge.
    const left =
        typeof window !== 'undefined'
            ? Math.min(x, window.innerWidth - PANEL_W - 4)
            : x;
    const top =
        typeof window !== 'undefined'
            ? Math.min(y, window.innerHeight - PANEL_H - 4)
            : y;

    // Focus the first item once mounted so keyboard navigation works immediately.
    useEffect(() => {
        firstRef.current?.focus();
    }, []);

    // Close on Escape (own listener — distinct from the global search-close handler).
    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.key === 'Escape') {
                e.stopPropagation();
                onClose();
            }
        }
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
    }, [onClose]);

    return (
        <>
            {/* Backdrop — absorbs outside clicks; mirrors JumpMenu's fixed inset-0 pattern. */}
            <div
                aria-hidden
                className="fixed inset-0 z-40"
                onClick={onClose}
            />

            {/* Panel */}
            <div
                role="menu"
                aria-label="Create case for mouse"
                style={{ left, top }}
                className="fixed z-50 w-44 border border-border bg-card py-1 shadow-md"
            >
                {MOUSE_TYPES.map((def, i) => (
                    <button
                        key={def.type}
                        ref={i === 0 ? firstRef : undefined}
                        role="menuitem"
                        type="button"
                        onClick={() => {
                            onPick(def);
                            onClose();
                        }}
                        className={cn(
                            'flex w-full items-center px-3 py-1.5 text-left font-mono text-[11px] transition-colors hover:bg-accent focus:bg-accent focus:outline-none'
                        )}
                    >
                        {def.type}
                    </button>
                ))}
            </div>
        </>
    );
}
