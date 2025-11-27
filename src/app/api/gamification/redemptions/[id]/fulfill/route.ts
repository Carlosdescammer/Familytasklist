/**
 * Gamification Redemption Fulfill API Route
 *
 * POST /api/gamification/redemptions/[id]/fulfill - Fulfill a reward redemption (parents only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import {
  rewardRedemptions,
  rewards,
  users,
  notifications,
} from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    if (!user[0]) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only parents can fulfill redemptions
    if (user[0].role !== 'parent' && user[0].role !== 'admin') {
      return NextResponse.json(
        { error: 'Only parents can fulfill redemptions' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { fulfilled = true, notes } = body;

    // Get redemption with reward details
    const [redemptionData] = await db
      .select({
        redemption: rewardRedemptions,
        reward: rewards,
      })
      .from(rewardRedemptions)
      .innerJoin(rewards, eq(rewardRedemptions.rewardId, rewards.id))
      .where(eq(rewardRedemptions.id, params.id))
      .limit(1);

    if (!redemptionData) {
      return NextResponse.json(
        { error: 'Redemption not found' },
        { status: 404 }
      );
    }

    // Verify redemption belongs to user's family
    if (redemptionData.reward.familyId !== user[0].familyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update redemption status
    const [updatedRedemption] = await db
      .update(rewardRedemptions)
      .set({
        status: fulfilled ? 'fulfilled' : 'cancelled',
        fulfilledBy: user[0].id,
        fulfilledAt: new Date(),
        notes: notes || redemptionData.redemption.notes,
      })
      .where(eq(rewardRedemptions.id, params.id))
      .returning();

    // Notify user
    if (user[0].familyId) {
      await db.insert(notifications).values({
        familyId: user[0].familyId,
        userId: redemptionData.redemption.userId,
        type: fulfilled ? 'reward_fulfilled' : 'reward_cancelled',
        title: fulfilled ? 'Reward Delivered!' : 'Reward Cancelled',
        message: fulfilled
          ? `Your reward "${redemptionData.reward.title}" has been delivered!`
          : `Your redemption of "${redemptionData.reward.title}" was cancelled. ${notes || ''}`,
        read: false,
      });
    }

    return NextResponse.json({ redemption: updatedRedemption });
  } catch (error) {
    console.error('[Gamification Redemption Fulfill POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fulfill redemption' },
      { status: 500 }
    );
  }
}
