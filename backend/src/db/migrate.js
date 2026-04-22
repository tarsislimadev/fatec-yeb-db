import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function migrate() {
  try {
    console.log('Starting database migration...');

    // Read schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    // Execute schema
    await db.query(schema);

    console.log('✅ Database migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

if (process.argv[1] && process.argv[1].endsWith('migrate.js')) {
  migrate()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
