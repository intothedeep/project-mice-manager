// Categorical colour channels that are SEPARATE from the workflow signals.
// Signal colours (red/blue/yellow/gray) stay reserved for state and are applied
// to text/fill; these hues are identity/grouping accents (dots, swatches,
// selection borders) and deliberately avoid the signal families.

export type ColorBy = 'off' | 'line' | 'genotype';

// Per-line identity hues — teal / pink / orange / green / cyan / slate.
// The reference's pastel accent family; avoids the indigo PRIMARY and the
// signal families (pure red/blue, yellow, gray).
const LINE_HUES = [
    '#14b8a6',
    '#ec4899',
    '#f97316',
    '#22c55e',
    '#06b6d4',
    '#64748b',
];

export function lineColor(index: number): string {
    return LINE_HUES[index % LINE_HUES.length]!;
}

// Deterministic colour for a genotype string: identical genotype → identical
// swatch, so same-genotype mice cluster visually.
const GENO_HUES = [
    '#0d9488',
    '#ea580c',
    '#0891b2',
    '#65a30d',
    '#db2777',
    '#475569',
    '#0369a1',
    '#b45309',
    '#16a34a',
    '#be123c',
];

export function genotypeColor(genotype: string): string {
    let h = 0;
    for (let i = 0; i < genotype.length; i++) {
        h = (h * 31 + genotype.charCodeAt(i)) >>> 0;
    }
    return GENO_HUES[h % GENO_HUES.length]!;
}
