import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function applyMigration() {
  console.log('🔄 Creating budget and expense tables...');

  try {
    // Create budgets table
    await sql`
      CREATE TABLE IF NOT EXISTS "budgets" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "family_id" uuid NOT NULL,
        "month" text NOT NULL,
        "total_budget" numeric(10, 2) NOT NULL,
        "savings_goal" numeric(10, 2) DEFAULT 0 NOT NULL,
        "notes" text,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
      )
    `;
    console.log('✅ Created budgets table');

    // Create expenses table
    await sql`
      CREATE TABLE IF NOT EXISTS "expenses" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "family_id" uuid NOT NULL,
        "user_id" uuid,
        "category" text NOT NULL,
        "amount" numeric(10, 2) NOT NULL,
        "description" text NOT NULL,
        "expense_date" timestamp with time zone NOT NULL,
        "receipt_url" text,
        "notes" text,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
      )
    `;
    console.log('✅ Created expenses table');

    // Add foreign key constraints
    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'budgets_family_id_families_id_fk'
        ) THEN
          ALTER TABLE "budgets"
          ADD CONSTRAINT "budgets_family_id_families_id_fk"
          FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
        END IF;
      END $$;
    `;

    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'expenses_family_id_families_id_fk'
        ) THEN
          ALTER TABLE "expenses"
          ADD CONSTRAINT "expenses_family_id_families_id_fk"
          FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
        END IF;
      END $$;
    `;

    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'expenses_user_id_users_id_fk'
        ) THEN
          ALTER TABLE "expenses"
          ADD CONSTRAINT "expenses_user_id_users_id_fk"
          FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
        END IF;
      END $$;
    `;

    console.log('✅ Added all foreign key constraints');
    console.log('✅ Budget and expense tables created successfully!');
  } catch (error) {
    console.error('❌ Error creating tables:', error);
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
