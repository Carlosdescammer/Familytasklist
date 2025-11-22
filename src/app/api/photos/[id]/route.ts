import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { photos, familyMembers, users } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

const updatePhotoSchema = z.object({
  caption: z.string().optional(),
  description: z.string().optional(),
  tags: z.string().optional(),
  isFavorite: z.boolean().optional(),
});

// GET /api/photos/[id] - Get a single photo
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    const photo = await db.query.photos.findFirst({
      where: eq(photos.id, id),
      with: {
        uploader: {
          columns: {
            id: true,
            name: true,
          },
        },
        event: {
          columns: {
            id: true,
            title: true,
          },
        },
        recipe: {
          columns: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    // Verify user is a member of the family
    const membership = await db.query.familyMembers.findFirst({
      where: and(
        eq(familyMembers.userId, dbUser.id),
        eq(familyMembers.familyId, photo.familyId)
      ),
    });

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this family' }, { status: 403 });
    }

    return NextResponse.json(photo);
  } catch (error) {
    console.error('Error fetching photo:', error);
    return NextResponse.json(
      { error: 'Failed to fetch photo' },
      { status: 500 }
    );
  }
}

// PATCH /api/photos/[id] - Update a photo
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const body = await request.json();
    const validatedData = updatePhotoSchema.parse(body);

    // Get the photo to verify ownership
    const photo = await db.query.photos.findFirst({
      where: eq(photos.id, id),
    });

    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    // Verify user is a member of the family
    const membership = await db.query.familyMembers.findFirst({
      where: and(
        eq(familyMembers.userId, dbUser.id),
        eq(familyMembers.familyId, photo.familyId)
      ),
    });

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this family' }, { status: 403 });
    }

    // Update the photo
    const [updatedPhoto] = await db
      .update(photos)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(eq(photos.id, id))
      .returning();

    return NextResponse.json(updatedPhoto);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Error updating photo:', error);
    return NextResponse.json(
      { error: 'Failed to update photo' },
      { status: 500 }
    );
  }
}

// DELETE /api/photos/[id] - Delete a photo
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    // Get the photo to verify ownership
    const photo = await db.query.photos.findFirst({
      where: eq(photos.id, id),
    });

    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    // Verify user is a member of the family
    const membership = await db.query.familyMembers.findFirst({
      where: and(
        eq(familyMembers.userId, dbUser.id),
        eq(familyMembers.familyId, photo.familyId)
      ),
    });

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this family' }, { status: 403 });
    }

    // Delete the photo
    await db.delete(photos).where(eq(photos.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting photo:', error);
    return NextResponse.json(
      { error: 'Failed to delete photo' },
      { status: 500 }
    );
  }
}
