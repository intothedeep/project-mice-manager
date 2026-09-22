import fs from 'fs';
import path from 'path';

const MIGRATIONS_DIR = path.resolve(__dirname, '../migrations');
const FILENAME_RE = /^(\d{4})_.+\.sql$/;

function nextSeq(): string {
    const files = fs
        .readdirSync(MIGRATIONS_DIR)
        .filter((f) => FILENAME_RE.test(f))
        .sort();

    const last = files[files.length - 1];
    if (!last) return '0001';
    const m = last.match(FILENAME_RE);
    const n = m ? parseInt(m[1], 10) + 1 : 1;
    return String(n).padStart(4, '0');
}

const description = process.argv[2];
if (!description) {
    console.error('Usage: db:new <description>');
    console.error('Example: pnpm db:new create_cages_table');
    process.exit(1);
}

const slug = description.toLowerCase().replace(/\s+/g, '_');
const filename = `${nextSeq()}_${slug}.sql`;
const dest = path.join(MIGRATIONS_DIR, filename);

fs.writeFileSync(dest, `-- Migration: ${filename}\n\n`);
console.log(`[new] created: migrations/${filename}`);
