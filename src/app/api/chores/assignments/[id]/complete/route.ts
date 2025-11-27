/**
 * Chore Assignment Complete API Route
 *
 * POST /api/chores/assignments/[id]/complete - Mark assignment as completed
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import {
  choreAssignments,
  chores,
  users,
  pointTransactions,
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

    const body = await req.json();
    const { notes } = body;

    // Get assignment
    const [assignment] = await db
      .select({
        assignment: choreAssignments,
        chore: chores,
      })
      .from(choreAssignments)
      .innerJoin(chores, eq(choreAssignments.choreId, chores.id))
      .where(eq(choreAssignments.id, params.id))
      .limit(1);

    if (!assignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    // Verify user is the assignee
    if (assignment.assignment.assignedTo !== user[0].id) {
      return NextResponse.json(
        { error: 'You can only complete your own assignments' },
        { status: 403 }
      );
    }

    // Verify assignment is pending
    if (assignment.assignment.status !== 'pending') {
      return NextResponse.json(
        { error: 'Assignment is not pending' },
        { status: 400 }
      );
    }

    // Update assignment to completed
    const [updatedAssignment] = await db
      .update(choreAssignments)
      .set({
        status: 'completed',
        completedAt: new Date(),
        notes: notes || assignment.assignment.notes,
        updatedAt: new Date(),
      })
      .where(eq(choreAssignments.id, params.id))
      .returning();

    // Award points (will be verified by parent later)
    // For now, mark as pending verification
    await db.insert(pointTransactions).values({
      userId: user[0].id,
      amount: assignment.chore.points,
      type: 'chore_pending',
      description: `Completed: ${assignment.chore.title} (pending verification)`,
      choreAssignmentId: params.id,
    });

    // Notify parent/assigner
    if (assignment.assignment.assignedBy && user[0].familyId) {
      await db.insert(notifications).values({
        familyId: user[0].familyId,
        userId: assignment.assignment.assignedBy,
        type: 'chore_completed',
        title: 'Chore Completed',
        message: `${user[0].name || 'Someone'} completed: ${assignment.chore.title}`,
        read: false,
      });
    }

    return NextResponse.json({ assignment: updatedAssignment });
  } catch (error) {
    console.error('[Chore Assignment Complete POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to complete assignment' },
      { status: 500 }
    );
  }
}
