/**
 * Gamification Rewards API Routes
 *
 * GET /api/gamification/rewards - Get available rewards in the family store
 * POST /api/gamification/rewards - Create a new reward (parents only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { rewards, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

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
    const availableOnly = searchParams.get('available') === 'true';

    // Get rewards for the family
    let query = db
      .select()
      .from(rewards)
      .where(eq(rewards.familyId, user[0].familyId));

    if (availableOnly) {
      // Only show available rewards
      const allRewards = await query;
      const availableRewards = allRewards.filter((r) => r.isAvailable);
      return NextResponse.json({ rewards: availableRewards });
    }

    const allRewards = await query;
    return NextResponse.json({ rewards: allRewards });
  } catch (error) {
    console.error('[Gamification Rewards GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rewards' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
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

    // Only parents/admins can create rewards
    if (user[0].role !== 'parent' && user[0].role !== 'admin') {
      return NextResponse.json(
        { error: 'Only parents can create rewards' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      title,
      description,
      pointsCost,
      category = 'privilege',
      icon,
      stockLimit,
    } = body;

    if (!title || !pointsCost) {
      return NextResponse.json(
        { error: 'Title and points cost are required' },
        { status: 400 }
      );
    }

    // Create reward
    const [newReward] = await db
      .insert(rewards)
      .values({
        familyId: user[0].familyId,
        title,
        description,
        pointsCost,
        category,
        icon,
        stockLimit: stockLimit || null,
        stockRemaining: stockLimit || null,
        isAvailable: true,
        createdBy: user[0].id,
      })
      .returning();

    return NextResponse.json({ reward: newReward }, { status: 201 });
  } catch (error) {
    console.error('[Gamification Rewards POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create reward' },
      { status: 500 }
    );
  }
}
