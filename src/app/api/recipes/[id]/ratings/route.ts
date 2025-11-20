import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { recipeRatings, recipes } from '@/db/schema';
import { auth } from '@/lib/auth-helpers';
import { eq, and, sql } from 'drizzle-orm';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const ratingSchema = z.object({
  rating: z.number().min(1).max(5),
});

// GET /api/recipes/[id]/ratings - Get ratings for a recipe
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.familyId || !session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all ratings for this recipe with user info
    const ratings = await db.query.recipeRatings.findMany({
      where: eq(recipeRatings.recipeId, params.id),
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: (recipeRatings, { desc }) => [desc(recipeRatings.createdAt)],
    });

    // Calculate average rating
    const avgResult = await db
      .select({
        avg: sql<number>`AVG(${recipeRatings.rating})::numeric(3,2)`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(recipeRatings)
      .where(eq(recipeRatings.recipeId, params.id));

    const average = avgResult[0]?.avg ? parseFloat(avgResult[0].avg.toString()) : 0;
    const count = avgResult[0]?.count || 0;

    return NextResponse.json({
      ratings,
      average,
      count,
    });
  } catch (error) {
    console.error('Error fetching recipe ratings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/recipes/[id]/ratings - Add or update a rating
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.familyId || !session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const data = ratingSchema.parse(body);

    // Check if recipe exists and is public
    const recipe = await db.query.recipes.findFirst({
      where: eq(recipes.id, params.id),
    });

    if (!recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    if (!recipe.isPublic && recipe.familyId !== session.user.familyId) {
      return NextResponse.json({ error: 'You can only rate public recipes or your own recipes' }, { status: 403 });
    }

    // Check if user already rated this recipe
    const existingRating = await db.query.recipeRatings.findFirst({
      where: and(
        eq(recipeRatings.recipeId, params.id),
        eq(recipeRatings.userId, session.user.id)
      ),
    });

    if (existingRating) {
      // Update existing rating
      const [updated] = await db
        .update(recipeRatings)
        .set({
          rating: data.rating,
          updatedAt: new Date(),
        })
        .where(eq(recipeRatings.id, existingRating.id))
        .returning();

      return NextResponse.json({
        success: true,
        rating: updated,
        message: 'Rating updated',
      });
    } else {
      // Create new rating
      const [newRating] = await db
        .insert(recipeRatings)
        .values({
          recipeId: params.id,
          userId: session.user.id,
          familyId: session.user.familyId,
          rating: data.rating,
        })
        .returning();

      return NextResponse.json({
        success: true,
        rating: newRating,
        message: 'Rating added',
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Error adding recipe rating:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
