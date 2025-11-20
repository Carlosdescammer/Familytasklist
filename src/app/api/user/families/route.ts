import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth-helpers';
import { eq } from 'drizzle-orm';
import { familyMembers } from '@/db/schema';

export const dynamic = 'force-dynamic';

// GET /api/user/families - Get all families the user belongs to
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all family memberships for this user
    const memberships = await db.query.familyMembers.findMany({
      where: eq(familyMembers.userId, session.user.id),
      with: {
        family: true,
      },
      orderBy: (familyMembers, { desc }) => [desc(familyMembers.joinedAt)],
    });

    // Also get the user's current active family ID
    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, session.user.id),
    });

    return NextResponse.json({
      families: memberships.map((m) => ({
        id: m.family.id,
        name: m.family.name,
        roleInFamily: m.roleInFamily,
        isAdmin: m.isAdmin,
        joinedAt: m.joinedAt,
        isActive: m.familyId === user?.activeFamilyId,
      })),
      activeFamilyId: user?.activeFamilyId || user?.familyId,
    });
  } catch (error) {
    console.error('Error fetching user families:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
