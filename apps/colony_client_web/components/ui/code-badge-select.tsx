'use client';

import { cn } from '@/lib/utils';

// Multi-select rendered as toggleable mono badges — the "genes" control.
// Extracted from NewTaskDialog's `case 'genes'` branch so the two surfaces that
// pick genes (a Genotyping case's "genes to check", and a mouse's genotype in
// AddMouseDialog / IdentitySection) share ONE control instead of two copies
// that drift.
//
// Presentational and controlled: it knows nothing about genes specifically —
// the caller supplies the option list, which differs on purpose (a case checks
// the 4 real markers; a genotype may also be assigned 'WT').
// Selecting NOTHING is always valid; the caller decides what [] means.
export function CodeBadgeSelect({
    options,
    selected,
    onChange,
}: {
    options: readonly string[];
    selected: string[];
    onChange: (next: string[]) => void;
}) {
    return (
        <div className="flex flex-wrap gap-1.5">
            {options.map((code) => {
                const on = selected.includes(code);
                return (
                    <button
                        key={code}
                        type="button"
                        onClick={() =>
                            onChange(
                                on
                                    ? selected.filter((x) => x !== code)
                                    : [...selected, code]
                            )
                        }
                        className={cn(
                            'rounded-none border px-2.5 py-0.5 font-mono text-[11px] transition-colors',
                            on
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-border bg-background hover:bg-accent'
                        )}
                    >
                        {code}
                    </button>
                );
            })}
        </div>
    );
}
