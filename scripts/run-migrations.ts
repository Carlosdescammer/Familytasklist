import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import { neon } from '@neondatabase/serverless';

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  console.log('Connecting to database...');
  const sql = neon(databaseUrl);
  const db = drizzle(sql);

  console.log('Running migrations...');
  await migrate(db, { migrationsFolder: './drizzle/migrations' });

  console.log('✓ Migrations completed successfully!');
  process.exit(0);
}

runMigrations().catch((error) => {
  console.error('Error running migrations:', error);
  process.exit(1);
});
