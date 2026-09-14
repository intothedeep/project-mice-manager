// Sentinel identity for the system/service account seeded in 0022.
// Resolve the numeric id at startup — never hardcode it.
//
// Usage:
//   const systemUserId = await resolveSystemUserId(query);

import { query as dbQuery } from '@repo/db';

export const SYSTEM_SENTINEL_CLERK_ID = 'system@colony.local';

/**
 * Resolves the system user's numeric id from the sentinel clerk_user_id.
 * Throws if the seed row is missing (migration 0022 not applied).
 */
export async function resolveSystemUserId(): Promise<bigint> {
    const { rows } = await dbQuery<{ id: string }>(
        `SELECT id FROM users WHERE clerk_user_id = $1 AND deleted_at IS NULL`,
        [SYSTEM_SENTINEL_CLERK_ID]
    );
    if (rows.length === 0) {
        throw new Error(
            `System user not found (clerk_user_id=${SYSTEM_SENTINEL_CLERK_ID}). ` +
            `Apply migration 0022_seed_system_user.sql.`
        );
    }
    return BigInt(rows[0].id);
}
