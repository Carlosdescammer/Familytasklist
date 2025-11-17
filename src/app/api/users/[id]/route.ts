import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/db/schema';
import { auth } from '@/auth';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const updateUserSchema = z.object({
  role: z.enum(['parent', 'child']).optional(),
  name: z.string().optional(),
  bio: z.string().optional(),
  birthday: z.string().datetime().optional(),
  favoriteColor: z.string().optional(),
  favoriteFood: z.string().optional(),
  hobbies: z.string().optional(),
  relationship: z.string().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.familyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, params.id),
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Ensure the user belongs to the same family
    if (user.familyId !== session.user.familyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Don't return sensitive fields
    const { passwordHash, googleAccessToken, googleRefreshToken, ...safeUser } = user;

    return NextResponse.json(safeUser);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.familyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const data = updateUserSchema.parse(body);

    // Get the user to update
    const userToUpdate = await db.query.users.findFirst({
      where: eq(users.id, params.id),
    });

    if (!userToUpdate) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Ensure the user belongs to the same family
    if (userToUpdate.familyId !== session.user.familyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check permissions: Only parents can update roles, but users can update their own profile
    const isOwnProfile = session.user.id === params.id;
    const isParent = session.user.role === 'parent';

    if (data.role && !isParent) {
      return NextResponse.json({ error: 'Forbidden - Only parents can update roles' }, { status: 403 });
    }

    if (!isOwnProfile && !isParent) {
      return NextResponse.json({ error: 'Forbidden - You can only edit your own profile' }, { status: 403 });
    }

    // Prepare update data
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.bio !== undefined) updateData.bio = data.bio;
    if (data.birthday !== undefined) updateData.birthday = data.birthday ? new Date(data.birthday) : null;
    if (data.favoriteColor !== undefined) updateData.favoriteColor = data.favoriteColor;
    if (data.favoriteFood !== undefined) updateData.favoriteFood = data.favoriteFood;
    if (data.hobbies !== undefined) updateData.hobbies = data.hobbies;
    if (data.relationship !== undefined) updateData.relationship = data.relationship;
    if (data.role !== undefined && isParent) updateData.role = data.role;

    // Update the user
    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, params.id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
