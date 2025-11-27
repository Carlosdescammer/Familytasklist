/**
 * Chores API Routes - Assign Chore
 *
 * POST /api/chores/[id]/assign - Assign a chore to a family member
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { chores, choreAssignments, users, notifications } from '@/db/schema';
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

    if (!user[0]?.familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 404 });
    }

    const body = await req.json();
    const { assignedTo, dueDate, notes } = body;

    if (!assignedTo) {
      return NextResponse.json(
        { error: 'assignedTo is required' },
        { status: 400 }
      );
    }

    // Verify chore exists and belongs to family
    const [chore] = await db
      .select()
      .from(chores)
      .where(
        and(
          eq(chores.id, params.id),
          eq(chores.familyId, user[0].familyId)
        )
      )
      .limit(1);

    if (!chore) {
      return NextResponse.json({ error: 'Chore not found' }, { status: 404 });
    }

    // Verify assignedTo user is in the same family
    const [assignee] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.id, assignedTo),
          eq(users.familyId, user[0].familyId)
        )
      )
      .limit(1);

    if (!assignee) {
      return NextResponse.json(
        { error: 'Assignee not found in family' },
        { status: 404 }
      );
    }

    // Create assignment
    const [assignment] = await db
      .insert(choreAssignments)
      .values({
        choreId: params.id,
        assignedTo,
        assignedBy: user[0].id,
        dueDate: dueDate ? new Date(dueDate) : null,
        notes,
        status: 'pending',
      })
      .returning();

    // Create notification for assignee
    await db.insert(notifications).values({
      familyId: user[0].familyId,
      userId: assignedTo,
      type: 'chore_assigned',
      title: 'New Chore Assigned',
      message: `You've been assigned: ${chore.title}`,
      read: false,
    });

    return NextResponse.json({ assignment }, { status: 201 });
  } catch (error) {
    console.error('[Chores Assign POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to assign chore' },
      { status: 500 }
    );
  }
}
