/**
 * Gamification Achievements Check API Route
 *
 * POST /api/gamification/achievements/check - Check and unlock achievements for user
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import {
  achievements,
  userAchievements,
  users,
  choreAssignments,
  pointTransactions,
  notifications,
  userStreaks,
} from '@/db/schema';
import { eq, and, count, sql } from 'drizzle-orm';

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

    // Get all active achievements
    const allAchievements = await db
      .select()
      .from(achievements)
      .where(eq(achievements.isActive, true));

    // Get user's already unlocked achievements
    const unlockedAchievements = await db
      .select()
      .from(userAchievements)
      .where(eq(userAchievements.userId, user[0].id));

    const unlockedIds = new Set(
      unlockedAchievements.map((ua) => ua.achievementId)
    );

    // Get user stats for checking conditions
    const [choreStats] = await db
      .select({
        totalCompleted: count(),
      })
      .from(choreAssignments)
      .where(
        and(
          eq(choreAssignments.assignedTo, user[0].id),
          eq(choreAssignments.status, 'verified')
        )
      );

    const [streakData] = await db
      .select()
      .from(userStreaks)
      .where(eq(userStreaks.userId, user[0].id))
      .limit(1);

    const totalPoints = user[0].gamificationPoints || 0;
    const totalChores = choreStats?.totalCompleted || 0;
    const currentStreak = streakData?.currentStreak || 0;

    // Check each achievement
    const newlyUnlocked = [];
    for (const achievement of allAchievements) {
      if (unlockedIds.has(achievement.id)) continue;

      let shouldUnlock = false;

      // Parse unlock condition (simple format: "type:value")
      const [conditionType, conditionValue] = achievement.unlockCondition.split(':');
      const targetValue = parseInt(conditionValue);

      switch (conditionType) {
        case 'chores_completed':
          shouldUnlock = totalChores >= targetValue;
          break;
        case 'points_earned':
          shouldUnlock = totalPoints >= targetValue;
          break;
        case 'streak_days':
          shouldUnlock = currentStreak >= targetValue;
          break;
        default:
          // Unknown condition type
          break;
      }

      if (shouldUnlock) {
        // Unlock achievement
        await db.insert(userAchievements).values({
          userId: user[0].id,
          achievementId: achievement.id,
          progress: 100,
        });

        // Award bonus points
        if (achievement.points > 0) {
          await db.insert(pointTransactions).values({
            userId: user[0].id,
            amount: achievement.points,
            type: 'achievement_unlocked',
            description: `Unlocked achievement: ${achievement.name}`,
          });

          await db
            .update(users)
            .set({
              gamificationPoints: sql`${users.gamificationPoints} + ${achievement.points}`,
            })
            .where(eq(users.id, user[0].id));
        }

        // Notify user
        if (user[0].familyId) {
          await db.insert(notifications).values({
            familyId: user[0].familyId,
            userId: user[0].id,
            type: 'achievement_unlocked',
            title: 'Achievement Unlocked!',
            message: `You earned "${achievement.name}"${
              achievement.points > 0 ? ` (+${achievement.points} points)` : ''
            }`,
            read: false,
          });
        }

        newlyUnlocked.push(achievement);
      }
    }

    return NextResponse.json({
      unlockedCount: newlyUnlocked.length,
      achievements: newlyUnlocked,
    });
  } catch (error) {
    console.error('[Gamification Achievements Check POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to check achievements' },
      { status: 500 }
    );
  }
}
