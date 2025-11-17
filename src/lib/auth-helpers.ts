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

  // Get user from database using Clerk ID
  let user = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkUserId),
    with: {
      family: true,
    },
  });

  // Fallback: If user doesn't have clerkId set yet, try email lookup and update
  if (!user) {
    const clerkUser = await currentUser();
    if (!clerkUser?.primaryEmailAddress?.emailAddress) {
      return null;
    }

    const userEmail = clerkUser.primaryEmailAddress.emailAddress;
    user = await db.query.users.findFirst({
      where: eq(users.email, userEmail),
      with: {
        family: true,
      },
    });

    // Update user with clerkId for future lookups
    if (user) {
      await db.update(users)
        .set({ clerkId: clerkUserId })
        .where(eq(users.id, user.id));
    }
  }

  if (!user) {
    return null;
  }

  return {
    user: {
      id: user.id,
      clerkId: user.clerkId,
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
