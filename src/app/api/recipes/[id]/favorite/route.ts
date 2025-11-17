import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { recipes } from '@/db/schema';
import { auth } from '@/lib/auth-helpers';
import { eq, and, sql } from 'drizzle-orm';

// POST /api/recipes/[id]/favorite - Toggle favorite status for a recipe
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.familyId || !session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the recipe
    const recipe = await db.query.recipes.findFirst({
      where: eq(recipes.id, params.id),
    });

    if (!recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    // Check if user has access to this recipe
    if (recipe.familyId !== session.user.familyId && !recipe.isPublic) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse existing favorite users
    let favoriteByUsers: string[] = [];
    if (recipe.favoriteByUsers) {
      try {
        favoriteByUsers = JSON.parse(recipe.favoriteByUsers);
      } catch (e) {
        favoriteByUsers = [];
      }
    }

    // Toggle favorite status
    let newIsFavorite = recipe.isFavorite;
    const userIndex = favoriteByUsers.indexOf(session.user.id);

    if (userIndex > -1) {
      // User already favorited, remove from favorites
      favoriteByUsers.splice(userIndex, 1);
      // If this is the creator, also toggle isFavorite
      if (recipe.createdBy === session.user.id) {
        newIsFavorite = false;
      }
    } else {
      // Add to favorites
      favoriteByUsers.push(session.user.id);
      // If this is the creator, also toggle isFavorite
      if (recipe.createdBy === session.user.id) {
        newIsFavorite = true;
      }
    }

    // Update the recipe
    const [updatedRecipe] = await db
      .update(recipes)
      .set({
        isFavorite: newIsFavorite,
        favoriteByUsers: JSON.stringify(favoriteByUsers),
        updatedAt: new Date(),
      })
      .where(eq(recipes.id, params.id))
      .returning();

    return NextResponse.json({
      success: true,
      isFavorited: userIndex === -1, // True if we just added it
      recipe: updatedRecipe,
    });
  } catch (error) {
    console.error('Error toggling favorite:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
