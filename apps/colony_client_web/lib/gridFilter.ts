import type { MouseCell, Sex, SignalColor } from '@repo/types';

// Pure filter core for the Hybrid grid — no state, no I/O. The client component
// holds the GridFilter in React state; these functions decide match/active so
// the "dim non-matching" logic stays deterministic and testable.

export interface GridFilter {
    query: string; // substring over renderedId + genotype
    sexes: Sex[]; // empty = all sexes
    signals: SignalColor[]; // empty = all signals
}

export const EMPTY_FILTER: GridFilter = { query: '', sexes: [], signals: [] };

export function isFilterActive(f: GridFilter): boolean {
    return f.query.trim() !== '' || f.sexes.length > 0 || f.signals.length > 0;
}

export function matchesMouse(m: MouseCell, f: GridFilter): boolean {
    const q = f.query.trim().toLowerCase();
    if (
        q &&
        !m.renderedId.toLowerCase().includes(q) &&
        !m.genotype.toLowerCase().includes(q)
    ) {
        return false;
    }
    if (f.sexes.length > 0 && !f.sexes.includes(m.sex)) return false;
    if (f.signals.length > 0 && !f.signals.includes(m.signal)) return false;
    return true;
}

// Toggle a value in a filter array (immutable) — used by the chip toggles.
export function toggleIn<T>(arr: T[], value: T): T[] {
    return arr.includes(value)
        ? arr.filter((v) => v !== value)
        : [...arr, value];
}
