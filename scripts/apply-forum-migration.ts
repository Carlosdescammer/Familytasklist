import { neon } from '@neondatabase/serverless';
import * as fs from 'fs';
import * as path from 'path';

async function applyMigration() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  console.log('Connecting to database...');
  const sql = neon(databaseUrl);

  // Read the latest migration file
  const migrationPath = path.join(
    process.cwd(),
    'drizzle/migrations/0022_careless_namor.sql'
  );

  console.log('Reading migration file:', migrationPath);
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

  // Split by statement-breakpoint and filter out comments
  const statements = migrationSQL
    .split('--> statement-breakpoint')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));

  console.log(`Found ${statements.length} SQL statements to execute`);

  // Execute each statement
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    console.log(`\nExecuting statement ${i + 1}/${statements.length}...`);

    try {
      await sql.query(statement);
      console.log(`✓ Statement ${i + 1} executed successfully`);
    } catch (error: any) {
      // Check if it's a "already exists" error, which we can safely ignore
      if (
        error.message.includes('already exists') ||
        error.code === '42P07' || // duplicate table
        error.code === '42701' // duplicate column
      ) {
        console.log(
          `⊘ Statement ${i + 1} skipped (object already exists): ${error.message}`
        );
      } else {
        console.error(`✗ Error executing statement ${i + 1}:`, error.message);
        throw error;
      }
    }
  }

  console.log('\n✓ Migration completed successfully!');
  process.exit(0);
}

applyMigration().catch((error) => {
  console.error('\nError applying migration:', error);
  process.exit(1);
});
