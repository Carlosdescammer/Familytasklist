/**
 * Gamification Reward Redeem API Route
 *
 * POST /api/gamification/rewards/[id]/redeem - Redeem a reward with points
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import {
  rewards,
  rewardRedemptions,
  users,
  pointTransactions,
  notifications,
} from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';

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

    const body = await req.json();
    const { notes } = body;

    // Get reward
    const [reward] = await db
      .select()
      .from(rewards)
      .where(
        and(
          eq(rewards.id, params.id),
          eq(rewards.familyId, user[0].familyId!)
        )
      )
      .limit(1);

    if (!reward) {
      return NextResponse.json({ error: 'Reward not found' }, { status: 404 });
    }

    // Check if reward is available
    if (!reward.isAvailable) {
      return NextResponse.json(
        { error: 'This reward is no longer available' },
        { status: 400 }
      );
    }

    // Check stock
    if (reward.stockRemaining !== null && reward.stockRemaining <= 0) {
      return NextResponse.json(
        { error: 'This reward is out of stock' },
        { status: 400 }
      );
    }

    // Check if user has enough points
    const userPoints = user[0].gamificationPoints || 0;
    if (userPoints < reward.pointsCost) {
      return NextResponse.json(
        {
          error: `Not enough points. You need ${reward.pointsCost} but have ${userPoints}`,
        },
        { status: 400 }
      );
    }

    // Create redemption
    const [redemption] = await db
      .insert(rewardRedemptions)
      .values({
        rewardId: params.id,
        userId: user[0].id,
        pointsSpent: reward.pointsCost,
        status: 'pending',
        notes,
      })
      .returning();

    // Deduct points
    await db
      .update(users)
      .set({
        gamificationPoints: sql`${users.gamificationPoints} - ${reward.pointsCost}`,
      })
      .where(eq(users.id, user[0].id));

    // Record transaction
    await db.insert(pointTransactions).values({
      userId: user[0].id,
      amount: -reward.pointsCost,
      type: 'reward_redeemed',
      description: `Redeemed: ${reward.title}`,
      rewardRedemptionId: redemption.id,
    });

    // Update stock if applicable
    if (reward.stockRemaining !== null) {
      await db
        .update(rewards)
        .set({
          stockRemaining: sql`${rewards.stockRemaining} - 1`,
        })
        .where(eq(rewards.id, params.id));
    }

    // Notify parents
    if (user[0].familyId) {
      const parents = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.familyId, user[0].familyId),
            eq(users.role, 'parent')
          )
        );

      for (const parent of parents) {
        await db.insert(notifications).values({
          familyId: user[0].familyId,
          userId: parent.id,
          type: 'reward_redeemed',
          title: 'Reward Redeemed',
          message: `${user[0].name || 'Someone'} redeemed: ${reward.title}`,
          read: false,
        });
      }

      // Notify user
      await db.insert(notifications).values({
        familyId: user[0].familyId,
        userId: user[0].id,
        type: 'reward_redeemed',
        title: 'Reward Claimed!',
        message: `You redeemed "${reward.title}" for ${reward.pointsCost} points. A parent will fulfill your request soon.`,
        read: false,
      });
    }

    return NextResponse.json({ redemption }, { status: 201 });
  } catch (error) {
    console.error('[Gamification Reward Redeem POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to redeem reward' },
      { status: 500 }
    );
  }
}
