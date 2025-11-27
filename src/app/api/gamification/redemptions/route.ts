/**
 * Gamification Redemptions API Routes
 *
 * GET /api/gamification/redemptions - Get reward redemptions for family
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { rewardRedemptions, rewards, users } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user
    const user = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, userId))
      .limit(1);

    if (!user[0]?.familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status');
    const userIdFilter = searchParams.get('userId');

    // Get redemptions with reward and user details
    let redemptionsQuery = await db
      .select({
        redemption: rewardRedemptions,
        reward: rewards,
        user: users,
      })
      .from(rewardRedemptions)
      .innerJoin(rewards, eq(rewardRedemptions.rewardId, rewards.id))
      .innerJoin(users, eq(rewardRedemptions.userId, users.id))
      .where(eq(rewards.familyId, user[0].familyId))
      .orderBy(desc(rewardRedemptions.redeemedAt));

    // Filter by status
    let filteredRedemptions = redemptionsQuery;
    if (statusFilter) {
      filteredRedemptions = filteredRedemptions.filter(
        (r) => r.redemption.status === statusFilter
      );
    }

    // Filter by user
    if (userIdFilter) {
      filteredRedemptions = filteredRedemptions.filter(
        (r) => r.redemption.userId === userIdFilter
      );
    }

    return NextResponse.json({ redemptions: filteredRedemptions });
  } catch (error) {
    console.error('[Gamification Redemptions GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch redemptions' },
      { status: 500 }
    );
  }
}
