import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/db/schema';
import { auth } from '@/auth';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { sql } from 'drizzle-orm';

const awardPointsSchema = z.object({
  points: z.number().min(0),
  reason: z.string().optional(), // e.g., "Completed task: Take out trash"
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.familyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the user to award points to
    const user = await db.query.users.findFirst({
      where: eq(users.id, params.id),
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify user is in same family
    if (user.familyId !== session.user.familyId) {
      return NextResponse.json(
        { error: 'Cannot award points to users from other families' },
        { status: 403 }
      );
    }

    // Check if gamification is enabled for this user
    if (!user.gamificationEnabled) {
      return NextResponse.json(
        { error: 'Gamification is not enabled for this user' },
        { status: 400 }
      );
    }

    // Parse and validate the request body
    const body = await req.json();
    const { points, reason } = awardPointsSchema.parse(body);

    // Update user's points using SQL to ensure atomic updates
    const [updatedUser] = await db
      .update(users)
      .set({
        familyBucks: sql`${users.familyBucks} + ${points}`,
        totalPointsEarned: sql`${users.totalPointsEarned} + ${points}`,
      })
      .where(eq(users.id, params.id))
      .returning();

    if (!updatedUser) {
      return NextResponse.json({ error: 'Failed to award points' }, { status: 500 });
    }

    console.log(
      `Awarded ${points} points to ${user.name || user.email}${
        reason ? ` for: ${reason}` : ''
      }`
    );

    // Format the response
    const response = {
      id: updatedUser.id,
      name: updatedUser.name,
      familyBucks: parseFloat(updatedUser.familyBucks || '0'),
      totalPointsEarned: parseFloat(updatedUser.totalPointsEarned || '0'),
      pointsAwarded: points,
      reason,
    };

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Error awarding points:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
