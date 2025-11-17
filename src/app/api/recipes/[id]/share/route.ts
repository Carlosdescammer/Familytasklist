import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { recipes, families } from '@/db/schema';
import { auth } from '@/auth';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const shareRecipeSchema = z.object({
  familyIds: z.array(z.string()).optional(),
  makePublic: z.boolean().optional(),
});

// POST /api/recipes/[id]/share - Share recipe with other families or make public
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.familyId || !session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const data = shareRecipeSchema.parse(body);

    // Get the recipe
    const recipe = await db.query.recipes.findFirst({
      where: eq(recipes.id, params.id),
    });

    if (!recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    // Only the owner can share their recipe
    if (recipe.createdBy !== session.user.id && recipe.familyId !== session.user.familyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse existing shared families
    let sharedWithFamilies: string[] = [];
    if (recipe.sharedWithFamilies) {
      try {
        sharedWithFamilies = JSON.parse(recipe.sharedWithFamilies);
      } catch (e) {
        sharedWithFamilies = [];
      }
    }

    // Update shared families if provided
    if (data.familyIds) {
      // Add new families to the shared list (avoid duplicates)
      for (const familyId of data.familyIds) {
        if (!sharedWithFamilies.includes(familyId) && familyId !== recipe.familyId) {
          sharedWithFamilies.push(familyId);
        }
      }
    }

    // Prepare update
    const updateData: any = {
      sharedWithFamilies: JSON.stringify(sharedWithFamilies),
      updatedAt: new Date(),
    };

    if (data.makePublic !== undefined) {
      updateData.isPublic = data.makePublic;
    }

    // Update the recipe
    const [updatedRecipe] = await db
      .update(recipes)
      .set(updateData)
      .where(eq(recipes.id, params.id))
      .returning();

    return NextResponse.json({
      success: true,
      recipe: updatedRecipe,
      message: data.makePublic ? 'Recipe is now public' : 'Recipe shared successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Error sharing recipe:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/recipes/[id]/share - Unshare recipe (make private)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
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

    // Only the owner can unshare their recipe
    if (recipe.createdBy !== session.user.id && recipe.familyId !== session.user.familyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Make recipe private and clear shared families
    const [updatedRecipe] = await db
      .update(recipes)
      .set({
        isPublic: false,
        sharedWithFamilies: JSON.stringify([]),
        updatedAt: new Date(),
      })
      .where(eq(recipes.id, params.id))
      .returning();

    return NextResponse.json({
      success: true,
      recipe: updatedRecipe,
      message: 'Recipe is now private',
    });
  } catch (error) {
    console.error('Error unsharing recipe:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
