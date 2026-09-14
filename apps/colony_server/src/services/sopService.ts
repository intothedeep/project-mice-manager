// SOP case-automation service.
//
// Transaction boundary lives HERE — repositories never open or commit a tx.
// One transaction covers ALL generators to ensure atomicity of the full batch.
//
// SIGNAL: generated cases use 'plan'. OPEN DECISION — see sopRepository comment.
// OFFSET CONSTANTS: PLUG_CHECK_OFFSET_DAYS and WEAN_AGE_DAYS are imported from
// the domain module. Replace with task_offset_rules config table in P0.7.

import { withTransaction } from '@repo/db';
import {
    generatePlugCheckCandidates,
    generateGenotypeCandidates,
    PLUG_CHECK_OFFSET_DAYS,
    WEAN_AGE_DAYS,
} from '../domain/sopGenerators';
import {
    fetchCohousedMateHeads,
    fetchMiceGenotypeStatus,
    resolveSignalId,
    insertCandidateBatch,
} from '../repositories/sopRepository';
import { resolveSystemUserId } from '../util/systemUser';

const GENERATED_CASE_SIGNAL_TYPE = 'plan';

export interface SopRunSummary {
    plug_check: { generated: number; skipped: number };
    genotype:   { generated: number; skipped: number };
}

/**
 * Runs all SOP generators and inserts candidate cases idempotently.
 * One transaction covers the full batch.
 *
 * asOf defaults to now(); pass an explicit date for deterministic testing.
 */
// Default lead time for generated cases: 1 week from the run date (user
// directive). UTC math avoids local-midnight day-shift. Resolves the earlier
// "due_date NULL on generated cases" open decision.
function defaultDueDate(asOf: Date): string {
    const d = new Date(asOf);
    d.setUTCDate(d.getUTCDate() + 7);
    return d.toISOString().slice(0, 10);
}

export async function runSopChecks(asOf: Date = new Date()): Promise<SopRunSummary> {
    const systemUserId = await resolveSystemUserId();
    const dueDate = defaultDueDate(asOf);

    return withTransaction(async (client) => {
        // ----------------------------------------------------------------
        // 1. Resolve signal id (read inside tx — consistent snapshot)
        // ----------------------------------------------------------------
        const signalId = await resolveSignalId(client, GENERATED_CASE_SIGNAL_TYPE);

        // ----------------------------------------------------------------
        // 2. Fetch data slices
        // ----------------------------------------------------------------
        const mateHeads  = await fetchCohousedMateHeads(client);
        const mouseRows  = await fetchMiceGenotypeStatus(client);

        // ----------------------------------------------------------------
        // 3. Generate candidates (pure — no I/O)
        // ----------------------------------------------------------------
        const plugCandidates = generatePlugCheckCandidates(
            mateHeads,
            asOf,
            PLUG_CHECK_OFFSET_DAYS
        );
        const genoCandidates = generateGenotypeCandidates(
            mouseRows,
            asOf,
            WEAN_AGE_DAYS
        );

        // ----------------------------------------------------------------
        // 4. Insert idempotently, initial task record per new case
        // ----------------------------------------------------------------
        const plugResult = await insertCandidateBatch(
            client,
            plugCandidates,
            signalId,
            dueDate,
            systemUserId
        );
        const genoResult = await insertCandidateBatch(
            client,
            genoCandidates,
            signalId,
            dueDate,
            systemUserId
        );

        return {
            plug_check: plugResult,
            genotype:   genoResult,
        };
    });
}
