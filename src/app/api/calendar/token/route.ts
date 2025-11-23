import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { users, familyMembers } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { generateCalendarToken } from '@/lib/calendar-token';

// POST /api/calendar/token - Generate calendar token for a family
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get database user ID from Clerk ID
    const dbUser = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { familyId } = body;

    if (!familyId) {
      return NextResponse.json({ error: 'Family ID is required' }, { status: 400 });
    }

    // Verify user is a member of the family
    const membership = await db.query.familyMembers.findFirst({
      where: and(
        eq(familyMembers.userId, dbUser.id),
        eq(familyMembers.familyId, familyId)
      ),
    });

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this family' }, { status: 403 });
    }

    // Generate the token server-side
    const token = generateCalendarToken(familyId);

    return NextResponse.json({ token });
  } catch (error) {
    console.error('Error generating calendar token:', error);
    return NextResponse.json(
      { error: 'Failed to generate calendar token' },
      { status: 500 }
    );
  }
}
