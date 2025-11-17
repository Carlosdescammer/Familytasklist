import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { recipes } from '@/db/schema';
import { auth } from '@/auth';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const updateRecipeSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  ingredients: z.array(z.string()).min(1).optional(),
  instructions: z.array(z.string()).min(1).optional(),
  cookingTime: z.string().optional(),
  prepTime: z.string().optional(),
  servings: z.string().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  category: z.string().optional(),
  cuisine: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  isPublic: z.boolean().optional(),
  isFavorite: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

// GET /api/recipes/[id] - Get a single recipe
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.familyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const recipe = await db.query.recipes.findFirst({
      where: eq(recipes.id, params.id),
      with: {
        creator: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    // Check if user has access (own family or public/shared recipe)
    if (recipe.familyId !== session.user.familyId && !recipe.isPublic) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(recipe);
  } catch (error) {
    console.error('Error fetching recipe:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/recipes/[id] - Update a recipe
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.familyId || !session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const data = updateRecipeSchema.parse(body);

    // Check if recipe exists and user has permission to update
    const existingRecipe = await db.query.recipes.findFirst({
      where: and(eq(recipes.id, params.id), eq(recipes.familyId, session.user.familyId)),
    });

    if (!existingRecipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.ingredients !== undefined) updateData.ingredients = JSON.stringify(data.ingredients);
    if (data.instructions !== undefined) updateData.instructions = JSON.stringify(data.instructions);
    if (data.cookingTime !== undefined) updateData.cookingTime = data.cookingTime;
    if (data.prepTime !== undefined) updateData.prepTime = data.prepTime;
    if (data.servings !== undefined) updateData.servings = data.servings;
    if (data.difficulty !== undefined) updateData.difficulty = data.difficulty;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.cuisine !== undefined) updateData.cuisine = data.cuisine;
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
    if (data.isPublic !== undefined) updateData.isPublic = data.isPublic;
    if (data.isFavorite !== undefined) updateData.isFavorite = data.isFavorite;
    if (data.tags !== undefined) updateData.tags = JSON.stringify(data.tags);
    if (data.notes !== undefined) updateData.notes = data.notes;

    const [updatedRecipe] = await db
      .update(recipes)
      .set(updateData)
      .where(and(eq(recipes.id, params.id), eq(recipes.familyId, session.user.familyId)))
      .returning();

    if (!updatedRecipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    return NextResponse.json(updatedRecipe);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Error updating recipe:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/recipes/[id] - Delete a recipe
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.familyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [deletedRecipe] = await db
      .delete(recipes)
      .where(and(eq(recipes.id, params.id), eq(recipes.familyId, session.user.familyId)))
      .returning();

    if (!deletedRecipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Recipe deleted successfully' });
  } catch (error) {
    console.error('Error deleting recipe:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
