// Mock fetcher for the Colour Palette reference page.
//
// Named as the FUTURE real fetcher (getPalette) so the mock→real swap is a
// single-file change: replace this body with a fetch to colony_server and the
// page never notices.
//
// Mirrors the design-stage `color_palette` table. Channels:
//   signal      — workflow state colours (instruction/plan/flag/dead), sourced from globals.css
//   sex         — mouse sex tints (M sky-100 / F pink-100), sourced from lib/colors.ts
//   life-stage  — dob-derived tints (baby emerald-100 / old amber-100), sourced from lib/colors.ts
//   overcrowding — slot rail fill/badge when adults > cap, sourced from ColonyGridView.client.tsx
//   overdue     — due-date urgency styling (cards + upcoming list), sourced from TasksView + UpcomingView
//   genotype    — mutant genotype cell fill (seed sample), sourced from getColonyGrid.mock.api.ts GENO
//   mate        — mate-group chip colour (seed sample), sourced from getColonyGrid.mock.api.ts MATE
//   theme       — semantic CSS vars (background/foreground/muted/primary/border etc.), sourced from globals.css
//
// Null-colour cases (kind:'none') — intentional "no colour by design":
//   sex U (undefined)     → no fill
//   life-stage adult      → no fill (text-only muted)
//   genotype WT / '?'     → no fill (default background)
//
// `futureSource` marks the mock→real swap target:
//   'color_palette' — values from the DB (genotype/mate channels only)
//   'rule_legend'   — code-derived rules; stored in code, not in the DB
//
// CSS-var-based colours store the var name in `hex` field.
// Tailwind colour classes are stored as class strings (kind:'tw-class').

import { SEX_TINT, DOB_TINT } from '@/lib/colors';
import { SIGNAL_LABEL } from '@/lib/signal';

export type PaletteChannel =
    | 'signal'
    | 'sex'
    | 'life-stage'
    | 'overcrowding'
    | 'overdue'
    | 'genotype'
    | 'mate'
    | 'theme';

export type PaletteKind = 'hex' | 'css-var' | 'tw-class' | 'none';
export type PaletteSource = 'color_palette' | 'rule_legend';

export type PaletteEntry = {
    id: number;
    token: string;
    // For kind:'hex' → e.g. '#d40000'
    // For kind:'css-var' → e.g. 'var(--signal-instruction)'
    // For kind:'tw-class' → Tailwind class string e.g. 'bg-sky-100'
    // For kind:'none' → empty string (no fill)
    hex: string;
    channel: PaletteChannel;
    usage: string;
    kind: PaletteKind;
    futureSource: PaletteSource;
};

const SEED: PaletteEntry[] = [
    // ── signal ────────────────────────────────────────────────────────────────
    // Source: globals.css --signal-* vars. Values reference CSS vars so the
    // swatch resolves at runtime and the two sources never drift.
    {
        id: 1,
        token: 'signal-instruction',
        hex: 'var(--signal-instruction)',
        channel: 'signal',
        usage: `task badge border + id text · ${SIGNAL_LABEL.instruction} (must-do)`,
        kind: 'css-var',
        futureSource: 'rule_legend',
    },
    {
        id: 2,
        token: 'signal-plan',
        hex: 'var(--signal-plan)',
        channel: 'signal',
        usage: `task badge border + id text · ${SIGNAL_LABEL.plan} (upcoming)`,
        kind: 'css-var',
        futureSource: 'rule_legend',
    },
    {
        id: 3,
        token: 'signal-flag-fill',
        hex: 'var(--signal-flag-fill)',
        channel: 'signal',
        usage: `task badge fill · ${SIGNAL_LABEL.flag} / attention (note in Excel)`,
        kind: 'css-var',
        futureSource: 'rule_legend',
    },
    {
        id: 4,
        token: 'signal-flag-line',
        hex: 'var(--signal-flag-line)',
        channel: 'signal',
        usage: `task badge border · ${SIGNAL_LABEL.flag} / attention`,
        kind: 'css-var',
        futureSource: 'rule_legend',
    },
    {
        id: 5,
        token: 'signal-dead-fill',
        hex: 'var(--signal-dead-fill)',
        channel: 'signal',
        usage: `task badge fill · ${SIGNAL_LABEL.dead} / sac`,
        kind: 'css-var',
        futureSource: 'rule_legend',
    },
    {
        id: 6,
        token: 'signal-dead-ink',
        hex: 'var(--signal-dead-ink)',
        channel: 'signal',
        usage: 'mouse id text (strikethrough) · dead / sac',
        kind: 'css-var',
        futureSource: 'rule_legend',
    },

    // ── sex ───────────────────────────────────────────────────────────────────
    // Source: lib/colors.ts SEX_TINT — imported directly; one source of truth.
    {
        id: 7,
        token: 'sex-male',
        hex: SEX_TINT.M,
        channel: 'sex',
        usage: 'mouse id-cell bg · male (♂)',
        kind: 'tw-class',
        futureSource: 'rule_legend',
    },
    {
        id: 8,
        token: 'sex-female',
        hex: SEX_TINT.F,
        channel: 'sex',
        usage: 'mouse id-cell bg · female (♀)',
        kind: 'tw-class',
        futureSource: 'rule_legend',
    },
    {
        id: 9,
        token: 'sex-unknown',
        hex: '',
        channel: 'sex',
        usage: 'sex U (undefined) · no fill (default cell background)',
        kind: 'none',
        futureSource: 'rule_legend',
    },

    // ── life-stage ────────────────────────────────────────────────────────────
    // Source: lib/colors.ts DOB_TINT — imported directly; one source of truth.
    // Each stage maps to one row (DOB_TINT holds the combined bg+text class).
    {
        id: 10,
        token: 'life-stage-baby',
        hex: DOB_TINT.baby,
        channel: 'life-stage',
        usage: 'DOB cell · baby <21d (pre-weaning)',
        kind: 'tw-class',
        futureSource: 'rule_legend',
    },
    {
        id: 11,
        token: 'life-stage-old',
        hex: DOB_TINT.old,
        channel: 'life-stage',
        usage: 'DOB cell · old (♂ >365d / ♀ >304d)',
        kind: 'tw-class',
        futureSource: 'rule_legend',
    },
    {
        id: 12,
        token: 'life-stage-adult',
        hex: '',
        channel: 'life-stage',
        usage: 'adult · no fill (default background — intentional calm default)',
        kind: 'none',
        futureSource: 'rule_legend',
    },

    // ── overcrowding ──────────────────────────────────────────────────────────
    // Source: ColonyGridView.client.tsx SlotRail — colours are inline (not exported
    // constants); referencing CSS vars keeps them consistent without importing a
    // 'use client' file. Gap noted: ColonyGridView lacks an exported colour constant.
    {
        id: 13,
        token: 'overcrowding-rail-bg',
        hex: 'var(--color-red-100)',
        channel: 'overcrowding',
        usage: 'slot rail fill · live adults > cap (action: split)',
        kind: 'css-var',
        futureSource: 'rule_legend',
    },
    {
        id: 14,
        token: 'overcrowding-badge-bg',
        hex: 'var(--color-red-600)',
        channel: 'overcrowding',
        usage: 'slot rail count badge bg · adults/cap when over',
        kind: 'css-var',
        futureSource: 'rule_legend',
    },
    {
        id: 15,
        token: 'overcrowding-label',
        hex: 'var(--color-red-700)',
        channel: 'overcrowding',
        usage: 'slot rail label text · overcrowded label colour',
        kind: 'css-var',
        futureSource: 'rule_legend',
    },

    // ── overdue ───────────────────────────────────────────────────────────────
    // Source: TasksView.client.tsx (border-2 border-signal-instruction on overdue
    // cards) + UpcomingView.client.tsx (statusRowClass / statusTextClass).
    // overdue.overdue REUSES signal-instruction — not a new hex; consistent with
    // the text treatment and the overcrowding red in the grid.
    {
        id: 16,
        token: 'overdue-overdue',
        hex: 'var(--signal-instruction)',
        channel: 'overdue',
        usage:
            'REUSES signal-instruction · TasksView: thick border-2; UpcomingView: border/40 + text-signal-instruction',
        kind: 'css-var',
        futureSource: 'rule_legend',
    },
    {
        id: 17,
        token: 'overdue-soon',
        // bg-signal-flag-fill/50 is used for both 'today' and 'soon' in UpcomingView.
        // Tailwind opacity modifiers are class-level so the full class is the SSOT.
        hex: 'bg-signal-flag-fill/50 text-amber-700',
        channel: 'overdue',
        usage:
            'UpcomingView today + soon rows · flag-fill bg at 50% opacity + amber-700 text',
        kind: 'tw-class',
        futureSource: 'rule_legend',
    },

    // ── genotype ──────────────────────────────────────────────────────────────
    // Source: getColonyGrid.mock.api.ts GENO (not exported — values mirrored here;
    // full table is in the DB). futureSource:'color_palette' — real swap target.
    // WT and '?' are null rows (no fill by design).
    {
        id: 18,
        token: 'geno-nf1-f-plus',
        hex: '#0d9488',
        channel: 'genotype',
        usage: 'genotype cell · Nf1 f/+ (seed)',
        kind: 'hex',
        futureSource: 'color_palette',
    },
    {
        id: 19,
        token: 'geno-plpcre-nf1-f-plus',
        hex: '#ea580c',
        channel: 'genotype',
        usage: 'genotype cell · PlpCre;Nf1 f/+ (seed)',
        kind: 'hex',
        futureSource: 'color_palette',
    },
    {
        id: 20,
        token: 'geno-nf1-plus-plus',
        hex: '#0891b2',
        channel: 'genotype',
        usage: 'genotype cell · Nf1 +/+ (seed)',
        kind: 'hex',
        futureSource: 'color_palette',
    },
    {
        id: 21,
        token: 'geno-ai14-f-f',
        hex: '#db2777',
        channel: 'genotype',
        usage: 'genotype cell · Ai14 f/f (seed)',
        kind: 'hex',
        futureSource: 'color_palette',
    },
    {
        id: 22,
        token: 'geno-plpcre-ai14-plus-minus',
        hex: '#65a30d',
        channel: 'genotype',
        usage: 'genotype cell · PlpCre;Ai14 +/- (seed)',
        kind: 'hex',
        futureSource: 'color_palette',
    },
    {
        id: 23,
        token: 'geno-plpcre-ai14-plus-plus',
        hex: '#b45309',
        channel: 'genotype',
        usage: 'genotype cell · PlpCre;Ai14 +/+ (seed)',
        kind: 'hex',
        futureSource: 'color_palette',
    },
    {
        id: 24,
        token: 'geno-nf1-f-f',
        hex: '#15803d',
        channel: 'genotype',
        usage: 'genotype cell · Nf1 f/f (seed)',
        kind: 'hex',
        futureSource: 'color_palette',
    },
    {
        id: 25,
        token: 'geno-wt',
        hex: '',
        channel: 'genotype',
        usage: 'WT · no fill (default background — unmutated default line)',
        kind: 'none',
        futureSource: 'color_palette',
    },
    {
        id: 26,
        token: 'geno-unknown',
        hex: '',
        channel: 'genotype',
        usage: '"?" · no fill (default background — unknown genotype)',
        kind: 'none',
        futureSource: 'color_palette',
    },

    // ── mate ──────────────────────────────────────────────────────────────────
    // Source: getColonyGrid.mock.api.ts MATE (not exported — values mirrored).
    // futureSource:'color_palette' — real swap target.
    {
        id: 27,
        token: 'mate-g401',
        hex: '#9333ea',
        channel: 'mate',
        usage: 'mate chip · M4BCW.2 × F5AYL group (seed)',
        kind: 'hex',
        futureSource: 'color_palette',
    },
    {
        id: 28,
        token: 'mate-gA',
        hex: '#c026d3',
        channel: 'mate',
        usage: 'mate chip · M1BCW × F9AYL group BEZ-A (seed)',
        kind: 'hex',
        futureSource: 'color_palette',
    },
    {
        id: 29,
        token: 'mate-gB',
        hex: '#4338ca',
        channel: 'mate',
        usage: 'mate chip · M8BEZ × F9AYL group BEZ-B (seed)',
        kind: 'hex',
        futureSource: 'color_palette',
    },

    // ── theme ─────────────────────────────────────────────────────────────────
    // Source: globals.css :root semantic vars
    {
        id: 30,
        token: 'theme-background',
        hex: 'var(--background)',
        channel: 'theme',
        usage: 'page / card surface · white',
        kind: 'css-var',
        futureSource: 'rule_legend',
    },
    {
        id: 31,
        token: 'theme-foreground',
        hex: 'var(--foreground)',
        channel: 'theme',
        usage: 'body text + headings · near-black',
        kind: 'css-var',
        futureSource: 'rule_legend',
    },
    {
        id: 32,
        token: 'theme-muted',
        hex: 'var(--muted)',
        channel: 'theme',
        usage: 'subtle fills (slot rail default, secondary bg)',
        kind: 'css-var',
        futureSource: 'rule_legend',
    },
    {
        id: 33,
        token: 'theme-muted-foreground',
        hex: 'var(--muted-foreground)',
        channel: 'theme',
        usage: 'secondary text (labels, timestamps)',
        kind: 'css-var',
        futureSource: 'rule_legend',
    },
    {
        id: 34,
        token: 'theme-primary',
        hex: 'var(--primary)',
        channel: 'theme',
        usage: 'primary action / active nav bg',
        kind: 'css-var',
        futureSource: 'rule_legend',
    },
    {
        id: 35,
        token: 'theme-accent',
        hex: 'var(--accent)',
        channel: 'theme',
        usage: 'hover fills / active nav item bg',
        kind: 'css-var',
        futureSource: 'rule_legend',
    },
    {
        id: 36,
        token: 'theme-border',
        hex: 'var(--border)',
        channel: 'theme',
        usage: 'hairline borders (dark — user directive)',
        kind: 'css-var',
        futureSource: 'rule_legend',
    },
    {
        id: 37,
        token: 'theme-destructive',
        hex: 'var(--destructive)',
        channel: 'theme',
        usage: 'destructive actions / error state',
        kind: 'css-var',
        futureSource: 'rule_legend',
    },
];

// Channel display order — mirrors the PaletteChannel type union.
export const CHANNEL_ORDER: PaletteChannel[] = [
    'signal',
    'sex',
    'life-stage',
    'overcrowding',
    'overdue',
    'genotype',
    'mate',
    'theme',
];

export async function getPalette(): Promise<PaletteEntry[]> {
    return SEED;
}
