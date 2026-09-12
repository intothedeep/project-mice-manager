import type { ColonyGrid } from '@repo/types';

// Mock fetcher for the Cage Grid screen.
//
// Named as the FUTURE real fetcher (getColonyGrid) so the mock→real swap is a
// single-file change: replace this body with a fetch to colony_server and the
// screen never notices. Runtime data lives here in the app (never imported from
// @repo/types, whose runtime entry may be unbuilt — types are erased at compile).
//
// Full hierarchy: colony › line › cage › slot › mice (a slot holds many mice).
// The fixture is anonymised-but-realistic and deliberately seeds the known
// domain ambiguities so the demo doubles as a live open-question list:
//   - M4+10AZZ : the "+N" pooled notation nobody (incl. the professor) has defined
//   - U3BCX    : an unsexed newborn pup (sex = U until genotyped/sexed)
//   - F10BEVe  : ear-tag suffix "e"
//   - M4BCW.2  : reclip / re-issue suffix ".2"

// Seed identity colours — the mock of the future `color_assignments`/`color_palette`
// tables (server will resolve these before serializing). Same genotype → same hex by
// construction; hex are unique per meaning (mirrors UNIQUE(hex)).
//   WT  → null: normal / unmutated default line, rendered as the DEFAULT cell background
//          (no fill). Only MUTANT genotypes carry a hue, so they pop.
//   '?' → null: unknown genotype; also default background (the "?" text disambiguates it).
const GENO: Record<string, string | null> = {
    'Nf1 f/+': '#0d9488',
    'PlpCre;Nf1 f/+': '#ea580c',
    'Nf1 +/+': '#0891b2',
    'Ai14 f/f': '#db2777',
    'PlpCre;Ai14 +/-': '#65a30d',
    'PlpCre;Ai14 +/+': '#b45309',
    'Nf1 f/f': '#15803d',
    WT: null,
    '?': null,
};

// Resolve a genotype to its seed colour (missing/unknown → null = default background).
const geno = (g: string): string | null => GENO[g] ?? null;

// Mate-group colours, keyed by the father-fanout group (color_assignments channel='mate').
// A mouse carries one hex per group it belongs to; a female mated to two males → two hexes.
const MATE = {
    // group: father M4BCW.2 (metaId 401) × F5AYL (402)
    g401: '#9333ea',
    // two BEZ males (gA, gB) — F9AYL is mated to BOTH → carries two mate chips
    gA: '#c026d3',
    gB: '#4338ca',
} as const;

const COLONY_GRID: ColonyGrid = {
    colonyId: 1,
    colonyName: 'Lopez-Juarez Lab',
    lines: [
        {
            lineId: 1,
            lineName: 'pNf1 flox;ccEGFP',
            lineColor: '#14b8a6',
            nominalGenotypeColor: geno('Nf1 f/+'),
            cages: [
                {
                    cageId: 1,
                    cageNumber: '2413',
                    location: 'Rack A / Row 2',
                    slots: [
                        {
                            slotId: 11,
                            label: 'A8',
                            mice: [
                                {
                                    metaId: 101,
                                    renderedId: 'M4BCW',
                                    sex: 'M',
                                    genotype: 'Nf1 f/+',
                                    signal: 'done',
                                    isAlive: true,
                                    attention: null,
                                    activeTasks: [],
                                    dob: '2024-02-10',
                                    genotypeColor: geno('Nf1 f/+'),
                                    mates: [],
                                },
                                {
                                    metaId: 102,
                                    renderedId: 'F5AYL',
                                    sex: 'F',
                                    genotype: 'WT',
                                    signal: 'done',
                                    isAlive: true,
                                    attention: null,
                                    activeTasks: [],
                                    dob: '2025-05-01',
                                    genotypeColor: geno('WT'),
                                    mates: [],
                                },
                            ],
                        },
                        {
                            slotId: 12,
                            label: 'C8',
                            mice: [
                                {
                                    metaId: 103,
                                    renderedId: 'M4+10AZZ',
                                    sex: 'M',
                                    genotype: 'PlpCre;Nf1 f/+',
                                    signal: 'flag',
                                    isAlive: true,
                                    attention:
                                        "pooled '+10' — meaning TBD, confirm with professor",
                                    activeTasks: [
                                        {
                                            type: 'Genes to check',
                                            signal: 'flag',
                                        },
                                        { type: 'Move', signal: 'plan' },
                                    ],
                                    dob: '2026-05-20',
                                    genotypeColor: geno('PlpCre;Nf1 f/+'),
                                    mates: [],
                                    parents: {
                                        father: {
                                            renderedId: 'M4BCW',
                                            metaId: 101,
                                            genotype: 'Nf1 f/+',
                                            genotypeColor: geno('Nf1 f/+'),
                                        },
                                        mother: {
                                            renderedId: 'F5AYL',
                                            metaId: 102,
                                            genotype: 'WT',
                                            genotypeColor: geno('WT'),
                                        },
                                    },
                                },
                            ],
                        },
                    ],
                },
                {
                    cageId: 2,
                    cageNumber: '2414',
                    location: 'Rack A / Row 2',
                    slots: [
                        {
                            slotId: 21,
                            label: 'D8',
                            mice: [
                                {
                                    metaId: 201,
                                    renderedId: 'F10BEVe',
                                    sex: 'F',
                                    genotype: 'Nf1 +/+',
                                    signal: 'done',
                                    isAlive: true,
                                    attention: null,
                                    activeTasks: [],
                                    dob: '2026-02-01',
                                    genotypeColor: geno('Nf1 +/+'),
                                    mates: [],
                                    parents: {
                                        father: {
                                            renderedId: 'M0AAA',
                                            metaId: null,
                                            genotype: 'Nf1 f/+',
                                            genotypeColor: geno('Nf1 f/+'),
                                        },
                                        mother: {
                                            renderedId: 'F0AAA',
                                            metaId: null,
                                            genotype: 'Nf1 +/+',
                                            genotypeColor: geno('Nf1 +/+'),
                                        },
                                    },
                                },
                                {
                                    metaId: 202,
                                    renderedId: 'U3BCX',
                                    sex: 'U',
                                    genotype: '?',
                                    signal: 'plan',
                                    isAlive: true,
                                    attention:
                                        'unsexed pup — genotype + sex pending',
                                    activeTasks: [
                                        { type: 'Genotyping', signal: 'plan' },
                                        {
                                            type: 'Genes to check',
                                            signal: 'instruction',
                                        },
                                    ],
                                    dob: '2026-09-02',
                                    genotypeColor: geno('?'),
                                    mates: [],
                                    parents: {
                                        father: {
                                            renderedId: 'M4BCW.2',
                                            metaId: 401,
                                            genotype: 'PlpCre;Ai14 +/-',
                                            genotypeColor:
                                                geno('PlpCre;Ai14 +/-'),
                                        },
                                        mother: {
                                            renderedId: 'F5AYL',
                                            metaId: 402,
                                            genotype: 'PlpCre;Ai14 +/+',
                                            genotypeColor:
                                                geno('PlpCre;Ai14 +/+'),
                                        },
                                    },
                                },
                                {
                                    metaId: 203,
                                    renderedId: 'U4BCX',
                                    sex: 'U',
                                    genotype: '?',
                                    signal: 'plan',
                                    isAlive: true,
                                    attention: null,
                                    activeTasks: [
                                        { type: 'Genotyping', signal: 'plan' },
                                    ],
                                    dob: '2026-09-02',
                                    genotypeColor: geno('?'),
                                    mates: [],
                                },
                            ],
                        },
                    ],
                },
                {
                    cageId: 5,
                    cageNumber: '2415',
                    location: 'Rack A / Row 3',
                    slots: [
                        {
                            slotId: 51,
                            label: 'G8',
                            mice: [
                                {
                                    metaId: 501,
                                    renderedId: 'M1BCW',
                                    sex: 'M',
                                    genotype: 'Nf1 f/f',
                                    signal: 'instruction',
                                    isAlive: true,
                                    attention:
                                        're-genotype + set up mating this week',
                                    activeTasks: [
                                        {
                                            type: 'Genotyping',
                                            signal: 'instruction',
                                        },
                                        { type: 'Mate', signal: 'plan' },
                                        {
                                            type: 'Genes to check',
                                            signal: 'flag',
                                        },
                                    ],
                                    dob: '2024-03-01',
                                    genotypeColor: geno('Nf1 f/f'),
                                    mates: [
                                        {
                                            partnerId: 'F9AYL',
                                            partnerMetaId: 502,
                                            color: MATE.gA,
                                        },
                                    ],
                                },
                                {
                                    metaId: 502,
                                    renderedId: 'F9AYL',
                                    sex: 'F',
                                    genotype: 'Nf1 f/+',
                                    signal: 'plan',
                                    isAlive: true,
                                    attention:
                                        'mated with two males (BEZ line-up)',
                                    activeTasks: [
                                        { type: 'Mate', signal: 'plan' },
                                        { type: 'Plug check', signal: 'plan' },
                                    ],
                                    dob: '2025-04-01',
                                    genotypeColor: geno('Nf1 f/+'),
                                    mates: [
                                        {
                                            partnerId: 'M1BCW',
                                            partnerMetaId: 501,
                                            color: MATE.gA,
                                        },
                                        {
                                            partnerId: 'M8BEZ',
                                            partnerMetaId: 503,
                                            color: MATE.gB,
                                        },
                                    ],
                                },
                            ],
                        },
                        {
                            slotId: 52,
                            label: 'H8',
                            mice: [
                                {
                                    metaId: 503,
                                    renderedId: 'M8BEZ',
                                    sex: 'M',
                                    genotype: 'WT',
                                    signal: 'done',
                                    isAlive: true,
                                    attention: null,
                                    activeTasks: [],
                                    dob: '2024-06-01',
                                    genotypeColor: geno('WT'),
                                    mates: [
                                        {
                                            partnerId: 'F9AYL',
                                            partnerMetaId: 502,
                                            color: MATE.gB,
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ],
        },
        {
            lineId: 2,
            lineName: 'PlpCre;Ai14',
            lineColor: '#f97316',
            nominalGenotypeColor: geno('PlpCre;Ai14 +/-'),
            cages: [
                {
                    cageId: 3,
                    cageNumber: '2501',
                    location: 'Rack B / Row 1',
                    slots: [
                        {
                            slotId: 31,
                            label: 'F8',
                            mice: [
                                {
                                    metaId: 301,
                                    renderedId: 'F5BGX',
                                    sex: 'F',
                                    genotype: 'Ai14 f/f',
                                    signal: 'dead',
                                    isAlive: false,
                                    attention: "sac'd 09-05",
                                    activeTasks: [],
                                    dob: '2025-01-15',
                                    genotypeColor: geno('Ai14 f/f'),
                                    mates: [],
                                },
                            ],
                        },
                    ],
                },
                {
                    cageId: 4,
                    cageNumber: '2502',
                    location: 'Rack B / Row 1',
                    slots: [
                        {
                            slotId: 41,
                            label: 'E8',
                            mice: [
                                {
                                    metaId: 401,
                                    renderedId: 'M4BCW.2',
                                    sex: 'M',
                                    genotype: 'PlpCre;Ai14 +/-',
                                    signal: 'instruction',
                                    isAlive: true,
                                    attention:
                                        're-clip (.2) — re-genotype this week',
                                    activeTasks: [
                                        {
                                            type: 'Genotyping',
                                            signal: 'instruction',
                                        },
                                    ],
                                    dob: '2024-08-01',
                                    genotypeColor: geno('PlpCre;Ai14 +/-'),
                                    // `dates` is a VIEW field: the real server RESOLVES it from
                                    // mates (occurred_at/expected_delivery_on) / litters /
                                    // genotyping_results / tasks — NOT a `mice` column. Seeded
                                    // flat here (plan §4 ratified 2026-09-12).
                                    dates: {
                                        lastMating: '2026-07-01',
                                        plug: '2026-07-03',
                                        deliv: '2026-07-21',
                                        tissue: null,
                                        genotyping: '2024-09-01',
                                    },
                                    mates: [
                                        {
                                            partnerId: 'F5AYL',
                                            partnerMetaId: 402,
                                            color: MATE.g401,
                                        },
                                    ],
                                },
                            ],
                        },
                        {
                            slotId: 42,
                            label: 'B8',
                            mice: [
                                {
                                    metaId: 402,
                                    renderedId: 'F5AYL',
                                    sex: 'F',
                                    genotype: 'PlpCre;Ai14 +/+',
                                    signal: 'plan',
                                    isAlive: true,
                                    attention: 'set up mating with M4BCW.2',
                                    activeTasks: [
                                        { type: 'Mate', signal: 'plan' },
                                        { type: 'Plug check', signal: 'plan' },
                                    ],
                                    dob: '2025-06-15',
                                    genotypeColor: geno('PlpCre;Ai14 +/+'),
                                    dates: {
                                        lastMating: '2026-07-01',
                                        plug: '2026-07-03',
                                        deliv: '2026-07-21',
                                        tissue: null,
                                        genotyping: null,
                                    },
                                    mates: [
                                        {
                                            partnerId: 'M4BCW.2',
                                            partnerMetaId: 401,
                                            color: MATE.g401,
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ],
        },
        {
            lineId: 3,
            lineName: 'C57BL/6 (WT ctrl)',
            lineColor: '#64748b',
            nominalGenotypeColor: geno('WT'),
            cages: [
                {
                    cageId: 6,
                    cageNumber: '3101',
                    location: 'Rack C / Row 1',
                    slots: [
                        {
                            slotId: 61,
                            label: 'A9',
                            mice: [
                                {
                                    metaId: 601,
                                    renderedId: 'M2WT',
                                    sex: 'M',
                                    genotype: 'WT',
                                    signal: 'done',
                                    isAlive: true,
                                    attention: null,
                                    activeTasks: [],
                                    dob: '2026-03-01',
                                    genotypeColor: geno('WT'),
                                    mates: [],
                                },
                                {
                                    metaId: 602,
                                    renderedId: 'F3WT',
                                    sex: 'F',
                                    genotype: 'WT',
                                    signal: 'flag',
                                    isAlive: true,
                                    attention: 'small wound on flank — check',
                                    activeTasks: [
                                        {
                                            type: 'Genes to check',
                                            signal: 'flag',
                                        },
                                    ],
                                    dob: '2025-02-01',
                                    genotypeColor: geno('WT'),
                                    mates: [],
                                },
                            ],
                        },
                        {
                            slotId: 62,
                            label: 'B9',
                            mice: [
                                {
                                    metaId: 603,
                                    renderedId: 'U5BFA',
                                    sex: 'U',
                                    genotype: '?',
                                    signal: 'plan',
                                    isAlive: true,
                                    attention:
                                        'new pup — sex + genotype pending',
                                    activeTasks: [
                                        { type: 'Genotyping', signal: 'plan' },
                                    ],
                                    dob: '2026-08-20',
                                    genotypeColor: geno('?'),
                                    mates: [],
                                    parents: {
                                        father: {
                                            renderedId: 'M2WT',
                                            metaId: 601,
                                            genotype: 'WT',
                                            genotypeColor: geno('WT'),
                                        },
                                        mother: {
                                            renderedId: 'F3WT',
                                            metaId: 602,
                                            genotype: 'WT',
                                            genotypeColor: geno('WT'),
                                        },
                                    },
                                },
                            ],
                        },
                        // Overcrowded slot — 6 live adults > cap(5) → red 6/5
                        // warning on the rail. One pup (U-…9) stays green and is
                        // NOT counted, proving the baby/adult boundary drives it.
                        {
                            slotId: 63,
                            label: 'C9',
                            mice: [
                                {
                                    metaId: 611,
                                    renderedId: 'M6WT',
                                    sex: 'M',
                                    genotype: 'WT',
                                    signal: 'done',
                                    isAlive: true,
                                    attention: null,
                                    activeTasks: [],
                                    dob: '2026-01-10',
                                    genotypeColor: geno('WT'),
                                    mates: [],
                                },
                                {
                                    metaId: 612,
                                    renderedId: 'M7WT',
                                    sex: 'M',
                                    genotype: 'WT',
                                    signal: 'done',
                                    isAlive: true,
                                    attention: null,
                                    activeTasks: [],
                                    dob: '2026-02-15',
                                    genotypeColor: geno('WT'),
                                    mates: [],
                                },
                                {
                                    metaId: 613,
                                    renderedId: 'F4WT',
                                    sex: 'F',
                                    genotype: 'WT',
                                    signal: 'done',
                                    isAlive: true,
                                    attention: null,
                                    activeTasks: [],
                                    dob: '2026-03-01',
                                    genotypeColor: geno('WT'),
                                    mates: [],
                                },
                                {
                                    metaId: 614,
                                    renderedId: 'F5WT',
                                    sex: 'F',
                                    genotype: 'WT',
                                    signal: 'done',
                                    isAlive: true,
                                    attention: null,
                                    activeTasks: [],
                                    dob: '2026-03-20',
                                    genotypeColor: geno('WT'),
                                    mates: [],
                                },
                                {
                                    metaId: 615,
                                    renderedId: 'F6WT',
                                    sex: 'F',
                                    genotype: 'WT',
                                    signal: 'done',
                                    isAlive: true,
                                    attention: null,
                                    activeTasks: [],
                                    dob: '2026-04-05',
                                    genotypeColor: geno('WT'),
                                    mates: [],
                                },
                                {
                                    metaId: 616,
                                    renderedId: 'M8WT',
                                    sex: 'M',
                                    genotype: 'WT',
                                    signal: 'done',
                                    isAlive: true,
                                    attention: null,
                                    activeTasks: [],
                                    dob: '2026-05-01',
                                    genotypeColor: geno('WT'),
                                    mates: [],
                                },
                                {
                                    metaId: 617,
                                    renderedId: 'U9WT',
                                    sex: 'U',
                                    genotype: 'WT',
                                    signal: 'plan',
                                    isAlive: true,
                                    attention: 'litter pup — not yet weaned',
                                    activeTasks: [],
                                    dob: '2026-09-04',
                                    genotypeColor: geno('WT'),
                                    mates: [],
                                },
                            ],
                        },
                    ],
                },
            ],
        },
    ],
};

// Seed for form pickers (mouse/cage options) in the client store era.
export const SEED_COLONY = COLONY_GRID;

// Simulates the async shape of the real fetcher; echoes the requested colonyId
// so the seam matches the real endpoint (which will key off it).
export async function getColonyGrid(colonyId: number): Promise<ColonyGrid> {
    return { ...COLONY_GRID, colonyId };
}
