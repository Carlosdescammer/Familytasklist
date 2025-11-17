import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { recipes, shoppingLists, shoppingItems } from '@/db/schema';
import { auth } from '@/auth';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const createShoppingListSchema = z.object({
  listName: z.string().optional(),
  eventId: z.string().optional(),
});

// POST /api/recipes/[id]/create-shopping-list - Create shopping list from recipe
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.familyId || !session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Store familyId and userId for type safety (we know they're non-null from the check above)
    const familyId = session.user.familyId!;
    const userId = session.user.id!;

    const body = await req.json();
    const data = createShoppingListSchema.parse(body);

    // Get the recipe
    const recipe = await db.query.recipes.findFirst({
      where: eq(recipes.id, params.id),
    });

    if (!recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    // Check if user has access to this recipe
    if (recipe.familyId !== familyId && !recipe.isPublic) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse ingredients
    let ingredients: string[] = [];
    try {
      ingredients = JSON.parse(recipe.ingredients);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid recipe data' }, { status: 400 });
    }

    // Create shopping list
    const listName = data.listName || `Shopping List for ${recipe.title}`;

    const [shoppingList] = await db
      .insert(shoppingLists)
      .values({
        familyId,
        name: listName,
        description: `Ingredients for ${recipe.title}`,
        eventId: data.eventId || null,
        isFamilyList: true,
        createdBy: userId,
      })
      .returning();

    // Add each ingredient as a shopping item
    const itemsToInsert = ingredients.map((ingredient) => ({
      listId: shoppingList.id,
      familyId,
      name: ingredient,
      addedBy: userId,
      completed: false,
    }));

    await db.insert(shoppingItems).values(itemsToInsert);

    // Fetch the complete shopping list with items
    const completeList = await db.query.shoppingLists.findFirst({
      where: eq(shoppingLists.id, shoppingList.id),
      with: {
        items: true,
      },
    });

    return NextResponse.json({
      success: true,
      shoppingList: completeList,
      message: `Created shopping list with ${ingredients.length} items`,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Error creating shopping list from recipe:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
