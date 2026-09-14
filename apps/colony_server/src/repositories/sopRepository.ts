// SOP case-automation repository.
//
// All functions accept an Executor so they compose inside a transaction
// (service layer) or run standalone. No transaction boundary here.
//
// Follows the project convention: raw SQL, thin abstraction.

import type { Executor } from '@repo/db';
import type { MateHeadRow, MouseGenotypeRow, CandidateCaseSpec } from '../domain/sopGenerators';

// ---------------------------------------------------------------------------
// Reads — supply data slices to the pure generators
// ---------------------------------------------------------------------------

/**
 * Fetches the head-of-history row for every live mate cycle.
 * "Head" = DISTINCT ON (origin_mate_id) ordered by (occurred_at DESC, id DESC).
 * Returns only cycles whose current head status is 'cohoused'.
 * Filters out deleted rows.
 */
export async function fetchCohousedMateHeads(
    executor: Executor
): Promise<MateHeadRow[]> {
    const { rows } = await executor.query<{
        origin_mate_id: string;
        status: string;
        occurred_at: Date;
    }>(
        `SELECT DISTINCT ON (origin_mate_id)
             origin_mate_id,
             status,
             occurred_at
         FROM mates
         WHERE deleted_at IS NULL
         ORDER BY origin_mate_id, occurred_at DESC, id DESC`
    );

    // Filter to cohoused after the query so the query stays index-friendly
    // (mates_origin_idx covers origin_mate_id, occurred_at DESC, id DESC).
    return rows
        .filter(r => r.status === 'cohoused')
        .map(r => ({
            originMateId: BigInt(r.origin_mate_id),
            status: r.status,
            occurredAt: r.occurred_at,
        }));
}

/**
 * Fetches all live mice with their dob, current is_alive state, and the
 * count of mice_genes rows that have a gene_id assigned (not a migration
 * artifact). One row per mouse_meta (uses the same DISTINCT ON head idiom).
 */
export async function fetchMiceGenotypeStatus(
    executor: Executor
): Promise<MouseGenotypeRow[]> {
    // The subquery for the mice head row uses DISTINCT ON (mouse_meta_id)
    // ordered by id DESC, which is served by mice_meta_idx.
    // mice_genes.gene_id IS NOT NULL filters out 0015 migration artifacts.
    const { rows } = await executor.query<{
        mouse_meta_id: string;
        dob: Date | null;
        is_alive: boolean;
        gene_count: string;
    }>(
        `SELECT
             mm.id                   AS mouse_meta_id,
             mm.dob,
             mh.is_alive,
             COUNT(mg.id)::text      AS gene_count
         FROM mouse_meta mm
         JOIN LATERAL (
             SELECT is_alive
             FROM mice
             WHERE mouse_meta_id = mm.id
               AND deleted_at IS NULL
             ORDER BY id DESC
             LIMIT 1
         ) mh ON true
         LEFT JOIN mice_genes mg
             ON mg.mouse_id = mm.id
            AND mg.gene_id IS NOT NULL
            AND mg.deleted_at IS NULL
         WHERE mm.deleted_at IS NULL
         GROUP BY mm.id, mm.dob, mh.is_alive`
    );

    return rows.map(r => ({
        mouseMetaId: BigInt(r.mouse_meta_id),
        dob: r.dob,
        isAlive: r.is_alive,
        geneCount: parseInt(r.gene_count, 10),
    }));
}

// ---------------------------------------------------------------------------
// Resolve signal id by type name
// ---------------------------------------------------------------------------

/**
 * Resolves signal id by type string. Throws if not found.
 * OPEN DECISION: generated cases use 'plan' signal. Change to 'instruction'
 * if the professor wants a higher-urgency signal for auto-generated cases.
 */
export async function resolveSignalId(
    executor: Executor,
    signalType: string
): Promise<bigint> {
    const { rows } = await executor.query<{ id: string }>(
        `SELECT id FROM signals WHERE type = $1 AND deleted_at IS NULL LIMIT 1`,
        [signalType]
    );
    if (rows.length === 0) {
        throw new Error(`Signal type '${signalType}' not found in signals table.`);
    }
    return BigInt(rows[0].id);
}

// ---------------------------------------------------------------------------
// Write — idempotent case insert + initial task
// ---------------------------------------------------------------------------

export interface InsertCaseParams {
    caseType: string;
    genKey: string;
    signalId: bigint;
    subjectKind: string;
    subjectMateId?: bigint;
    subjectMouseId?: bigint;
    dueDate: string; // ISO date 'YYYY-MM-DD' — default lead time set by the service
    systemUserId: bigint;
}

export interface InsertCaseResult {
    /** id of the newly inserted case, or null if ON CONFLICT skipped it */
    newCaseId: bigint | null;
}

/**
 * Inserts one case row idempotently using the partial unique index on gen_key.
 *
 * The ON CONFLICT predicate must mirror cases_gen_key_key exactly:
 *   WHERE gen_key IS NOT NULL AND deleted_at IS NULL
 * A bare ON CONFLICT (gen_key) fails to resolve the partial index.
 *
 * Returns the new case id, or null when the conflict guard skipped insertion.
 */
export async function insertCaseIdempotent(
    executor: Executor,
    params: InsertCaseParams
): Promise<InsertCaseResult> {
    const { rows } = await executor.query<{ id: string }>(
        `INSERT INTO cases (
             case_type,
             gen_key,
             signal_id,
             subject_kind,
             subject_mate_id,
             subject_mouse_id,
             due_date,
             current_status,
             created_by,
             actor_role
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'todo', $8, 'admin')
         ON CONFLICT (gen_key) WHERE gen_key IS NOT NULL AND deleted_at IS NULL
         DO NOTHING
         RETURNING id`,
        [
            params.caseType,
            params.genKey,
            params.signalId.toString(),
            params.subjectKind,
            params.subjectMateId != null ? params.subjectMateId.toString() : null,
            params.subjectMouseId != null ? params.subjectMouseId.toString() : null,
            params.dueDate,
            params.systemUserId.toString(),
        ]
    );

    return { newCaseId: rows.length > 0 ? BigInt(rows[0].id) : null };
}

/**
 * Inserts the initial tasks row for a newly created case.
 * Called only when insertCaseIdempotent returned a non-null id.
 * Status is always 'todo' for the initial task record.
 */
export async function insertInitialTask(
    executor: Executor,
    caseId: bigint,
    actorId: bigint
): Promise<void> {
    await executor.query(
        `INSERT INTO tasks (case_id, status, actor_id, actor_role, note)
         VALUES ($1, 'todo', $2, 'admin', NULL)`,
        [caseId.toString(), actorId.toString()]
    );
}

// ---------------------------------------------------------------------------
// Batch helper — runs all candidates for one generator in the caller's tx
// ---------------------------------------------------------------------------

export interface BatchInsertResult {
    generated: number;
    skipped: number;
}

export async function insertCandidateBatch(
    executor: Executor,
    candidates: CandidateCaseSpec[],
    signalId: bigint,
    dueDate: string,
    systemUserId: bigint
): Promise<BatchInsertResult> {
    let generated = 0;

    for (const c of candidates) {
        const { newCaseId } = await insertCaseIdempotent(executor, {
            caseType: c.caseType,
            genKey: c.genKey,
            signalId,
            subjectKind: c.subjectKind,
            subjectMateId: c.subjectMateId,
            subjectMouseId: c.subjectMouseId,
            dueDate,
            systemUserId,
        });

        if (newCaseId !== null) {
            await insertInitialTask(executor, newCaseId, systemUserId);
            generated++;
        }
    }

    return { generated, skipped: candidates.length - generated };
}
