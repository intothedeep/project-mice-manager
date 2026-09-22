import { Client } from 'pg';
import { databaseUrl, maintenanceUrl, safeDbName } from './config';

async function main(): Promise<void> {
    const dbName = safeDbName(databaseUrl);
    const client = new Client({
        connectionString: maintenanceUrl(databaseUrl),
    });
    await client.connect();
    try {
        // WITH (FORCE) terminates open connections (PG14+); avoids hangs.
        await client.query(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`);
        await client.query(`CREATE DATABASE "${dbName}"`);
        console.log(`[reset] dropped and recreated "${dbName}"`);
    } finally {
        await client.end();
    }
}

main().catch((err) => {
    console.error(err.message ?? err);
    process.exit(1);
});
