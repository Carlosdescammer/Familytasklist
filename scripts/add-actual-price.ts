import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function runMigration() {
  try {
    console.log('Adding actual_price column to shopping_items...');
    await sql`ALTER TABLE "shopping_items" ADD COLUMN IF NOT EXISTS "actual_price" numeric(10, 2);`;
    console.log('✓ Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
