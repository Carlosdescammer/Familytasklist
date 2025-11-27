/**
 * Chore Assignment Verify API Route
 *
 * POST /api/chores/assignments/[id]/verify - Verify completed assignment and award points/allowance
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import {
  choreAssignments,
  chores,
  users,
  pointTransactions,
  allowancePayments,
  notifications,
  userStreaks,
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
    const { approved = true, notes } = body;

    // Get assignment
    const [assignment] = await db
      .select({
        assignment: choreAssignments,
        chore: chores,
        assignee: users,
      })
      .from(choreAssignments)
      .innerJoin(chores, eq(choreAssignments.choreId, chores.id))
      .innerJoin(users, eq(choreAssignments.assignedTo, users.id))
      .where(eq(choreAssignments.id, params.id))
      .limit(1);

    if (!assignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    // Verify assignment is completed
    if (assignment.assignment.status !== 'completed') {
      return NextResponse.json(
        { error: 'Assignment must be completed before verification' },
        { status: 400 }
      );
    }

    if (approved) {
      // Update assignment to verified
      const [verifiedAssignment] = await db
        .update(choreAssignments)
        .set({
          status: 'verified',
          verifiedBy: user[0].id,
          verifiedAt: new Date(),
          notes: notes || assignment.assignment.notes,
          updatedAt: new Date(),
        })
        .where(eq(choreAssignments.id, params.id))
        .returning();

      // Award points to user
      await db.insert(pointTransactions).values({
        userId: assignment.assignee.id,
        amount: assignment.chore.points,
        type: 'chore_completed',
        description: `Verified: ${assignment.chore.title}`,
        choreAssignmentId: params.id,
        createdBy: user[0].id,
      });

      // Update user's total points
      await db
        .update(users)
        .set({
          gamificationPoints: sql`${users.gamificationPoints} + ${assignment.chore.points}`,
        })
        .where(eq(users.id, assignment.assignee.id));

      // Record allowance payment if applicable
      if (assignment.chore.allowanceCents > 0) {
        await db.insert(allowancePayments).values({
          familyId: user[0].familyId!,
          userId: assignment.assignee.id,
          amountCents: assignment.chore.allowanceCents,
          choreAssignmentId: params.id,
          paidBy: user[0].id,
          paymentMethod: 'pending',
          notes: `For completing: ${assignment.chore.title}`,
        });
      }

      // Update user streak
      const today = new Date().toISOString().split('T')[0];
      const [streak] = await db
        .select()
        .from(userStreaks)
        .where(eq(userStreaks.userId, assignment.assignee.id))
        .limit(1);

      if (streak) {
        const lastActivity = streak.lastActivityDate
          ? new Date(streak.lastActivityDate).toISOString().split('T')[0]
          : null;
        const yesterday = new Date(Date.now() - 86400000)
          .toISOString()
          .split('T')[0];

        let newStreak = streak.currentStreak;
        if (lastActivity === yesterday) {
          // Continue streak
          newStreak += 1;
        } else if (lastActivity !== today) {
          // Reset streak if missed days
          newStreak = 1;
        }

        await db
          .update(userStreaks)
          .set({
            currentStreak: newStreak,
            longestStreak: Math.max(newStreak, streak.longestStreak),
            lastActivityDate: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(userStreaks.userId, assignment.assignee.id));
      } else {
        // Create new streak
        await db.insert(userStreaks).values({
          userId: assignment.assignee.id,
          currentStreak: 1,
          longestStreak: 1,
          lastActivityDate: new Date(),
          streakType: 'daily',
        });
      }

      // Notify assignee
      if (assignment.assignee.familyId) {
        await db.insert(notifications).values({
          familyId: assignment.assignee.familyId,
          userId: assignment.assignee.id,
          type: 'chore_verified',
          title: 'Chore Verified!',
          message: `You earned ${assignment.chore.points} points${
            assignment.chore.allowanceCents > 0
              ? ` and $${(assignment.chore.allowanceCents / 100).toFixed(2)}`
              : ''
          } for: ${assignment.chore.title}`,
          read: false,
        });
      }

      return NextResponse.json({ assignment: verifiedAssignment });
    } else {
      // Reject assignment
      const [rejectedAssignment] = await db
        .update(choreAssignments)
        .set({
          status: 'rejected',
          verifiedBy: user[0].id,
          verifiedAt: new Date(),
          notes: notes || assignment.assignment.notes,
          updatedAt: new Date(),
        })
        .where(eq(choreAssignments.id, params.id))
        .returning();

      // Notify assignee
      if (assignment.assignee.familyId) {
        await db.insert(notifications).values({
          familyId: assignment.assignee.familyId,
          userId: assignment.assignee.id,
          type: 'chore_rejected',
          title: 'Chore Needs Work',
          message: `Your completion of "${assignment.chore.title}" was rejected. ${notes || ''}`,
          read: false,
        });
      }

      return NextResponse.json({ assignment: rejectedAssignment });
    }
  } catch (error) {
    console.error('[Chore Assignment Verify POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to verify assignment' },
      { status: 500 }
    );
  }
}
