import { db } from '../src/lib/db';
import { users, familyMembers } from '../src/db/schema';
import { sql } from 'drizzle-orm';

async function migrateMultiFamily() {
  try {
    console.log('Starting multi-family migration...');

    // Step 1: Create family_members table and add active_family_id column
    console.log('Running schema migration...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "family_members" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" uuid NOT NULL,
        "family_id" uuid NOT NULL,
        "role_in_family" text NOT NULL,
        "is_admin" boolean DEFAULT false NOT NULL,
        "joined_at" timestamp with time zone DEFAULT now() NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
      )
    `);

    await db.execute(sql`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "active_family_id" uuid
    `);

    // Add constraints (wrapped in try-catch in case they already exist)
    try {
      await db.execute(sql`
        ALTER TABLE "family_members"
        ADD CONSTRAINT "family_members_user_id_users_id_fk"
        FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action
      `);
    } catch (e) {
      console.log('Constraint family_members_user_id_users_id_fk already exists');
    }

    try {
      await db.execute(sql`
        ALTER TABLE "family_members"
        ADD CONSTRAINT "family_members_family_id_families_id_fk"
        FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action
      `);
    } catch (e) {
      console.log('Constraint family_members_family_id_families_id_fk already exists');
    }

    try {
      await db.execute(sql`
        ALTER TABLE "users"
        ADD CONSTRAINT "users_active_family_id_families_id_fk"
        FOREIGN KEY ("active_family_id") REFERENCES "public"."families"("id") ON DELETE set null ON UPDATE no action
      `);
    } catch (e) {
      console.log('Constraint users_active_family_id_families_id_fk already exists');
    }

    console.log('✓ Schema migration complete');

    // Step 2: Migrate existing user-family relationships to family_members table
    console.log('Migrating existing family relationships...');

    const allUsers = await db.query.users.findMany();
    let migratedCount = 0;

    for (const user of allUsers) {
      if (user.familyId) {
        // Check if already exists in family_members
        const existing = await db.query.familyMembers.findFirst({
          where: (familyMembers, { and, eq }) =>
            and(
              eq(familyMembers.userId, user.id),
              eq(familyMembers.familyId, user.familyId!)
            ),
        });

        if (!existing) {
          // Insert into family_members
          await db.insert(familyMembers).values({
            userId: user.id,
            familyId: user.familyId,
            roleInFamily: user.relationship || user.role || 'Member',
            isAdmin: user.role === 'parent',
            joinedAt: user.createdAt,
          });

          // Set active family to their current family
          await db.update(users).set({
            activeFamilyId: user.familyId,
          }).where(sql`id = ${user.id}`);

          migratedCount++;
        }
      }
    }

    console.log(`✓ Migrated ${migratedCount} user-family relationships`);
    console.log('✓ Multi-family migration complete!');

    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateMultiFamily();
