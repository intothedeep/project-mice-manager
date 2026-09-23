import type { ColonyGrid, GeneRef } from '@repo/types';
import { genotypeOf, UNKNOWN_GENOTYPE } from '@/lib/genotype';

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
//   - M4+10AZZ : the "+N" pup-number-offset notation, assigned on transfer
//   - U3BCX    : an unsexed newborn pup (sex = U until genotyped/sexed)
//   - F10BEVe  : ear-tag suffix "e"
//   - M4BCW    : reclip animal — ".2" label is READ-TIME derived from
//                Tissue-collection done cases (Option C). No stored suffix.
//
// NOTE (T6): activeTasks removed from all MouseCell objects. Badges are now
// derived from the case store (useTasks + signalColorOf) in ColonyGridView,
// keyed by mouse metaId. No per-mouse task data lives here.

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

// Hardcoded gene rows — the mock of `mice_genes`. Every set below is authored BY
// HAND (owner: "mockdata hardcoding these values"); nothing here is derived by
// parsing a genotype string, which is the defect this whole change removes.
// Mice that carry the same markers share a set; a mouse with NO set (genes: [])
// is NOT GENOTYPED and renders '?'.
//
// 'WT' is an ordinary row, not the empty state — see apis/getGenes.mock.api.ts.
//
// ALLELES: null = zygosity NOT RECORDED, which is what the markers that have no
// zygosity to record carry ('WT', the 'PlpCre' driver) — those render as the
// bare code. An explicit '+' is a RECORDED wild-type allele, which is why
// G_NF1_PLUS_PLUS renders "Nf1 +/+" while G_WT renders "WT". The two are
// different facts; see lib/genotype.ts.
const G_WT: GeneRef[] = [
    { code: 'WT', allelePat: null, alleleMat: null, orderIndex: 0 },
];
const G_NF1_F_PLUS: GeneRef[] = [
    { code: 'Nf1', allelePat: 'f', alleleMat: '+', orderIndex: 0 },
];
const G_NF1_PLUS_PLUS: GeneRef[] = [
    { code: 'Nf1', allelePat: '+', alleleMat: '+', orderIndex: 0 },
];
const G_NF1_F_F: GeneRef[] = [
    { code: 'Nf1', allelePat: 'f', alleleMat: 'f', orderIndex: 0 },
];
const G_AI14_F_F: GeneRef[] = [
    { code: 'Ai14', allelePat: 'f', alleleMat: 'f', orderIndex: 0 },
];
const G_PLPCRE_AI14_PLUS_PLUS: GeneRef[] = [
    { code: 'PlpCre', allelePat: null, alleleMat: null, orderIndex: 0 },
    { code: 'Ai14', allelePat: '+', alleleMat: '+', orderIndex: 1 },
];
const G_PLPCRE_NF1_F_PLUS: GeneRef[] = [
    { code: 'PlpCre', allelePat: null, alleleMat: null, orderIndex: 0 },
    { code: 'Nf1', allelePat: 'f', alleleMat: '+', orderIndex: 1 },
];

// Colour for a gene set, keyed through the SAME composer the grid renders with
// (lib/genotype.ts) — never through a second hand-written string. A GENO key
// that drifts from the composed form would silently fall back to "no fill" with
// no compile error behind it, so there must be exactly one composer.
const genoOf = (genes: GeneRef[]): string | null => geno(genotypeOf({ genes }));

// Mate-group colours, keyed by the father-fanout group (color_assignments channel='mate').
// A mouse carries one hex per group it belongs to; a female mated to two males → two hexes.
const MATE = {
    // group: father M4BCW (metaId 101) × F5AYL (402)
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
                                    punches: [
                                        {
                                            punchId: 1,
                                            location: 'toe',
                                            effectiveAt: '2024-02-10',
                                        },
                                        {
                                            punchId: 24,
                                            location: 'untagged',
                                            effectiveAt: '2024-02-10',
                                        },
                                    ],
                                    pupNumber: 4,
                                    litterCode: 'BCW',
                                    pupOffsets: [],
                                    sex: 'M',
                                    genes: G_NF1_F_PLUS,
                                    signal: 'done',
                                    isAlive: true,
                                    attention:
                                        're-clip (.2) — re-genotype this week',
                                    dob: '2024-02-10',
                                    genotypeColor: genoOf(G_NF1_F_PLUS),
                                    // dates resolved from mates/tasks (plan §4). Migrated from
                                    // former separate-mouse record (metaId 401) — same animal.
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
                                            matedOn: '2026-07-02',
                                        },
                                    ],
                                },
                                {
                                    metaId: 102,
                                    punches: [
                                        {
                                            punchId: 2,
                                            location: 'toe',
                                            effectiveAt: '2025-05-01',
                                        },
                                        {
                                            punchId: 25,
                                            location: 'untagged',
                                            effectiveAt: '2025-05-01',
                                        },
                                    ],
                                    pupNumber: 5,
                                    litterCode: 'AYL',
                                    pupOffsets: [],
                                    sex: 'F',
                                    genes: G_WT,
                                    signal: 'done',
                                    isAlive: true,
                                    attention: null,
                                    dob: '2025-05-01',
                                    genotypeColor: genoOf(G_WT),
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
                                    punches: [
                                        {
                                            punchId: 3,
                                            location: 'toe',
                                            effectiveAt: '2026-05-20',
                                        },
                                        {
                                            punchId: 26,
                                            location: 'untagged',
                                            effectiveAt: '2026-05-20',
                                        },
                                    ],
                                    pupNumber: 4,
                                    litterCode: 'AZZ',
                                    pupOffsets: [10],
                                    sex: 'M',
                                    genes: G_PLPCRE_NF1_F_PLUS,
                                    signal: 'flag',
                                    isAlive: true,
                                    attention:
                                        "transfer offset '+10' — storage design pending (plan §5 Q45)",
                                    dob: '2026-05-20',
                                    genotypeColor: genoOf(G_PLPCRE_NF1_F_PLUS),
                                    mates: [],
                                    parents: {
                                        father: {
                                            metaId: 101,
                                            genotypeColor: genoOf(G_NF1_F_PLUS),
                                        },
                                        mother: {
                                            metaId: 102,
                                            genotypeColor: genoOf(G_WT),
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
                                    punches: [
                                        {
                                            punchId: 4,
                                            location: 'toe',
                                            effectiveAt: '2026-02-01',
                                        },
                                        // the 'e' in F10BEVe is this row — the label is composed from it, not typed
                                        {
                                            punchId: 22,
                                            location: 'ear',
                                            effectiveAt: '2026-03-01',
                                        },
                                        // No fixture mouse carries two active ear punches, so the
                                        // "ee" form (Q41) has no seed coverage — deliberate (owner).
                                        {
                                            punchId: 27,
                                            location: 'untagged',
                                            effectiveAt: '2026-02-01',
                                        },
                                    ],
                                    pupNumber: 10,
                                    litterCode: 'BEV',
                                    pupOffsets: [],
                                    sex: 'F',
                                    genes: G_NF1_PLUS_PLUS,
                                    signal: 'done',
                                    isAlive: true,
                                    attention: null,
                                    dob: '2026-02-01',
                                    genotypeColor: genoOf(G_NF1_PLUS_PLUS),
                                    mates: [],
                                    parents: {
                                        father: {
                                            snapshotLabel: 'M0AAA',
                                            metaId: null,
                                            genotype: 'Nf1 f/+',
                                            genotypeColor: geno('Nf1 f/+'),
                                        },
                                        mother: {
                                            snapshotLabel: 'F0AAA',
                                            metaId: null,
                                            genotype: 'Nf1 +/+',
                                            genotypeColor: geno('Nf1 +/+'),
                                        },
                                    },
                                },
                                {
                                    metaId: 202,
                                    punches: [
                                        {
                                            punchId: 5,
                                            location: 'toe',
                                            effectiveAt: '2026-09-02',
                                        },
                                        {
                                            punchId: 28,
                                            location: 'untagged',
                                            effectiveAt: '2026-09-02',
                                        },
                                    ],
                                    pupNumber: 3,
                                    litterCode: 'BCX',
                                    pupOffsets: [],
                                    sex: 'U',
                                    genes: [],
                                    signal: 'plan',
                                    isAlive: true,
                                    attention:
                                        'unsexed pup — genotype + sex pending',
                                    dob: '2026-09-02',
                                    genotypeColor: geno(UNKNOWN_GENOTYPE),
                                    mates: [],
                                    parents: {
                                        // Father is M4BCW (metaId 101) — the reclipped animal.
                                        // In-grid arm carries no label: ParentRow resolves 101's
                                        // MouseCell and composes it (base + .N), so it renders
                                        // M4BCW.2 here instead of the bare M4BCW.
                                        father: {
                                            metaId: 101,
                                            genotypeColor: genoOf(G_NF1_F_PLUS),
                                        },
                                        mother: {
                                            metaId: 402,
                                            genotypeColor: genoOf(
                                                G_PLPCRE_AI14_PLUS_PLUS
                                            ),
                                        },
                                    },
                                },
                                {
                                    metaId: 203,
                                    punches: [
                                        {
                                            punchId: 6,
                                            location: 'toe',
                                            effectiveAt: '2026-09-02',
                                        },
                                        {
                                            punchId: 29,
                                            location: 'untagged',
                                            effectiveAt: '2026-09-02',
                                        },
                                    ],
                                    pupNumber: 4,
                                    litterCode: 'BCX',
                                    pupOffsets: [],
                                    sex: 'U',
                                    genes: [],
                                    signal: 'plan',
                                    isAlive: true,
                                    attention: null,
                                    dob: '2026-09-02',
                                    genotypeColor: geno(UNKNOWN_GENOTYPE),
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
                                    punches: [
                                        {
                                            punchId: 7,
                                            location: 'toe',
                                            effectiveAt: '2024-03-01',
                                        },
                                        {
                                            punchId: 30,
                                            location: 'untagged',
                                            effectiveAt: '2024-03-01',
                                        },
                                    ],
                                    pupNumber: 1,
                                    litterCode: 'BCW',
                                    pupOffsets: [],
                                    sex: 'M',
                                    genes: G_NF1_F_F,
                                    signal: 'instruction',
                                    isAlive: true,
                                    attention:
                                        're-genotype + set up mating this week',
                                    dob: '2024-03-01',
                                    genotypeColor: genoOf(G_NF1_F_F),
                                    mates: [
                                        {
                                            partnerId: 'F9AYL',
                                            partnerMetaId: 502,
                                            color: MATE.gA,
                                            matedOn: '2026-08-14',
                                        },
                                    ],
                                },
                                {
                                    metaId: 502,
                                    punches: [
                                        {
                                            punchId: 8,
                                            location: 'toe',
                                            effectiveAt: '2025-04-01',
                                        },
                                        {
                                            punchId: 31,
                                            location: 'untagged',
                                            effectiveAt: '2025-04-01',
                                        },
                                    ],
                                    pupNumber: 9,
                                    litterCode: 'AYL',
                                    pupOffsets: [],
                                    sex: 'F',
                                    genes: G_NF1_F_PLUS,
                                    signal: 'plan',
                                    isAlive: true,
                                    attention:
                                        'mated with two males (BEZ line-up)',
                                    dob: '2025-04-01',
                                    genotypeColor: genoOf(G_NF1_F_PLUS),
                                    mates: [
                                        {
                                            partnerId: 'M1BCW',
                                            partnerMetaId: 501,
                                            color: MATE.gA,
                                            matedOn: '2026-08-20',
                                        },
                                        {
                                            partnerId: 'M8BEZ',
                                            partnerMetaId: 503,
                                            color: MATE.gB,
                                            matedOn: '2026-06-11',
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
                                    punches: [
                                        {
                                            punchId: 9,
                                            location: 'toe',
                                            effectiveAt: '2024-06-01',
                                        },
                                        {
                                            punchId: 32,
                                            location: 'untagged',
                                            effectiveAt: '2024-06-01',
                                        },
                                    ],
                                    pupNumber: 8,
                                    litterCode: 'BEZ',
                                    pupOffsets: [],
                                    sex: 'M',
                                    genes: G_WT,
                                    signal: 'done',
                                    isAlive: true,
                                    attention: null,
                                    dob: '2024-06-01',
                                    genotypeColor: genoOf(G_WT),
                                    mates: [
                                        {
                                            partnerId: 'F9AYL',
                                            partnerMetaId: 502,
                                            color: MATE.gB,
                                            matedOn: '2026-08-14',
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
                                    punches: [
                                        {
                                            punchId: 10,
                                            location: 'toe',
                                            effectiveAt: '2025-01-15',
                                        },
                                        {
                                            punchId: 33,
                                            location: 'untagged',
                                            effectiveAt: '2025-01-15',
                                        },
                                    ],
                                    pupNumber: 5,
                                    litterCode: 'BGX',
                                    pupOffsets: [],
                                    sex: 'F',
                                    genes: G_AI14_F_F,
                                    signal: 'dead',
                                    isAlive: false,
                                    attention: "sac'd 09-05",
                                    dob: '2025-01-15',
                                    genotypeColor: genoOf(G_AI14_F_F),
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
                            // Slot 41 (E8): formerly held M4BCW.2 (metaId 401).
                            // M4BCW is the SAME animal (re-clip, not a new mouse) —
                            // merged back onto metaId 101 in pNf1 cage 2413. Empty slot
                            // left in place; the grid renders mice:[] as an empty slot row.
                            slotId: 41,
                            label: 'E8',
                            mice: [],
                        },
                        {
                            slotId: 42,
                            label: 'B8',
                            mice: [
                                {
                                    metaId: 402,
                                    punches: [
                                        {
                                            punchId: 11,
                                            location: 'toe',
                                            effectiveAt: '2025-06-15',
                                        },
                                        {
                                            punchId: 34,
                                            location: 'untagged',
                                            effectiveAt: '2025-06-15',
                                        },
                                    ],
                                    pupNumber: 5,
                                    litterCode: 'AYL',
                                    pupOffsets: [],
                                    sex: 'F',
                                    genes: G_PLPCRE_AI14_PLUS_PLUS,
                                    signal: 'plan',
                                    isAlive: true,
                                    attention: 'set up mating with M4BCW',
                                    dob: '2025-06-15',
                                    genotypeColor: genoOf(
                                        G_PLPCRE_AI14_PLUS_PLUS
                                    ),
                                    dates: {
                                        lastMating: '2026-07-01',
                                        plug: '2026-07-03',
                                        deliv: '2026-07-21',
                                        tissue: null,
                                        genotyping: null,
                                    },
                                    mates: [
                                        {
                                            partnerId: 'M4BCW',
                                            partnerMetaId: 101,
                                            color: MATE.g401,
                                            matedOn: '2026-05-30',
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
                                    punches: [
                                        {
                                            punchId: 12,
                                            location: 'toe',
                                            effectiveAt: '2026-03-01',
                                        },
                                        {
                                            punchId: 35,
                                            location: 'untagged',
                                            effectiveAt: '2026-03-01',
                                        },
                                    ],
                                    pupNumber: 2,
                                    litterCode: 'WT',
                                    pupOffsets: [],
                                    sex: 'M',
                                    genes: G_WT,
                                    signal: 'done',
                                    isAlive: true,
                                    attention: null,
                                    dob: '2026-03-01',
                                    genotypeColor: genoOf(G_WT),
                                    mates: [],
                                },
                                {
                                    metaId: 602,
                                    punches: [
                                        {
                                            punchId: 13,
                                            location: 'toe',
                                            effectiveAt: '2025-02-01',
                                        },
                                        {
                                            punchId: 36,
                                            location: 'untagged',
                                            effectiveAt: '2025-02-01',
                                        },
                                    ],
                                    pupNumber: 3,
                                    litterCode: 'WT',
                                    pupOffsets: [],
                                    sex: 'F',
                                    genes: G_WT,
                                    signal: 'flag',
                                    isAlive: true,
                                    attention: 'small wound on flank — check',
                                    dob: '2025-02-01',
                                    genotypeColor: genoOf(G_WT),
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
                                    punches: [
                                        {
                                            punchId: 14,
                                            location: 'toe',
                                            effectiveAt: '2026-08-20',
                                        },
                                        {
                                            punchId: 37,
                                            location: 'untagged',
                                            effectiveAt: '2026-08-20',
                                        },
                                    ],
                                    pupNumber: 5,
                                    litterCode: 'BFA',
                                    pupOffsets: [],
                                    sex: 'U',
                                    genes: [],
                                    signal: 'plan',
                                    isAlive: true,
                                    attention:
                                        'new pup — sex + genotype pending',
                                    dob: '2026-08-20',
                                    genotypeColor: geno(UNKNOWN_GENOTYPE),
                                    mates: [],
                                    parents: {
                                        father: {
                                            metaId: 601,
                                            genotypeColor: genoOf(G_WT),
                                        },
                                        mother: {
                                            metaId: 602,
                                            genotypeColor: genoOf(G_WT),
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
                                    punches: [
                                        {
                                            punchId: 15,
                                            location: 'toe',
                                            effectiveAt: '2026-01-10',
                                        },
                                        {
                                            punchId: 38,
                                            location: 'untagged',
                                            effectiveAt: '2026-01-10',
                                        },
                                    ],
                                    pupNumber: 6,
                                    litterCode: 'WT',
                                    pupOffsets: [],
                                    sex: 'M',
                                    genes: G_WT,
                                    signal: 'done',
                                    isAlive: true,
                                    attention: null,
                                    dob: '2026-01-10',
                                    genotypeColor: genoOf(G_WT),
                                    mates: [],
                                },
                                {
                                    metaId: 612,
                                    punches: [
                                        {
                                            punchId: 16,
                                            location: 'toe',
                                            effectiveAt: '2026-02-15',
                                        },
                                        {
                                            punchId: 39,
                                            location: 'untagged',
                                            effectiveAt: '2026-02-15',
                                        },
                                    ],
                                    pupNumber: 7,
                                    litterCode: 'WT',
                                    pupOffsets: [],
                                    sex: 'M',
                                    genes: G_WT,
                                    signal: 'done',
                                    isAlive: true,
                                    attention: null,
                                    dob: '2026-02-15',
                                    genotypeColor: genoOf(G_WT),
                                    mates: [],
                                },
                                {
                                    metaId: 613,
                                    punches: [
                                        {
                                            punchId: 17,
                                            location: 'toe',
                                            effectiveAt: '2026-03-01',
                                        },
                                        {
                                            punchId: 40,
                                            location: 'untagged',
                                            effectiveAt: '2026-03-01',
                                        },
                                    ],
                                    pupNumber: 4,
                                    litterCode: 'WT',
                                    pupOffsets: [],
                                    sex: 'F',
                                    genes: G_WT,
                                    signal: 'done',
                                    isAlive: true,
                                    attention: null,
                                    dob: '2026-03-01',
                                    genotypeColor: genoOf(G_WT),
                                    mates: [],
                                },
                                {
                                    metaId: 614,
                                    punches: [
                                        {
                                            punchId: 18,
                                            location: 'toe',
                                            effectiveAt: '2026-03-20',
                                        },
                                        {
                                            punchId: 41,
                                            location: 'untagged',
                                            effectiveAt: '2026-03-20',
                                        },
                                    ],
                                    pupNumber: 5,
                                    litterCode: 'WT',
                                    pupOffsets: [],
                                    sex: 'F',
                                    genes: G_WT,
                                    signal: 'done',
                                    isAlive: true,
                                    attention: null,
                                    dob: '2026-03-20',
                                    genotypeColor: genoOf(G_WT),
                                    mates: [],
                                },
                                {
                                    metaId: 615,
                                    punches: [
                                        {
                                            punchId: 19,
                                            location: 'toe',
                                            effectiveAt: '2026-04-05',
                                        },
                                        {
                                            punchId: 42,
                                            location: 'untagged',
                                            effectiveAt: '2026-04-05',
                                        },
                                    ],
                                    pupNumber: 6,
                                    litterCode: 'WT',
                                    pupOffsets: [],
                                    sex: 'F',
                                    genes: G_WT,
                                    signal: 'done',
                                    isAlive: true,
                                    attention: null,
                                    dob: '2026-04-05',
                                    genotypeColor: genoOf(G_WT),
                                    mates: [],
                                },
                                {
                                    metaId: 616,
                                    punches: [
                                        {
                                            punchId: 20,
                                            location: 'toe',
                                            effectiveAt: '2026-05-01',
                                        },
                                        {
                                            punchId: 43,
                                            location: 'untagged',
                                            effectiveAt: '2026-05-01',
                                        },
                                    ],
                                    pupNumber: 8,
                                    litterCode: 'WT',
                                    pupOffsets: [],
                                    sex: 'M',
                                    genes: G_WT,
                                    signal: 'done',
                                    isAlive: true,
                                    attention: null,
                                    dob: '2026-05-01',
                                    genotypeColor: genoOf(G_WT),
                                    mates: [],
                                },
                                {
                                    metaId: 617,
                                    punches: [
                                        {
                                            punchId: 21,
                                            location: 'toe',
                                            effectiveAt: '2026-09-04',
                                        },
                                        {
                                            punchId: 44,
                                            location: 'untagged',
                                            effectiveAt: '2026-09-04',
                                        },
                                    ],
                                    pupNumber: 9,
                                    litterCode: 'WT',
                                    pupOffsets: [],
                                    sex: 'U',
                                    genes: G_WT,
                                    signal: 'plan',
                                    isAlive: true,
                                    attention: 'litter pup — not yet weaned',
                                    dob: '2026-09-04',
                                    genotypeColor: genoOf(G_WT),
                                    mates: [],
                                },
                                {
                                    // 8d fixture coverage: a pup that arrived
                                    // with no physical tag. `untagged` is an
                                    // ordinary fourth punch_location value
                                    // (0028_punch_location_untagged.sql) and
                                    // renders no suffix, same as `toe`.
                                    metaId: 618,
                                    punches: [
                                        {
                                            punchId: 23,
                                            location: 'untagged',
                                            effectiveAt: '2026-09-10',
                                        },
                                    ],
                                    pupNumber: 10,
                                    litterCode: 'WT',
                                    pupOffsets: [],
                                    sex: 'U',
                                    genes: G_WT,
                                    signal: 'plan',
                                    isAlive: true,
                                    attention: 'litter pup — not yet weaned',
                                    dob: '2026-09-10',
                                    genotypeColor: genoOf(G_WT),
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
