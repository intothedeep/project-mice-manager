import type { Gene } from '@repo/types';

// Mock fetcher for the gene/marker CATALOGUE (the `genes` table, migration
// 0014). Named as the FUTURE real fetcher (getGenes) so the mock→real swap is a
// single-file change.
//
// Codes are BARE — one row per GENE, zygosity excluded (migration 0029 moved it
// onto mice_genes.allele_mat/allele_pat). This is what the genotype pickers in
// AddMouseDialog / IdentitySection offer; what a mouse actually carries is
// MouseCell.genes (GeneRef[]).
//
// 'WT' is a REAL catalogue row, deliberately: a mouse known to be wild type
// carries a WT row, while a mouse with NO rows reads '?' (not genotyped). If WT
// were modelled as the empty state those two facts would collapse into one and
// every wild-type mouse would look like it still needs genotyping.
//
// A catalogue exists independently of who currently carries what — but every
// code here is now carried by at least one seed mouse (ccEGFP by M7AZZ), so no
// catalogue row is reachable only through the pickers.
// sortKey is the DISPLAY ORDER of the gene within a composed genotype, in the
// lab's own writing order — the professor writes 'PlpCre;Nf1 f/+', so PlpCre
// sorts first. Gaps of 10 so a future gene can be inserted between two existing
// ones without renumbering. It is a catalogue fact, which is why it lives here
// and not on a mouse's rows.
const GENES: Gene[] = [
    { geneId: 1, code: 'Nf1', label: 'Neurofibromin 1 (floxed)', sortKey: 20 },
    { geneId: 2, code: 'PlpCre', label: 'Plp1-CreERT2 driver', sortKey: 10 },
    { geneId: 3, code: 'Ai14', label: 'Ai14 tdTomato reporter', sortKey: 30 },
    {
        geneId: 4,
        code: 'ccEGFP',
        label: 'Cre-conditional EGFP reporter',
        sortKey: 40,
    },
    {
        geneId: 5,
        code: 'ccEGFP(hmo)',
        label: 'Cre-conditional EGFP reporter, homozygous',
        sortKey: 45,
    },
    { geneId: 6, code: 'WT', label: 'Wild type (no marker)', sortKey: 50 },
];

// Codes only, in sortKey order — what the badge pickers render. Sorted, NOT in
// the order the array above happens to be written: the pickers must list genes
// the same way the grid composes them (PlpCre first), or the same two genes read
// in one order in the picker and the other in the cell. The array's own order is
// therefore MEANINGLESS — sortKey is the single source of display order, so the
// two cannot drift apart the way a second hand-kept list would.
export const GENE_CATALOG_CODES: readonly string[] = [...GENES]
    .sort((a, b) => a.sortKey - b.sortKey)
    .map((g) => g.code);

// The catalogue's sortKey for a code — what mintGeneRefs copies onto a new row
// (the server will JOIN genes for the same value).
//
// THROWS on an unknown code rather than defaulting: mice_genes.gene_id is an FK
// to genes, so a row for a non-catalogue code is unrepresentable in the real
// schema. A silent fallback would mint a row the DB could never hold and would
// push it to an arbitrary display position with no error behind it.
export function geneSortKey(code: string): number {
    const gene = GENES.find((g) => g.code === code);
    if (gene === undefined) throw new Error(`unknown gene code: ${code}`);
    return gene.sortKey;
}

// Simulates the async shape of the real fetcher.
export async function getGenes(): Promise<Gene[]> {
    return GENES;
}
