import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function applyMigration() {
  console.log('🔄 Creating AI usage logs table...');

  try {
    // Create ai_usage_logs table
    await sql`
      CREATE TABLE IF NOT EXISTS "ai_usage_logs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "family_id" uuid NOT NULL,
        "user_id" uuid,
        "provider" text NOT NULL,
        "feature" text NOT NULL,
        "tokens_used" integer,
        "cost" numeric(10, 6),
        "request_data" text,
        "response_data" text,
        "success" boolean DEFAULT true NOT NULL,
        "error_message" text,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
      )
    `;
    console.log('✅ Created ai_usage_logs table');

    // Add foreign key constraints
    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'ai_usage_logs_family_id_families_id_fk'
        ) THEN
          ALTER TABLE "ai_usage_logs"
          ADD CONSTRAINT "ai_usage_logs_family_id_families_id_fk"
          FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
        END IF;
      END $$;
    `;

    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'ai_usage_logs_user_id_users_id_fk'
        ) THEN
          ALTER TABLE "ai_usage_logs"
          ADD CONSTRAINT "ai_usage_logs_user_id_users_id_fk"
          FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
        END IF;
      END $$;
    `;

    console.log('✅ Added all foreign key constraints');
    console.log('✅ AI usage logs table created successfully!');
  } catch (error) {
    console.error('❌ Error creating table:', error);
    throw error;
  }
}

applyMigration().then(() => {
  console.log('✅ Migration complete!');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});
