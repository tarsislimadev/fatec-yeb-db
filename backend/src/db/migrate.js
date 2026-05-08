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

    // Ensure migration history table exists to track applied migrations
    await db.query(`
      CREATE TABLE IF NOT EXISTS migration_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        filename VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Execute SQL migrations in the migrations/ folder (alphabetical order)
    const migrationsDir = path.join(__dirname, 'migrations');
    if (fs.existsSync(migrationsDir)) {
      const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
      for (const file of files) {
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf-8');
        try {
          // Skip already-applied migrations
          const check = await db.query('SELECT filename FROM migration_history WHERE filename = $1', [file]);
          if (check && check.rows && check.rows.length > 0) {
            console.log(`Skipping already-applied migration: ${file}`);
            continue;
          }

          console.log(`Applying migration: ${file}`);
          await db.query(sql);

          // Record applied migration
          await db.query('INSERT INTO migration_history (filename) VALUES ($1)', [file]);
        } catch (migErr) {
          console.error(`Migration file ${file} failed:`, migErr.message);
          throw migErr;
        }
      }
    }

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
