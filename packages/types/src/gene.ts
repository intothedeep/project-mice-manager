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
export interface Gene {
    geneId: number;
    code: string;
    label: string | null; // human-readable name; null when only the code is known
    // genes.sort_key (migration 0030) — DISPLAY ORDER OF THE GENE, a property of
    // the catalogue and not of any one mouse's rows. It reproduces the lab's own
    // writing order: the professor writes 'PlpCre;Nf1 f/+', which is why PlpCre
    // sorts before Nf1. Seeded with GAPS (10/20/30/40/50) so a new gene can be
    // slotted between two existing ones without renumbering the catalogue.
    sortKey: number;
}
