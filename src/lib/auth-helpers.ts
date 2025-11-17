import { auth as clerkAuth, currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Get the current authenticated user with family info from Clerk
 * This replaces NextAuth's auth() function
 */
export async function getCurrentUser() {
  const { userId: clerkUserId } = await clerkAuth();
  
  if (!clerkUserId) {
    return null;
  }

  // Get Clerk user to access email
  const clerkUser = await currentUser();
  if (!clerkUser?.primaryEmailAddress?.emailAddress) {
    return null;
  }

  const userEmail = clerkUser.primaryEmailAddress.emailAddress;

  // Get user from database using email
  // TODO: Add clerkId column to users table for better performance
  const user = await db.query.users.findFirst({
    where: eq(users.email, userEmail),
    with: {
      family: true,
    },
  });

  if (!user) {
    return null;
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      familyId: user.familyId,
      allowedPages: user.allowedPages,
    },
  };
}

/**
 * Auth function that mimics NextAuth's interface
 * Returns session-like object or null
 */
export async function auth() {
  return await getCurrentUser();
}
