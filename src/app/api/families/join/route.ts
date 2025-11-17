import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { families, users } from '@/db/schema';
import { auth } from '@/lib/auth-helpers';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const joinFamilySchema = z.object({
  inviteCode: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
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

    // Update user to be part of this family
    await db
      .update(users)
      .set({ familyId: family.id, role: 'parent' })
      .where(eq(users.email, session.user.email));

    return NextResponse.json({ message: 'Successfully joined family', family });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Error joining family:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
