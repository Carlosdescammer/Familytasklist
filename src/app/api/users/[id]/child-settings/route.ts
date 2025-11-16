import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/db/schema';
import { auth } from '@/auth';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const updateChildSettingsSchema = z.object({
  allowedPages: z.array(z.string()).optional(),
  gamificationEnabled: z.boolean().optional(),
  pointsPerTask: z.number().min(0).optional(),
  familyBucks: z.number().optional(), // For awarding/deducting points
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    // Only parents can update child settings
    if (!session?.user?.familyId || session.user.role !== 'parent') {
      return NextResponse.json(
        { error: 'Unauthorized - Only parents can update child settings' },
        { status: 403 }
      );
    }

    // Get the child user to verify they're in the same family
    const childUser = await db.query.users.findFirst({
      where: eq(users.id, params.id),
    });

    if (!childUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify child is in same family as parent
    if (childUser.familyId !== session.user.familyId) {
      return NextResponse.json(
        { error: 'Cannot modify users from other families' },
        { status: 403 }
      );
    }

    // Parse and validate the request body
    const body = await req.json();
    const data = updateChildSettingsSchema.parse(body);

    // Prepare update data
    const updateData: any = {};

    if (data.allowedPages !== undefined) {
      updateData.allowedPages = JSON.stringify(data.allowedPages);
    }

    if (data.gamificationEnabled !== undefined) {
      updateData.gamificationEnabled = data.gamificationEnabled;
    }

    if (data.pointsPerTask !== undefined) {
      updateData.pointsPerTask = data.pointsPerTask.toString();
    }

    if (data.familyBucks !== undefined) {
      // Update family bucks (can be used to award or deduct points)
      updateData.familyBucks = data.familyBucks.toString();
    }

    // Update the child user
    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, params.id))
      .returning();

    if (!updatedUser) {
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }

    // Format the response
    const response = {
      ...updatedUser,
      allowedPages: updatedUser.allowedPages
        ? JSON.parse(updatedUser.allowedPages)
        : null,
      familyBucks: parseFloat(updatedUser.familyBucks || '0'),
      totalPointsEarned: parseFloat(updatedUser.totalPointsEarned || '0'),
      pointsPerTask: parseFloat(updatedUser.pointsPerTask || '10'),
    };

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Error updating child settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Get child settings
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.familyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the user
    const user = await db.query.users.findFirst({
      where: eq(users.id, params.id),
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify user is in same family
    if (user.familyId !== session.user.familyId) {
      return NextResponse.json(
        { error: 'Cannot view users from other families' },
        { status: 403 }
      );
    }

    // Format the response
    const response = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      relationship: user.relationship,
      allowedPages: user.allowedPages ? JSON.parse(user.allowedPages) : null,
      gamificationEnabled: user.gamificationEnabled,
      familyBucks: parseFloat(user.familyBucks || '0'),
      totalPointsEarned: parseFloat(user.totalPointsEarned || '0'),
      pointsPerTask: parseFloat(user.pointsPerTask || '10'),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching child settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
