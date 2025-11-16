import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import * as schema from '@/db/schema';

// Create a connection pool
const pool = new Pool({ connectionString: process.env.DATABASE_URL! });

// Create the drizzle instance
export const db = drizzle(pool, { schema });

// Export the pool for direct access if needed
export { pool };
