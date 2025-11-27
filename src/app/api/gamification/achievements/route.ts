/**
 * Gamification Achievements API Routes
 *
 * GET /api/gamification/achievements - Get all available achievements
 * POST /api/gamification/achievements - Create a new achievement (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { achievements, userAchievements, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

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

    if (!user[0]) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get all active achievements
    const allAchievements = await db
      .select()
      .from(achievements)
      .where(eq(achievements.isActive, true));

    // Get user's unlocked achievements
    const unlockedAchievements = await db
      .select()
      .from(userAchievements)
      .where(eq(userAchievements.userId, user[0].id));

    const unlockedIds = new Set(
      unlockedAchievements.map((ua) => ua.achievementId)
    );

    // Combine data
    const achievementsWithProgress = allAchievements.map((achievement) => ({
      ...achievement,
      unlocked: unlockedIds.has(achievement.id),
      unlockedAt: unlockedAchievements.find(
        (ua) => ua.achievementId === achievement.id
      )?.unlockedAt,
    }));

    return NextResponse.json({ achievements: achievementsWithProgress });
  } catch (error) {
    console.error('[Gamification Achievements GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch achievements' },
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

    if (!user[0]) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only admins can create achievements
    if (user[0].role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const {
      name,
      description,
      icon,
      category = 'general',
      points = 0,
      rarity = 'common',
      unlockCondition,
      color = 'blue',
    } = body;

    if (!name || !description || !icon || !unlockCondition) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create achievement
    const [newAchievement] = await db
      .insert(achievements)
      .values({
        name,
        description,
        icon,
        category,
        points,
        rarity,
        unlockCondition,
        color,
        isActive: true,
      })
      .returning();

    return NextResponse.json({ achievement: newAchievement }, { status: 201 });
  } catch (error) {
    console.error('[Gamification Achievements POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create achievement' },
      { status: 500 }
    );
  }
}
