import { sql } from 'drizzle-orm';
import { db } from '../lib/db';

async function addChildColumns() {
  console.log('🔄 Adding child gamification columns to users table...');

  try {
    // Add columns one by one
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS allowed_pages text`);
    console.log('✅ Added allowed_pages column');

    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS gamification_enabled boolean DEFAULT false NOT NULL`);
    console.log('✅ Added gamification_enabled column');

    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS family_bucks numeric(10, 2) DEFAULT '0' NOT NULL`);
    console.log('✅ Added family_bucks column');

    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS total_points_earned numeric(10, 2) DEFAULT '0' NOT NULL`);
    console.log('✅ Added total_points_earned column');

    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS points_per_task numeric(10, 2) DEFAULT '10' NOT NULL`);
    console.log('✅ Added points_per_task column');

    console.log('✅ All child columns added successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding columns:', error);
    process.exit(1);
  }
}

addChildColumns();
