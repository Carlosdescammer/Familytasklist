/**
 * Family Members API Routes
 *
 * GET /api/family/members - Get all members in the user's family
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * GET - Fetch family members
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user to find their family
    const currentUser = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
    });

    if (!currentUser || !currentUser.familyId) {
      return NextResponse.json(
        { error: 'User not found or not in a family' },
        { status: 404 }
      );
    }

    // Get all users in the same family
    const familyMembers = await db.query.users.findMany({
      where: eq(users.familyId, currentUser.familyId),
      columns: {
        id: true,
        clerkId: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
        relationship: true,
        gamificationPoints: true,
      },
    });

    return NextResponse.json({ members: familyMembers });
  } catch (error) {
    console.error('[Family Members GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch family members' },
      { status: 500 }
    );
  }
}
