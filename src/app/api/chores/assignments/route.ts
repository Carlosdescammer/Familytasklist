/**
 * Chore Assignments API Routes
 *
 * GET /api/chores/assignments - List all assignments for user's family
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { choreAssignments, chores, users } from '@/db/schema';
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

    const { searchParams } = new URL(req.url);
    const assignedToFilter = searchParams.get('assignedTo');
    const statusFilter = searchParams.get('status');

    // Get all assignments with chore details
    let query = db
      .select({
        assignment: choreAssignments,
        chore: chores,
        assignedToUser: users,
      })
      .from(choreAssignments)
      .innerJoin(chores, eq(choreAssignments.choreId, chores.id))
      .innerJoin(users, eq(choreAssignments.assignedTo, users.id))
      .where(eq(chores.familyId, user[0].familyId))
      .orderBy(desc(choreAssignments.createdAt));

    const results = await query;

    // Filter by assignedTo if specified
    let filteredResults = results;
    if (assignedToFilter) {
      filteredResults = filteredResults.filter(
        (r) => r.assignment.assignedTo === assignedToFilter
      );
    }

    // Filter by status if specified
    if (statusFilter) {
      filteredResults = filteredResults.filter(
        (r) => r.assignment.status === statusFilter
      );
    }

    return NextResponse.json({ assignments: filteredResults });
  } catch (error) {
    console.error('[Chore Assignments GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assignments' },
      { status: 500 }
    );
  }
}
