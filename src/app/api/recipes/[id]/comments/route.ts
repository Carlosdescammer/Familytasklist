import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { recipeComments, recipes } from '@/db/schema';
import { auth } from '@/lib/auth-helpers';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const commentSchema = z.object({
  comment: z.string().min(1).max(1000),
});

// GET /api/recipes/[id]/comments - Get comments for a recipe
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.familyId || !session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all comments for this recipe with user info
    const comments = await db.query.recipeComments.findMany({
      where: eq(recipeComments.recipeId, params.id),
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: (recipeComments, { desc }) => [desc(recipeComments.createdAt)],
    });

    return NextResponse.json({ comments });
  } catch (error) {
    console.error('Error fetching recipe comments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/recipes/[id]/comments - Add a comment
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.familyId || !session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const data = commentSchema.parse(body);

    // Check if recipe exists and is public
    const recipe = await db.query.recipes.findFirst({
      where: eq(recipes.id, params.id),
    });

    if (!recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    if (!recipe.isPublic && recipe.familyId !== session.user.familyId) {
      return NextResponse.json({ error: 'You can only comment on public recipes or your own recipes' }, { status: 403 });
    }

    // Create new comment
    const [newComment] = await db
      .insert(recipeComments)
      .values({
        recipeId: params.id,
        userId: session.user.id,
        familyId: session.user.familyId,
        comment: data.comment,
      })
      .returning();

    // Fetch the comment with user info
    const commentWithUser = await db.query.recipeComments.findFirst({
      where: eq(recipeComments.id, newComment.id),
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      comment: commentWithUser,
      message: 'Comment added',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Error adding recipe comment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
