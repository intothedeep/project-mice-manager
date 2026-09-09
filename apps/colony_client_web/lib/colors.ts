// Categorical colour channels that are SEPARATE from the workflow signals.
// Signal colours (red/blue/yellow/gray) stay reserved for state and are applied
// to text/fill; these hues are identity/grouping accents (dots, swatches,
// selection borders) and deliberately avoid the signal families.

export type ColorBy = 'off' | 'line' | 'genotype';

// Per-line identity hues — indigo / teal / violet / fuchsia / cyan / slate.
// None are the pure red or pure blue the signals use.
const LINE_HUES = [
    '#6366f1',
    '#0d9488',
    '#7c3aed',
    '#c026d3',
    '#0891b2',
    '#64748b',
];

export function lineColor(index: number): string {
    return LINE_HUES[index % LINE_HUES.length]!;
}

// Deterministic colour for a genotype string: identical genotype → identical
// swatch, so same-genotype mice cluster visually.
const GENO_HUES = [
    '#2563eb',
    '#16a34a',
    '#db2777',
    '#ca8a04',
    '#0891b2',
    '#7c3aed',
    '#dc2626',
    '#0d9488',
    '#9333ea',
    '#65a30d',
];

export function genotypeColor(genotype: string): string {
    let h = 0;
    for (let i = 0; i < genotype.length; i++) {
        h = (h * 31 + genotype.charCodeAt(i)) >>> 0;
    }
    return GENO_HUES[h % GENO_HUES.length]!;
}
