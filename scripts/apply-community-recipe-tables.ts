import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function applyMigration() {
  console.log('🔄 Creating community recipe tables...');

  try {
    // Create recipe_categories table
    await sql`
      CREATE TABLE IF NOT EXISTS "recipe_categories" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "name" text NOT NULL,
        "description" text,
        "icon" text,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        CONSTRAINT "recipe_categories_name_unique" UNIQUE("name")
      )
    `;
    console.log('✅ Created recipe_categories table');

    // Create recipe_category_associations table
    await sql`
      CREATE TABLE IF NOT EXISTS "recipe_category_associations" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "recipe_id" uuid NOT NULL,
        "category_id" uuid NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
      )
    `;
    console.log('✅ Created recipe_category_associations table');

    // Create recipe_comments table
    await sql`
      CREATE TABLE IF NOT EXISTS "recipe_comments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "recipe_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "family_id" uuid NOT NULL,
        "comment" text NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
      )
    `;
    console.log('✅ Created recipe_comments table');

    // Create recipe_ratings table
    await sql`
      CREATE TABLE IF NOT EXISTS "recipe_ratings" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "recipe_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "family_id" uuid NOT NULL,
        "rating" integer NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
      )
    `;
    console.log('✅ Created recipe_ratings table');

    // Add foreign key constraints
    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'recipe_category_associations_recipe_id_recipes_id_fk'
        ) THEN
          ALTER TABLE "recipe_category_associations"
          ADD CONSTRAINT "recipe_category_associations_recipe_id_recipes_id_fk"
          FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;
        END IF;
      END $$;
    `;

    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'recipe_category_associations_category_id_recipe_categories_id_fk'
        ) THEN
          ALTER TABLE "recipe_category_associations"
          ADD CONSTRAINT "recipe_category_associations_category_id_recipe_categories_id_fk"
          FOREIGN KEY ("category_id") REFERENCES "public"."recipe_categories"("id") ON DELETE cascade ON UPDATE no action;
        END IF;
      END $$;
    `;

    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'recipe_comments_recipe_id_recipes_id_fk'
        ) THEN
          ALTER TABLE "recipe_comments"
          ADD CONSTRAINT "recipe_comments_recipe_id_recipes_id_fk"
          FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;
        END IF;
      END $$;
    `;

    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'recipe_comments_user_id_users_id_fk'
        ) THEN
          ALTER TABLE "recipe_comments"
          ADD CONSTRAINT "recipe_comments_user_id_users_id_fk"
          FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
        END IF;
      END $$;
    `;

    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'recipe_comments_family_id_families_id_fk'
        ) THEN
          ALTER TABLE "recipe_comments"
          ADD CONSTRAINT "recipe_comments_family_id_families_id_fk"
          FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
        END IF;
      END $$;
    `;

    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'recipe_ratings_recipe_id_recipes_id_fk'
        ) THEN
          ALTER TABLE "recipe_ratings"
          ADD CONSTRAINT "recipe_ratings_recipe_id_recipes_id_fk"
          FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;
        END IF;
      END $$;
    `;

    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'recipe_ratings_user_id_users_id_fk'
        ) THEN
          ALTER TABLE "recipe_ratings"
          ADD CONSTRAINT "recipe_ratings_user_id_users_id_fk"
          FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
        END IF;
      END $$;
    `;

    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'recipe_ratings_family_id_families_id_fk'
        ) THEN
          ALTER TABLE "recipe_ratings"
          ADD CONSTRAINT "recipe_ratings_family_id_families_id_fk"
          FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
        END IF;
      END $$;
    `;

    console.log('✅ Added all foreign key constraints');
    console.log('✅ Community recipe tables created successfully!');
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
