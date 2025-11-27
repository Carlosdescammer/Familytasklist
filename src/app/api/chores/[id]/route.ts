/**
 * Chores API Routes - Individual Chore
 *
 * PATCH /api/chores/[id] - Update a chore
 * DELETE /api/chores/[id] - Delete a chore
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { chores, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
      points,
      allowanceCents,
      category,
      difficulty,
      estimatedMinutes,
      icon,
      isRecurring,
      recurrencePattern,
    } = body;

    // Update chore (only if it belongs to the user's family)
    const [updatedChore] = await db
      .update(chores)
      .set({
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(points !== undefined && { points }),
        ...(allowanceCents !== undefined && { allowanceCents }),
        ...(category && { category }),
        ...(difficulty && { difficulty }),
        ...(estimatedMinutes !== undefined && { estimatedMinutes }),
        ...(icon !== undefined && { icon }),
        ...(isRecurring !== undefined && { isRecurring }),
        ...(recurrencePattern !== undefined && { recurrencePattern }),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(chores.id, params.id),
          eq(chores.familyId, user[0].familyId)
        )
      )
      .returning();

    if (!updatedChore) {
      return NextResponse.json({ error: 'Chore not found' }, { status: 404 });
    }

    return NextResponse.json({ chore: updatedChore });
  } catch (error) {
    console.error('[Chores PATCH] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update chore' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Delete chore (only if it belongs to the user's family)
    await db
      .delete(chores)
      .where(
        and(
          eq(chores.id, params.id),
          eq(chores.familyId, user[0].familyId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Chores DELETE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete chore' },
      { status: 500 }
    );
  }
}
