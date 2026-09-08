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

const COLONY_GRID: ColonyGrid = {
    colonyId: 1,
    colonyName: 'Lopez-Juarez Lab',
    lines: [
        {
            lineId: 1,
            lineName: 'pNf1 flox;ccEGFP',
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
                                },
                                {
                                    metaId: 102,
                                    renderedId: 'F5AYL',
                                    sex: 'F',
                                    genotype: 'WT',
                                    signal: 'done',
                                    isAlive: true,
                                    attention: null,
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
                            label: 'A8',
                            mice: [
                                {
                                    metaId: 201,
                                    renderedId: 'F10BEVe',
                                    sex: 'F',
                                    genotype: 'Nf1 +/+',
                                    signal: 'done',
                                    isAlive: true,
                                    attention: null,
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
                                },
                                {
                                    metaId: 203,
                                    renderedId: 'U4BCX',
                                    sex: 'U',
                                    genotype: '?',
                                    signal: 'plan',
                                    isAlive: true,
                                    attention: null,
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
            cages: [
                {
                    cageId: 3,
                    cageNumber: '2501',
                    location: 'Rack B / Row 1',
                    slots: [
                        {
                            slotId: 31,
                            label: 'A8',
                            mice: [
                                {
                                    metaId: 301,
                                    renderedId: 'F5BGX',
                                    sex: 'F',
                                    genotype: 'Ai14 f/f',
                                    signal: 'dead',
                                    isAlive: false,
                                    attention: "sac'd 09-05",
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
                            label: 'A8',
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
