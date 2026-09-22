import path from 'path';
import dotenv from 'dotenv';

// Load root .env once. dotenv.config() is a no-op for keys already in
// process.env, so precedence is: process.env > root .env > hardcoded default.
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const DEFAULT_URL = 'postgres://localhost:5432/colony_dev';
export const databaseUrl = process.env.DATABASE_URL ?? DEFAULT_URL;

/** Swap the db pathname to `postgres` for maintenance-level operations. */
export function maintenanceUrl(url: string): string {
    const parsed = new URL(url);
    parsed.pathname = '/postgres';
    return parsed.toString();
}

/** Validate db name before embedding in an identifier. */
export function safeDbName(url: string): string {
    const name = new URL(url).pathname.slice(1);
    if (!/^[A-Za-z0-9_]+$/.test(name)) {
        throw new Error(`Unsafe database name: "${name}"`);
    }
    return name;
}
