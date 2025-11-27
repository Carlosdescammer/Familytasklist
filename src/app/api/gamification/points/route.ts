/**
 * Gamification Points API Routes
 *
 * GET /api/gamification/points - Get user's points and transaction history
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { pointTransactions, users } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

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

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    // Get user's total points
    const totalPoints = user[0].gamificationPoints || 0;

    // Get transaction history
    const transactions = await db
      .select()
      .from(pointTransactions)
      .where(eq(pointTransactions.userId, user[0].id))
      .orderBy(desc(pointTransactions.createdAt))
      .limit(limit);

    return NextResponse.json({
      totalPoints,
      transactions,
    });
  } catch (error) {
    console.error('[Gamification Points GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch points' },
      { status: 500 }
    );
  }
}
