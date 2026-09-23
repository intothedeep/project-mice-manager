// The gene / marker CATALOGUE (`genes`, migration 0014) — the list a picker
// offers, not anything a single mouse carries. What a mouse carries is
// GeneRef[] on MouseCell (./grid), one entry per live `mice_genes` row.
//
// `code` is BARE ('Nf1', 'PlpCre', 'Ai14', 'ccEGFP', 'WT'): one row per GENE,
// never per gene×zygosity combination. Zygosity is a fact about a mouse's copy
// and lives on mice_genes (migration 0029, which supersedes 0014's header claim
// that code holds the whole marker).
//
// 'WT' is an ORDINARY catalogue row, not the empty state: a mouse KNOWN to be
// wild type has one WT row. Zero rows means NOT GENOTYPED ('?') — the two are
// different facts, and only the second warrants a genotyping case.

// What sort of marker a gene is, and therefore how its allele pair is written
// (migration 0032):
//   'locus'     — edits a site the genome already has, so each parent
//                 contributes a copy and BOTH have a state: 'Nf1 f/+'.
//   'transgene' — inserted at a random site, so there is no pre-existing
//                 allele to pair with: the only facts are one copy ('ccEGFP')
//                 or two ('ccEGFP(hmo)', hmo = HOMOZYGOUS). Stored in the SAME
//                 two allele columns, 'Tg' present and '+' absent.
// A UNION OF TWO STRINGS, mirroring 0032's TEXT + CHECK rather than an enum:
// the professor has not confirmed this vocabulary, so it must stay cheap to
// widen on both sides.
export type GeneKind = 'locus' | 'transgene';

export interface Gene {
    geneId: number;
    code: string;
    label: string | null; // human-readable name; null when only the code is known
    // genes.sort_key (migration 0031) — DISPLAY ORDER OF THE GENE, a property of
    // the catalogue and not of any one mouse's rows. It reproduces the lab's own
    // writing order: the professor writes 'PlpCre;Nf1 f/+', which is why PlpCre
    // sorts before Nf1. Seeded with GAPS (10/20/30/40/50) so a new gene can be
    // slotted between two existing ones without renumbering the catalogue.
    sortKey: number;
    // genes.kind (migration 0032) — a CATALOGUE fact, like sortKey above, and
    // the branch the renderer takes.
    //
    // 'WT' IS FILED AS 'locus', AND IT IS A PLACEHOLDER: wild type is neither
    // an edit at a site nor an insertion. 'locus' is the less wrong of the two
    // — a transgene is DEFINED by being an insertion, which WT is not — and
    // costs nothing today, because a row with no recorded alleles renders its
    // bare code whatever its kind. Pending the professor; if a third value is
    // needed, widening the CHECK is the 0028 two-liner.
    kind: GeneKind;
}
