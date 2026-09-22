// Detail DTO for the Mouse drawer — the "extra" a list row does not carry.
//
// The grid row (MouseCell) already has id/sex/genotype/signal/isAlive; the
// detail endpoint returns the rest: per-marker genotype, parents/mate, and the
// append-only history (one entry per version row of this mouse_meta, newest
// first). The real endpoint keys off mouse_meta_id and resolves all versions.

export interface GeneCall {
    code: string; // marker code, e.g. "Nf1", "PlpCre"
    allele: string; // e.g. "f/+", "+/+", "hmo"
}

export interface HistoryEvent {
    at: string; // ISO date of the version row
    actor: string; // who made the change
    summary: string; // human line, e.g. "moved cage 2413 → 2414"
}

export interface MouseDetail {
    metaId: number;
    dob: string | null;
    litterCode: string;
    genes: GeneCall[];
    history: HistoryEvent[]; // newest first
}
