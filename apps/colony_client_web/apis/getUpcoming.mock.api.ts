// Mock fetcher for the Upcoming / due view.
// Named to match the future real fetcher so mock→real is a one-file swap.
// Items reference the same fixture entities (lines, cages, mice, litters) as
// the grid and task-bin screens so all three screens tell one coherent story.
// Several dueDates are derived via lib/dueDates helpers — proof that the pure
// core is wired end-to-end.

import {
    expectedDeliveryOn,
    genotypeOn,
    plugCheckOn,
    weanOn,
} from '../lib/dueDates';

export interface UpcomingItem {
    id: number;
    kind: 'plug-check' | 'delivery' | 'wean' | 'genotype';
    title: string;
    subjectLabel: string;
    subjectKind: 'mouse' | 'cage' | 'litter' | 'mate';
    dueDate: string;
    note: string | null;
}

// Mating that went in 2026-08-29 → plug check 2026-09-08 (today), delivery 2026-09-18.
const MATING_A = '2026-08-29';
// Mating that went in 2026-08-20 → delivery 2026-09-09 (soon).
const MATING_B = '2026-08-20';
// Pup litter BCW dob 2026-08-18 → wean + genotype 2026-09-08 (today).
const DOB_BCW = '2026-08-18';
// Pup litter BCX dob 2026-08-11 → wean/genotype 2026-09-01 (overdue).
const DOB_BCX = '2026-08-11';

const ITEMS: UpcomingItem[] = [
    {
        id: 1,
        kind: 'plug-check',
        title: 'Plug check',
        subjectLabel: 'cage 2413',
        subjectKind: 'cage',
        // mating 2026-08-29 +10 d = 2026-09-08 (today)
        dueDate: plugCheckOn(MATING_A),
        note: 'M4BCW × F5AYL — pNf1 flox;ccEGFP cross',
    },
    {
        id: 2,
        kind: 'wean',
        title: 'Wean litter',
        subjectLabel: 'litter BCW',
        subjectKind: 'litter',
        // dob 2026-08-18 +21 d = 2026-09-08 (today)
        dueDate: weanOn(DOB_BCW),
        note: 'cage 2414 — pNf1 flox;ccEGFP',
    },
    {
        id: 3,
        kind: 'delivery',
        title: 'Expected delivery',
        subjectLabel: 'cage 2501',
        subjectKind: 'cage',
        // mating 2026-08-20 +20 d = 2026-09-09 (soon +1)
        dueDate: expectedDeliveryOn(MATING_B),
        note: 'M4+10AZZ × F5BGX — PlpCre;Ai14 cross',
    },
    {
        id: 4,
        kind: 'genotype',
        title: 'Genotype pups',
        subjectLabel: 'litter BCX',
        subjectKind: 'litter',
        // dob 2026-08-11 +21 d = 2026-09-01 (overdue)
        dueDate: genotypeOn(DOB_BCX),
        note: 'cage 2502 — U3BCX, U4BCX still unresolved',
    },
    {
        id: 5,
        kind: 'wean',
        title: 'Wean litter',
        subjectLabel: 'litter BCX',
        subjectKind: 'litter',
        // same cohort — also overdue
        dueDate: weanOn(DOB_BCX),
        note: 'cage 2502 — overdue; flag for Dr. Lopez-Juarez',
    },
    {
        id: 6,
        kind: 'plug-check',
        title: 'Plug check',
        subjectLabel: 'cage 2502',
        subjectKind: 'cage',
        // mating 2026-09-01 +10 d = 2026-09-11 (soon +3)
        dueDate: plugCheckOn('2026-09-01'),
        note: 'U3BCX re-mated — PlpCre;Ai14 line',
    },
    {
        id: 7,
        kind: 'delivery',
        title: 'Expected delivery',
        subjectLabel: 'cage 2413',
        subjectKind: 'cage',
        // mating 2026-08-29 +20 d = 2026-09-18 (later)
        dueDate: expectedDeliveryOn(MATING_A),
        note: 'M4BCW × F5AYL — pNf1 flox;ccEGFP',
    },
    {
        id: 8,
        kind: 'genotype',
        title: 'Genotype re-clip',
        subjectLabel: 'M4BCW.2',
        subjectKind: 'mouse',
        // fixed date — re-clip scheduled after wean
        dueDate: '2026-09-10',
        note: 're-run PCR; first clip inconclusive',
    },
];

// Seed for the client store; the real fetcher will replace this.
export const SEED_UPCOMING = ITEMS;

export async function getUpcoming(): Promise<UpcomingItem[]> {
    return ITEMS;
}
