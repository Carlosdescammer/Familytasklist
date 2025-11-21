const { neon } = require('@neondatabase/serverless');

async function migrate() {
  const sql = neon(process.env.DATABASE_URL);

  try {
    // Drop old columns if they exist
    await sql`ALTER TABLE users DROP COLUMN IF EXISTS sound_enabled`;
    await sql`ALTER TABLE users DROP COLUMN IF EXISTS push_subscription`;

    // Add new columns if they don't exist
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_notifications boolean DEFAULT true NOT NULL`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_preferences text`;

    console.log('✓ Migration applied successfully');
    process.exit(0);
  } catch (err) {
    console.error('✗ Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
