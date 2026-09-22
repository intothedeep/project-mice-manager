// Pure task-generator functions for SOP automation.
//
// DESIGN RULES (enforced here):
//   - NO I/O. Inputs are plain data; output is a list of candidate case specs.
//   - Deterministic: same inputs → same output.
//   - No imports from @repo/db or any infra module.
//
// OFFSET CONSTANTS — placeholder values; replace with task_offset_rules
// config table in P0.7. Passed explicitly so callers can override in tests.
//
// OPEN DECISIONS (needs architect sign-off before P1):
//   - PLUG_CHECK_OFFSET_DAYS: how many days after cohousing before a plug
//     check is expected. Using 5 as a placeholder.
//   - WEAN_AGE_DAYS: minimum mouse age for genotyping eligibility.
//     Using 21 (standard wean age) as a placeholder.
//   - signal 'plan' is used for generated cases; change to 'instruction' if
//     the professor prefers a different urgency signal.

export const PLUG_CHECK_OFFSET_DAYS = 5;
export const WEAN_AGE_DAYS = 21;

// ---------------------------------------------------------------------------
// Shared types for generator inputs and outputs
// ---------------------------------------------------------------------------

export interface CandidateCaseSpec {
    caseType: string;
    genKey: string;
    subjectKind: 'mate' | 'mouse';
    subjectMateId?: bigint;
    subjectMouseId?: bigint;
}

// ---------------------------------------------------------------------------
// plug_check generator
//
// Candidates: mate CYCLES whose head state is 'cohoused', where
// occurred_at + offsetDays <= asOf, and no plug or advance has been recorded
// (i.e. the cycle head is still 'cohoused').
//
// NOTE on plug notes: per plan Q28 and 0018, plug observations are
// notes-only and notes have no mate FK. They are structurally unqueryable
// per-cycle via SQL joins. "No advance recorded" is therefore encoded as
// "head status is still 'cohoused'" — if an advance (plug seen → pregnant)
// had occurred, the cycle head would have moved past 'cohoused'. This is
// the only signal available in the schema without adding a notes-mate link.
//
// gen_key format: plug_check:mate=<origin_mate_id>
// subject_kind: 'mate', subject_mate_id = origin_mate_id (origin row only)
// ---------------------------------------------------------------------------

export interface MateHeadRow {
    originMateId: bigint;
    status: string;
    occurredAt: Date;
}

export function generatePlugCheckCandidates(
    mateHeadRows: MateHeadRow[],
    asOf: Date,
    offsetDays: number = PLUG_CHECK_OFFSET_DAYS
): CandidateCaseSpec[] {
    const candidates: CandidateCaseSpec[] = [];

    for (const mate of mateHeadRows) {
        if (mate.status !== 'cohoused') continue;

        const threshold = new Date(mate.occurredAt);
        threshold.setDate(threshold.getDate() + offsetDays);

        if (threshold <= asOf) {
            candidates.push({
                caseType: 'plug_check',
                genKey: `plug_check:mate=${mate.originMateId}`,
                subjectKind: 'mate',
                subjectMateId: mate.originMateId,
            });
        }
    }

    return candidates;
}

// ---------------------------------------------------------------------------
// genotype generator
//
// Candidates: mice past wean age (dob + weanAgeDays <= asOf) with zero live
// mice_genes rows (gene_id IS NOT NULL ensures only real gene links count —
// rows with gene_id NULL are 0015 data-migration artifacts where gene_id was
// not yet populated; a mouse with only NULL-gene_id rows is treated the same
// as having none).
//
// GENOTYPE-PENDING SIGNAL RESOLUTION:
//   mice_genes (0015) has columns: id, mouse_id, order_index, gene_id.
//   marker_text was DROPPED in 0015; zygosity is embedded in genes.code.
//   There is NO explicit "zygosity unknown" or "pending" flag column.
//   The schema encodes "genotyped" as: at least one live mice_genes row with
//   gene_id IS NOT NULL for this mouse. "Needs genotyping" = zero such rows.
//   This is not invented — it is the only binary signal the schema provides.
//
// subject is mouse_meta.id (NOT mice.id, which is a version-row id).
// A mouse with dob IS NULL is excluded (age cannot be computed).
// A mouse that is not alive (is_alive = false on the current mice head) is
// excluded (no point genotyping a dead mouse).
//
// gen_key format: genotype:mouse=<mouse_meta_id>
// subject_kind: 'mouse', subject_mouse_id = mouse_meta.id
// ---------------------------------------------------------------------------

export interface MouseGenotypeRow {
    mouseMetaId: bigint;
    dob: Date | null;
    isAlive: boolean;
    geneCount: number; // count of live mice_genes rows with gene_id IS NOT NULL
}

export function generateGenotypeCandidates(
    mouseRows: MouseGenotypeRow[],
    asOf: Date,
    weanAgeDays: number = WEAN_AGE_DAYS
): CandidateCaseSpec[] {
    const candidates: CandidateCaseSpec[] = [];

    for (const mouse of mouseRows) {
        if (mouse.dob === null) continue;
        if (!mouse.isAlive) continue;
        if (mouse.geneCount > 0) continue;

        const weanDate = new Date(mouse.dob);
        weanDate.setDate(weanDate.getDate() + weanAgeDays);

        if (weanDate <= asOf) {
            candidates.push({
                caseType: 'genotype',
                genKey: `genotype:mouse=${mouse.mouseMetaId}`,
                subjectKind: 'mouse',
                subjectMouseId: mouse.mouseMetaId,
            });
        }
    }

    return candidates;
}
