// Mock fetcher for the Colour Palette reference page.
//
// Named as the FUTURE real fetcher (getPalette) so the mock→real swap is a
// single-file change: replace this body with a fetch to colony_server and the
// page never notices.
//
// Mirrors the design-stage `color_palette` table. Channels:
//   signal     — workflow state colours (instruction/plan/flag/dead), sourced from globals.css
//   sex        — mouse sex tints (M sky-100 / F pink-100), sourced from lib/colors.ts
//   life-stage — dob-derived tints (baby emerald-100 / old amber-100), sourced from lib/colors.ts
//   overcrowding — slot rail fill/badge when adults > cap, sourced from ColonyGridView.client.tsx
//   genotype   — mutant genotype cell fill (seed sample), sourced from getColonyGrid.mock.api.ts GENO
//   mate       — mate-group chip colour (seed sample), sourced from getColonyGrid.mock.api.ts MATE
//   theme      — semantic CSS vars (background/foreground/muted/primary/border etc.), sourced from globals.css
//
// Null-colour cases are NOT rows — they have no displayable swatch:
//   sex U (undefined)     → no fill
//   life-stage adult      → no fill (text-only muted)
//   genotype WT / '?'     → no fill (default background)
//
// CSS-var-based colours store the var name in `hex` field per task spec.
// Tailwind colour classes map to CSS vars in v4 (e.g. bg-sky-100 → var(--color-sky-100)).

export type PaletteChannel =
    | 'signal'
    | 'sex'
    | 'life-stage'
    | 'overcrowding'
    | 'genotype'
    | 'mate'
    | 'theme';

export type PaletteEntry = {
    id: number;
    token: string;
    hex: string;
    channel: PaletteChannel;
    usage: string;
};

const SEED: PaletteEntry[] = [
    // ── signal ────────────────────────────────────────────────────────────────
    // Source: globals.css --signal-* vars
    {
        id: 1,
        token: 'signal-instruction',
        hex: '#d40000',
        channel: 'signal',
        usage: 'task badge border + id text · instruction (must-do)',
    },
    {
        id: 2,
        token: 'signal-plan',
        hex: '#0432ff',
        channel: 'signal',
        usage: 'task badge border + id text · plan (upcoming)',
    },
    {
        id: 3,
        token: 'signal-flag-fill',
        hex: '#fff3a0',
        channel: 'signal',
        usage: 'task badge fill · flag / attention (note in Excel)',
    },
    {
        id: 4,
        token: 'signal-flag-line',
        hex: '#e6d24a',
        channel: 'signal',
        usage: 'task badge border · flag / attention',
    },
    {
        id: 5,
        token: 'signal-dead-fill',
        hex: '#e4e4e2',
        channel: 'signal',
        usage: 'task badge fill · dead / sac',
    },
    {
        id: 6,
        token: 'signal-dead-ink',
        // oklch literal from globals.css; stored as var so it resolves at runtime
        hex: 'var(--signal-dead-ink)',
        channel: 'signal',
        usage: 'mouse id text (strikethrough) · dead / sac',
    },

    // ── sex ───────────────────────────────────────────────────────────────────
    // Source: lib/colors.ts SEX_TINT — Tailwind classes → v4 CSS vars
    {
        id: 7,
        token: 'sex-male',
        hex: 'var(--color-sky-100)',
        channel: 'sex',
        usage: 'mouse id-cell bg · male (♂)',
    },
    {
        id: 8,
        token: 'sex-female',
        hex: 'var(--color-pink-100)',
        channel: 'sex',
        usage: 'mouse id-cell bg · female (♀)',
    },

    // ── life-stage ────────────────────────────────────────────────────────────
    // Source: lib/colors.ts DOB_TINT — Tailwind classes → v4 CSS vars
    {
        id: 9,
        token: 'life-stage-baby-bg',
        hex: 'var(--color-emerald-100)',
        channel: 'life-stage',
        usage: 'DOB cell bg · baby <21d (pre-weaning)',
    },
    {
        id: 10,
        token: 'life-stage-baby-text',
        hex: 'var(--color-emerald-900)',
        channel: 'life-stage',
        usage: 'DOB cell text · baby <21d (pre-weaning)',
    },
    {
        id: 11,
        token: 'life-stage-old-bg',
        hex: 'var(--color-amber-100)',
        channel: 'life-stage',
        usage: 'DOB cell bg · old (♂ >365d / ♀ >304d)',
    },
    {
        id: 12,
        token: 'life-stage-old-text',
        hex: 'var(--color-amber-900)',
        channel: 'life-stage',
        usage: 'DOB cell text · old (♂ >365d / ♀ >304d)',
    },

    // ── overcrowding ──────────────────────────────────────────────────────────
    // Source: ColonyGridView.client.tsx SlotRail — Tailwind classes → v4 CSS vars
    {
        id: 13,
        token: 'overcrowding-rail-bg',
        hex: 'var(--color-red-100)',
        channel: 'overcrowding',
        usage: 'slot rail fill · live adults > cap (action: split)',
    },
    {
        id: 14,
        token: 'overcrowding-badge-bg',
        hex: 'var(--color-red-600)',
        channel: 'overcrowding',
        usage: 'slot rail count badge bg · adults/cap when over',
    },
    {
        id: 15,
        token: 'overcrowding-label',
        hex: 'var(--color-red-700)',
        channel: 'overcrowding',
        usage: 'slot rail label text · overcrowded label colour',
    },

    // ── genotype ──────────────────────────────────────────────────────────────
    // Source: getColonyGrid.mock.api.ts GENO (sample — full table is in the DB)
    // WT and '?' are null (no fill) and are not listed here.
    {
        id: 16,
        token: 'geno-nf1-f-plus',
        hex: '#0d9488',
        channel: 'genotype',
        usage: 'genotype cell · Nf1 f/+ (seed)',
    },
    {
        id: 17,
        token: 'geno-plpcre-nf1-f-plus',
        hex: '#ea580c',
        channel: 'genotype',
        usage: 'genotype cell · PlpCre;Nf1 f/+ (seed)',
    },
    {
        id: 18,
        token: 'geno-nf1-plus-plus',
        hex: '#0891b2',
        channel: 'genotype',
        usage: 'genotype cell · Nf1 +/+ (seed)',
    },
    {
        id: 19,
        token: 'geno-ai14-f-f',
        hex: '#db2777',
        channel: 'genotype',
        usage: 'genotype cell · Ai14 f/f (seed)',
    },
    {
        id: 20,
        token: 'geno-plpcre-ai14-plus-minus',
        hex: '#65a30d',
        channel: 'genotype',
        usage: 'genotype cell · PlpCre;Ai14 +/- (seed)',
    },
    {
        id: 21,
        token: 'geno-plpcre-ai14-plus-plus',
        hex: '#b45309',
        channel: 'genotype',
        usage: 'genotype cell · PlpCre;Ai14 +/+ (seed)',
    },
    {
        id: 22,
        token: 'geno-nf1-f-f',
        hex: '#15803d',
        channel: 'genotype',
        usage: 'genotype cell · Nf1 f/f (seed)',
    },

    // ── mate ──────────────────────────────────────────────────────────────────
    // Source: getColonyGrid.mock.api.ts MATE
    {
        id: 23,
        token: 'mate-g401',
        hex: '#9333ea',
        channel: 'mate',
        usage: 'mate chip · M4BCW.2 × F5AYL group (seed)',
    },
    {
        id: 24,
        token: 'mate-gA',
        hex: '#c026d3',
        channel: 'mate',
        usage: 'mate chip · M1BCW × F9AYL group BEZ-A (seed)',
    },
    {
        id: 25,
        token: 'mate-gB',
        hex: '#4338ca',
        channel: 'mate',
        usage: 'mate chip · M8BEZ × F9AYL group BEZ-B (seed)',
    },

    // ── theme ─────────────────────────────────────────────────────────────────
    // Source: globals.css :root semantic vars
    {
        id: 26,
        token: 'theme-background',
        hex: 'var(--background)',
        channel: 'theme',
        usage: 'page / card surface · white',
    },
    {
        id: 27,
        token: 'theme-foreground',
        hex: 'var(--foreground)',
        channel: 'theme',
        usage: 'body text + headings · near-black',
    },
    {
        id: 28,
        token: 'theme-muted',
        hex: 'var(--muted)',
        channel: 'theme',
        usage: 'subtle fills (slot rail default, secondary bg)',
    },
    {
        id: 29,
        token: 'theme-muted-foreground',
        hex: 'var(--muted-foreground)',
        channel: 'theme',
        usage: 'secondary text (labels, timestamps)',
    },
    {
        id: 30,
        token: 'theme-primary',
        hex: 'var(--primary)',
        channel: 'theme',
        usage: 'primary action / active nav bg',
    },
    {
        id: 31,
        token: 'theme-accent',
        hex: 'var(--accent)',
        channel: 'theme',
        usage: 'hover fills / active nav item bg',
    },
    {
        id: 32,
        token: 'theme-border',
        hex: 'var(--border)',
        channel: 'theme',
        usage: 'hairline borders (dark — user directive)',
    },
    {
        id: 33,
        token: 'theme-destructive',
        hex: 'var(--destructive)',
        channel: 'theme',
        usage: 'destructive actions / error state',
    },
];

// Channel display order — mirrors the PaletteChannel type union.
export const CHANNEL_ORDER: PaletteChannel[] = [
    'signal',
    'sex',
    'life-stage',
    'overcrowding',
    'genotype',
    'mate',
    'theme',
];

export async function getPalette(): Promise<PaletteEntry[]> {
    return SEED;
}
