// Pure genotype composition — the SOLE builder of a rendered genotype string.
// No I/O, no store access, total (every input has a result).
//
// The owner's rule: "we do not have genotype — we add gene rows for a mouse and
// combine them to get genotype." So the string is composed at READ time from
// MouseCell.genes (active mice_genes rows) and is NEVER STORED and NEVER PARSED
// BACK APART — same contract as the mouse label in lib/mouseIdentity.ts, and the
// same defect (a stored, drifting composed string) that 9a/9b removed there.
// Changing a mouse's genotype means changing its GENE ROWS, never editing text.
//
// Grammar, per row, joined with ';' in the CATALOGUE's sort_key order. The
// first rule is KIND-INDEPENDENT; the rest branch on GeneRef.kind:
//   both alleles NULL     -> the BARE code                  ("WT", "Nf1")
//   locus                 -> `code mat/pat`, NULL side '?'  ("Nf1 f/+", "Nf1 f/?")
//   transgene, both sides recorded:
//     two 'Tg'            -> `code(hmo)`                    ("ccEGFP(hmo)")
//     one 'Tg'            -> the BARE code                  ("ccEGFP")
//     neither             -> `code mat/pat`, as a locus     ("ccEGFP +/+")
//   transgene, one side recorded -> `code mat/?`            ("ccEGFP Tg/?")
//
// NULL/NULL ("zygosity not recorded") and '+'/'+' ("recorded wild-type pair")
// are DIFFERENT FACTS and must not collapse into one another — that collapse is
// the bug the owner's 2026-09-23 nullable ruling fixes. The fixture proves it
// live: 'WT' carries NULL/NULL and renders bare, while 'Nf1 +/+' carries an
// explicit '+'/'+' and renders its alleles. No suppression flag is involved.

import type { GeneRef, MouseCell } from '@repo/types';
import { catalogueGene } from '@/apis/getGenes.mock.api';

// Zero gene rows = NOT GENOTYPED, which is a different fact from "known wild
// type" (that is a real WT row). This is the value a "check the genes" case is
// generated from, so it must stay distinguishable.
export const UNKNOWN_GENOTYPE = '?';

// THE LEFT ALLELE IS MATERNAL (owner decision 2026-09-17): the pair is ordered
// by PARENT OF ORIGIN, mother then father, so "Nf1 f/+" means the floxed copy
// came from the mother and "Nf1 +/f" is a DIFFERENT MOUSE. The pair is never
// sorted or normalised — that would silently rewrite one as the other and
// destroy parent of origin. The rule lives here, at the one site that decides
// the order, because it has been inverted once already.
//
// A TRANSGENE IS COUNTED, NOT PAIRED (migration 0032). It is inserted at a
// random site, so there is no pre-existing allele to pair with: the only facts
// are ONE copy ('Tg' on one side, '+' — ABSENT, not unknown — on the other) and
// TWO copies ('Tg'/'Tg', which is what "(hmo)", homozygous, means). The two
// copies are still stored maternal-first, so a hemizygote keeps the parent the
// insert came from — information the '(hmo)' suffix itself cannot carry.
//
// The count is only taken when BOTH sides are recorded. Any other transgene
// pair falls through to the locus form on purpose, because each of them is a
// different fact from "one copy": 'Tg'/null renders "ccEGFP Tg/?" (one copy
// seen, the other side never assessed — it could still be homozygous, exactly
// as "Nf1 f/?" is not "Nf1 f/+"), and '+'/'+' renders "ccEGFP +/+" (a mouse
// carrying no copy at all, which should have no row in the first place).
// Neither may collapse into the bare code, which claims hemizygous.
const TRANSGENE_PRESENT = 'Tg';

function renderGene(gene: GeneRef): string {
    if (gene.alleleMat === null && gene.allelePat === null) return gene.code;
    if (
        gene.kind === 'transgene' &&
        gene.alleleMat !== null &&
        gene.allelePat !== null
    ) {
        const copies = [gene.alleleMat, gene.allelePat].filter(
            (a) => a === TRANSGENE_PRESENT
        ).length;
        if (copies === 2) return `${gene.code}(hmo)`;
        if (copies === 1) return gene.code;
    }
    return `${gene.code} ${gene.alleleMat ?? '?'}/${gene.allelePat ?? '?'}`;
}

// Sorted, not trusted in array order: the GENE's sortKey is the authority, and a
// server query without ORDER BY would otherwise silently render "Nf1
// f/+;PlpCre" for a mouse whose catalogue says the opposite. Display order is a
// property of the gene, so it cannot drift per mouse (migration 0031).
function inOrder(genes: GeneRef[]): GeneRef[] {
    return [...genes].sort((a, b) => a.sortKey - b.sortKey);
}

export function genotypeOf(mouse: Pick<MouseCell, 'genes'>): string {
    if (mouse.genes.length === 0) return UNKNOWN_GENOTYPE;
    return inOrder(mouse.genes).map(renderGene).join(';');
}

// The mouse's picked catalogue codes, in row order — what the genotype badge
// pickers show as already-selected. Codes only: the pickers choose genes, not
// zygosity, so the alleles stay behind on the rows.
export function geneCodesOf(mouse: Pick<MouseCell, 'genes'>): string[] {
    return inOrder(mouse.genes).map((g) => g.code);
}

// Builds the gene rows for a set of picked catalogue codes — the ONE
// constructor of a GeneRef outside the fixture (mirrors mintPunch being the
// sole punch mint site). sortKey is COPIED FROM THE CATALOGUE, not from pick
// order: where the gene lands in the rendered string is the gene's property,
// so picking the same set in a different order composes the same string.
//
// `kind` is copied from the same catalogue row, for the same reason: which
// notation a marker is written in is the GENE's property, never the pick's.
//
// `current` is the mouse's existing rows (empty on creation): a code that is
// still picked KEEPS its alleles, because the pickers choose GENES and never
// zygosity — re-saving an unchanged pick must not silently reset an 'f/+' mouse.
// A genuinely NEW row is minted with BOTH ALLELES NULL (not recorded), so a
// freshly added 'Nf1' reads "Nf1" and never claims a wild-type pair nobody
// assessed. A freshly picked TRANSGENE therefore also reads bare — "not
// recorded", not "one copy"; the pickers cannot yet express 'Tg'/'Tg'.
export function mintGeneRefs(
    codes: readonly string[],
    current: readonly GeneRef[] = []
): GeneRef[] {
    return codes.map((code) => {
        const kept = current.find((g) => g.code === code);
        const gene = catalogueGene(code);
        return {
            code,
            kind: gene.kind,
            alleleMat: kept?.alleleMat ?? null,
            allelePat: kept?.allelePat ?? null,
            sortKey: gene.sortKey,
        };
    });
}

// Elementwise GeneRef equality (never a composed-string comparison) — lets a
// caller skip a write whose picked set changes nothing.
//
// ORDER-INSENSITIVE, via the same inOrder() the composer uses: array position
// is not a fact about the mouse, so a server returning the same rows in another
// order must not read as a change and trigger a spurious write. sortKey and
// kind are catalogue facts, not part of the picked set, so neither is compared
// — and a tie on sortKey would need a mouse carrying one gene twice, which the
// 0031 unique index forbids.
export function geneRefsEqual(a: GeneRef[], b: GeneRef[]): boolean {
    if (a.length !== b.length) return false;
    const sortedB = inOrder(b);
    return inOrder(a).every((g, i) => {
        const h = sortedB[i];
        return (
            h !== undefined &&
            g.code === h.code &&
            g.alleleMat === h.alleleMat &&
            g.allelePat === h.allelePat
        );
    });
}
