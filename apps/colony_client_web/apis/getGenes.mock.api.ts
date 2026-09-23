import type { Gene } from '@repo/types';

// Mock fetcher for the gene/marker CATALOGUE (the `genes` table, migration
// 0014). Named as the FUTURE real fetcher (getGenes) so the mock→real swap is a
// single-file change.
//
// Codes are BARE — one row per GENE, zygosity excluded (migration 0029 moved it
// onto mice_genes.allele_pat/allele_mat). This is what the genotype pickers in
// AddMouseDialog / IdentitySection offer; what a mouse actually carries is
// MouseCell.genes (GeneRef[]).
//
// 'WT' is a REAL catalogue row, deliberately: a mouse known to be wild type
// carries a WT row, while a mouse with NO rows reads '?' (not genotyped). If WT
// were modelled as the empty state those two facts would collapse into one and
// every wild-type mouse would look like it still needs genotyping.
//
// 'ccEGFP' is in the catalogue but carried by no mouse in the seed grid — also
// deliberate: a catalogue exists independently of who currently carries what.
const GENES: Gene[] = [
    { geneId: 1, code: 'Nf1', label: 'Neurofibromin 1 (floxed)' },
    { geneId: 2, code: 'PlpCre', label: 'Plp1-CreERT2 driver' },
    { geneId: 3, code: 'Ai14', label: 'Ai14 tdTomato reporter' },
    { geneId: 4, code: 'ccEGFP', label: 'Cre-conditional EGFP reporter' },
    { geneId: 5, code: 'WT', label: 'Wild type (no marker)' },
];

// Codes only, in catalogue order — what the badge pickers render.
export const GENE_CATALOG_CODES: readonly string[] = GENES.map((g) => g.code);

// Simulates the async shape of the real fetcher.
export async function getGenes(): Promise<Gene[]> {
    return GENES;
}
