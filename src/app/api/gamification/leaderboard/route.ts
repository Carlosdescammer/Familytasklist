/**
 * Gamification Leaderboard API Routes
 *
 * GET /api/gamification/leaderboard - Get family leaderboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { users, userStreaks } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's family
    const user = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, userId))
      .limit(1);

    if (!user[0]?.familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const sortBy = searchParams.get('sortBy') || 'points'; // points, streak

    // Get all family members with their stats
    const familyMembers = await db
      .select({
        user: users,
        streak: userStreaks,
      })
      .from(users)
      .leftJoin(userStreaks, eq(users.id, userStreaks.userId))
      .where(eq(users.familyId, user[0].familyId));

    // Sort based on criteria
    let sortedMembers = familyMembers;
    if (sortBy === 'points') {
      sortedMembers = familyMembers.sort(
        (a, b) =>
          (b.user.gamificationPoints || 0) - (a.user.gamificationPoints || 0)
      );
    } else if (sortBy === 'streak') {
      sortedMembers = familyMembers.sort(
        (a, b) =>
          (b.streak?.currentStreak || 0) - (a.streak?.currentStreak || 0)
      );
    }

    // Format leaderboard
    const leaderboard = sortedMembers.map((member, index) => ({
      rank: index + 1,
      userId: member.user.id,
      name: member.user.name,
      email: member.user.email,
      avatarUrl: member.user.avatarUrl,
      points: member.user.gamificationPoints || 0,
      currentStreak: member.streak?.currentStreak || 0,
      longestStreak: member.streak?.longestStreak || 0,
      isCurrentUser: member.user.id === user[0].id,
    }));

    return NextResponse.json({ leaderboard });
  } catch (error) {
    console.error('[Gamification Leaderboard GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}
