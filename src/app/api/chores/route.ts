/**
 * Chores API Routes
 *
 * GET /api/chores - List all chores for a family
 * POST /api/chores - Create a new chore
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { chores, users } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

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

    // Get all chores for the family
    const familyChores = await db
      .select()
      .from(chores)
      .where(eq(chores.familyId, user[0].familyId))
      .orderBy(desc(chores.createdAt));

    return NextResponse.json({ chores: familyChores });
  } catch (error) {
    console.error('[Chores GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chores' },
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

    // Get user's family
    const user = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, userId))
      .limit(1);

    if (!user[0]?.familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 404 });
    }

    const body = await req.json();
    const {
      title,
      description,
      points = 10,
      allowanceCents = 0,
      category = 'general',
      difficulty = 'medium',
      estimatedMinutes,
      icon,
      isRecurring = false,
      recurrencePattern,
    } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Create chore
    const [newChore] = await db
      .insert(chores)
      .values({
        familyId: user[0].familyId,
        title,
        description,
        points,
        allowanceCents,
        category,
        difficulty,
        estimatedMinutes,
        icon,
        isRecurring,
        recurrencePattern,
        createdBy: user[0].id,
      })
      .returning();

    return NextResponse.json({ chore: newChore }, { status: 201 });
  } catch (error) {
    console.error('[Chores POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create chore' },
      { status: 500 }
    );
  }
}
