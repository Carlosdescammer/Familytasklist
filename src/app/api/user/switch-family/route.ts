import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/auth';
import { eq, and } from 'drizzle-orm';
import { users, familyMembers } from '@/db/schema';

// POST /api/user/switch-family - Switch to a different family context
export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { familyId } = await req.json();

    if (!familyId) {
      return NextResponse.json({ error: 'familyId is required' }, { status: 400 });
    }

    // Verify the user is actually a member of this family
    const membership = await db.query.familyMembers.findFirst({
      where: and(
        eq(familyMembers.userId, session.user.id),
        eq(familyMembers.familyId, familyId)
      ),
      with: {
        family: true,
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'You are not a member of this family' },
        { status: 403 }
      );
    }

    // Update the user's active family
    await db
      .update(users)
      .set({ activeFamilyId: familyId })
      .where(eq(users.id, session.user.id));

    return NextResponse.json({
      success: true,
      activeFamilyId: familyId,
      familyName: membership.family.name,
      roleInFamily: membership.roleInFamily,
    });
  } catch (error) {
    console.error('Error switching family:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
