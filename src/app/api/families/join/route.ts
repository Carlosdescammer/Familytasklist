import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { families, users, familyMembers } from '@/db/schema';
import { auth } from '@/lib/auth-helpers';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const joinFamilySchema = z.object({
  inviteCode: z.string().uuid(),
});

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { inviteCode } = joinFamilySchema.parse(body);

    // Check if family exists
    const family = await db.query.families.findFirst({
      where: eq(families.id, inviteCode),
    });

    if (!family) {
      return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 });
    }

    // Check if user is already a member of this family
    const existingMembership = await db.query.familyMembers.findFirst({
      where: and(
        eq(familyMembers.userId, session.user.id),
        eq(familyMembers.familyId, family.id)
      ),
    });

    if (existingMembership) {
      return NextResponse.json({ error: 'You are already a member of this family' }, { status: 400 });
    }

    // Add user to familyMembers table
    await db.insert(familyMembers).values({
      userId: session.user.id,
      familyId: family.id,
      roleInFamily: 'Member', // Default role
      isAdmin: false,
    });

    // If user doesn't have a primary family yet, set this as their primary
    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    });

    if (!currentUser?.familyId) {
      await db
        .update(users)
        .set({ familyId: family.id, activeFamilyId: family.id })
        .where(eq(users.id, session.user.id));
    }

    return NextResponse.json({ message: 'Successfully joined family', family });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Error joining family:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
