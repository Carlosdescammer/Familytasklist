import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { photos, familyMembers } from '@/db/schema';
import { and, eq, desc } from 'drizzle-orm';
import { z } from 'zod';

const createPhotoSchema = z.object({
  familyId: z.string().uuid(),
  url: z.string().url(),
  fileName: z.string(),
  fileSize: z.number().optional(),
  caption: z.string().optional(),
  description: z.string().optional(),
  tags: z.string().optional(),
  eventId: z.string().uuid().optional(),
  recipeId: z.string().uuid().optional(),
  isFavorite: z.boolean().optional().default(false),
});

// GET /api/photos?familyId=xxx - Get all photos for a family
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const familyId = searchParams.get('familyId');

    if (!familyId) {
      return NextResponse.json({ error: 'Family ID is required' }, { status: 400 });
    }

    // Verify user is a member of the family
    const membership = await db.query.familyMembers.findFirst({
      where: and(
        eq(familyMembers.userId, userId),
        eq(familyMembers.familyId, familyId)
      ),
    });

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this family' }, { status: 403 });
    }

    // Get all photos for the family
    const familyPhotos = await db.query.photos.findMany({
      where: eq(photos.familyId, familyId),
      orderBy: [desc(photos.createdAt)],
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

    return NextResponse.json(familyPhotos);
  } catch (error) {
    console.error('Error fetching photos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch photos' },
      { status: 500 }
    );
  }
}

// POST /api/photos - Create a new photo
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createPhotoSchema.parse(body);

    // Verify user is a member of the family
    const membership = await db.query.familyMembers.findFirst({
      where: and(
        eq(familyMembers.userId, userId),
        eq(familyMembers.familyId, validatedData.familyId)
      ),
    });

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this family' }, { status: 403 });
    }

    // Create the photo
    const [newPhoto] = await db
      .insert(photos)
      .values({
        ...validatedData,
        uploadedBy: userId,
      })
      .returning();

    return NextResponse.json(newPhoto, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Error creating photo:', error);
    return NextResponse.json(
      { error: 'Failed to create photo' },
      { status: 500 }
    );
  }
}
