import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function runMigration() {
  try {
    console.log('Adding current_price and deals columns to shopping_items...');
    await sql`ALTER TABLE "shopping_items" ADD COLUMN IF NOT EXISTS "current_price" numeric(10, 2);`;
    await sql`ALTER TABLE "shopping_items" ADD COLUMN IF NOT EXISTS "deals" text;`;
    console.log('✓ Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
