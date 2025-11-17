import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function runMigration() {
  try {
    console.log('Creating recipes table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "recipes" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "family_id" uuid NOT NULL REFERENCES "families"("id") ON DELETE CASCADE,
        "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "title" text NOT NULL,
        "description" text,
        "ingredients" text NOT NULL,
        "instructions" text NOT NULL,
        "cooking_time" text,
        "prep_time" text,
        "servings" text,
        "difficulty" text,
        "category" text,
        "cuisine" text,
        "image_url" text,
        "source" text DEFAULT 'user' NOT NULL,
        "is_public" boolean DEFAULT false NOT NULL,
        "is_favorite" boolean DEFAULT false NOT NULL,
        "tags" text,
        "favorite_by_users" text,
        "shared_with_families" text,
        "notes" text,
        "nutrition_info" text,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
      );
    `;

    console.log('Creating indexes for recipes table...');
    await sql`CREATE INDEX IF NOT EXISTS "recipes_family_id_idx" ON "recipes"("family_id");`;
    await sql`CREATE INDEX IF NOT EXISTS "recipes_created_by_idx" ON "recipes"("created_by");`;
    await sql`CREATE INDEX IF NOT EXISTS "recipes_source_idx" ON "recipes"("source");`;
    await sql`CREATE INDEX IF NOT EXISTS "recipes_is_public_idx" ON "recipes"("is_public");`;

    console.log('✓ Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
