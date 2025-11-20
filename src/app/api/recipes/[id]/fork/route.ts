import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { recipes, recipeCategoryAssociations } from '@/db/schema';
import { auth } from '@/lib/auth-helpers';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

// POST /api/recipes/[id]/fork - Fork/copy a public recipe to your family
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.familyId || !session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the original recipe
    const originalRecipe = await db.query.recipes.findFirst({
      where: eq(recipes.id, params.id),
      with: {
        categoryAssociations: {
          with: {
            category: true,
          },
        },
      },
    });

    if (!originalRecipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    // Only allow forking public recipes or recipes you don't already own
    if (!originalRecipe.isPublic && originalRecipe.familyId !== session.user.familyId) {
      return NextResponse.json({ error: 'You can only fork public recipes' }, { status: 403 });
    }

    // Don't fork your own recipes
    if (originalRecipe.familyId === session.user.familyId) {
      return NextResponse.json({ error: 'You already own this recipe' }, { status: 400 });
    }

    // Create a copy of the recipe
    const [forkedRecipe] = await db
      .insert(recipes)
      .values({
        familyId: session.user.familyId,
        createdBy: session.user.id,
        title: `${originalRecipe.title} (Forked)`,
        description: originalRecipe.description,
        ingredients: originalRecipe.ingredients,
        instructions: originalRecipe.instructions,
        cookingTime: originalRecipe.cookingTime,
        prepTime: originalRecipe.prepTime,
        servings: originalRecipe.servings,
        difficulty: originalRecipe.difficulty,
        category: originalRecipe.category,
        cuisine: originalRecipe.cuisine,
        imageUrl: originalRecipe.imageUrl,
        source: 'user', // Forked recipes are user-created
        isPublic: false, // Forked recipes start as private
        isFavorite: false,
        tags: originalRecipe.tags,
        notes: originalRecipe.notes ? `Forked from a community recipe.\n\n${originalRecipe.notes}` : 'Forked from a community recipe.',
        nutritionInfo: originalRecipe.nutritionInfo,
      })
      .returning();

    // Copy category associations
    if (originalRecipe.categoryAssociations && originalRecipe.categoryAssociations.length > 0) {
      const categoryInserts = originalRecipe.categoryAssociations.map((assoc) => ({
        recipeId: forkedRecipe.id,
        categoryId: assoc.categoryId,
      }));

      await db.insert(recipeCategoryAssociations).values(categoryInserts);
    }

    return NextResponse.json({
      success: true,
      recipe: forkedRecipe,
      message: 'Recipe forked successfully! You can now edit and customize it.',
    });
  } catch (error) {
    console.error('Error forking recipe:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
