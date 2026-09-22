import type { MouseDetail } from '@repo/types';

// Mock fetcher for the Mouse drawer. Keyed by mouse_meta_id; the real endpoint
// resolves every version row of the mouse and returns the append-only history.
// Rich entries cover the ambiguity cases seeded in the grid fixture; anything
// else gets a minimal fallback so the drawer always has something to show.

const DETAILS: Record<number, MouseDetail> = {
    // M4BCW — an ordinary breeder
    101: {
        metaId: 101,
        dob: '2026-06-01',
        litterCode: 'BCW',
        genes: [{ code: 'Nf1', allele: 'f/+' }],
        parents: [
            { role: 'mother', label: 'F5AYL', genotype: 'WT' },
            { role: 'father', label: 'M5AUV', genotype: 'PlpCre;Nf1 f/+' },
        ],
        history: [
            {
                at: '2026-08-20',
                actor: 'Jia',
                summary: 'genotyped: Nf1 f/+',
            },
            {
                at: '2026-08-10',
                actor: 'Sam',
                summary: 'weaned into cage 2413 · slot A8',
            },
            {
                at: '2026-06-01',
                actor: 'system',
                summary: 'born — litter BCW, pup 4',
            },
        ],
    },
    // M4+10AZZ — the "+10" pup-number offset, assigned on transfer (plan §5 Q23)
    103: {
        metaId: 103,
        dob: '2026-06-14',
        litterCode: 'AZZ',
        genes: [
            { code: 'PlpCre', allele: 'hmo' },
            { code: 'Nf1', allele: 'f/+' },
        ],
        parents: [{ role: 'mother', label: 'F5AYL', genotype: 'WT' }],
        history: [
            {
                at: '2026-09-02',
                actor: 'Jia',
                summary:
                    "flagged: transfer offset '+10' — storage design pending (plan §5 Q45)",
            },
            {
                at: '2026-06-14',
                actor: 'system',
                summary: 'born — litter AZZ',
            },
        ],
    },
    // U3BCX — an unsexed pup (identity is a surrogate; the id will re-render on sexing)
    202: {
        metaId: 202,
        dob: '2026-08-28',
        litterCode: 'BCX',
        genes: [],
        parents: [
            { role: 'mother', label: 'F10BEVe', genotype: 'Nf1 +/+' },
            { role: 'father', label: 'M4BCW', genotype: 'Nf1 f/+' },
        ],
        history: [
            {
                at: '2026-08-28',
                actor: 'system',
                summary: 'born U (unsexed) — sex + genotype pending',
            },
        ],
    },
    // F5BGX — reached endpoint, now dead
    301: {
        metaId: 301,
        dob: '2026-05-02',
        litterCode: 'BGX',
        genes: [{ code: 'Ai14', allele: 'f/f' }],
        parents: [],
        history: [
            {
                at: '2026-09-05',
                actor: 'Jia',
                summary: "sac'd — endpoint reached (marked dead)",
            },
            {
                at: '2026-07-01',
                actor: 'Sam',
                summary: 'moved cage 2410 → 2501 · slot A8',
            },
            {
                at: '2026-05-02',
                actor: 'system',
                summary: 'born — litter BGX',
            },
        ],
    },
    // M4BCW.2 — a second tissue collection (.2)
    401: {
        metaId: 401,
        dob: '2026-06-01',
        litterCode: 'BCW',
        genes: [
            { code: 'PlpCre', allele: '+/-' },
            { code: 'Ai14', allele: '+/-' },
        ],
        parents: [{ role: 'mother', label: 'F5AYL', genotype: 'PlpCre;Ai14' }],
        history: [
            {
                at: '2026-09-06',
                actor: 'Sam',
                summary:
                    'second tissue collection (.2) — re-genotype scheduled',
            },
            {
                at: '2026-06-01',
                actor: 'system',
                summary: 'born — litter BCW',
            },
        ],
    },
};

function fallback(metaId: number): MouseDetail {
    return {
        metaId,
        dob: null,
        litterCode: '—',
        genes: [],
        parents: [],
        history: [
            { at: '—', actor: 'system', summary: 'no recorded history yet' },
        ],
    };
}

export async function getMouseDetail(metaId: number): Promise<MouseDetail> {
    return DETAILS[metaId] ?? fallback(metaId);
}
