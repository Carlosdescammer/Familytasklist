import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { recipes, recipeRatings, recipeComments, users } from '@/db/schema';
import { auth } from '@/lib/auth-helpers';
import { eq, and, or, sql, ne } from 'drizzle-orm';
import { z } from 'zod';
import { createNotifications } from '@/lib/notifications';

const createRecipeSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  ingredients: z.array(z.string()).min(1), // Array of ingredients with measurements
  instructions: z.array(z.string()), // Array of step-by-step instructions (can be empty for AI recipes)
  cookingTime: z.string().optional(),
  prepTime: z.string().optional(),
  servings: z.string().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  category: z.string().optional(),
  cuisine: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  source: z.enum(['user', 'ai']).default('user'),
  isPublic: z.boolean().default(false),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

// GET /api/recipes - Get all recipes for the user's family
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.familyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter'); // 'all', 'my-recipes', 'favorites', 'public'
    const source = searchParams.get('source'); // 'user', 'ai'
    const category = searchParams.get('category');

    // Build query conditions
    const conditions = [];

    // Base condition: recipes from user's family OR public recipes shared with them
    conditions.push(
      or(
        eq(recipes.familyId, session.user.familyId),
        and(
          eq(recipes.isPublic, true),
          sql`${recipes.sharedWithFamilies}::jsonb ? ${session.user.familyId}`
        )
      )!
    );

    // Apply filters
    if (filter === 'my-recipes') {
      conditions.push(eq(recipes.createdBy, session.user.id));
    } else if (filter === 'favorites') {
      conditions.push(
        or(
          eq(recipes.isFavorite, true),
          sql`${recipes.favoriteByUsers}::jsonb ? ${session.user.id}`
        )!
      );
    } else if (filter === 'public') {
      conditions.push(eq(recipes.isPublic, true));
    }

    if (source) {
      conditions.push(eq(recipes.source, source as 'user' | 'ai'));
    }

    if (category) {
      conditions.push(eq(recipes.category, category));
    }

    const allRecipes = await db.query.recipes.findMany({
      where: and(...conditions),
      orderBy: (recipes, { desc }) => [desc(recipes.createdAt)],
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

    // Fetch rating and comment counts for each recipe
    const recipesWithCounts = await Promise.all(
      allRecipes.map(async (recipe) => {
        const [ratingCount] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(recipeRatings)
          .where(eq(recipeRatings.recipeId, recipe.id));

        const [commentCount] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(recipeComments)
          .where(eq(recipeComments.recipeId, recipe.id));

        return {
          ...recipe,
          ratingCount: ratingCount?.count || 0,
          commentCount: commentCount?.count || 0,
        };
      })
    );

    return NextResponse.json(recipesWithCounts);
  } catch (error) {
    console.error('Error fetching recipes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/recipes - Create a new recipe
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.familyId || !session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const data = createRecipeSchema.parse(body);

    const [recipe] = await db
      .insert(recipes)
      .values({
        familyId: session.user.familyId,
        createdBy: session.user.id,
        title: data.title,
        description: data.description,
        ingredients: JSON.stringify(data.ingredients),
        instructions: JSON.stringify(data.instructions),
        cookingTime: data.cookingTime,
        prepTime: data.prepTime,
        servings: data.servings,
        difficulty: data.difficulty,
        category: data.category,
        cuisine: data.cuisine,
        imageUrl: data.imageUrl,
        source: data.source,
        isPublic: data.isPublic,
        tags: data.tags ? JSON.stringify(data.tags) : null,
        notes: data.notes,
      })
      .returning();

    // Send notifications to family members if recipe is shared (public or has source)
    try {
      // Notify family members about new recipe
      const familyMembers = await db.query.users.findMany({
        where: and(
          eq(users.familyId, session.user.familyId),
          ne(users.id, session.user.id)
        ),
      });

      if (familyMembers.length > 0) {
        const creatorName = session.user.name || session.user.email || 'Someone';
        const recipeType = data.source === 'ai' ? ' (AI-generated)' : '';

        const notificationsList = familyMembers.map((member) => ({
          familyId: session.user.familyId!,
          userId: member.id,
          type: 'recipe_shared' as const,
          title: `New Recipe: ${data.title}`,
          message: `${creatorName} shared a new recipe "${data.title}"${recipeType} with the family`,
        }));

        await createNotifications(notificationsList);

        console.log(`Sent recipe shared notifications to ${familyMembers.length} family member(s) for recipe: ${data.title}`);
      }
    } catch (error) {
      console.error('Error sending recipe shared notifications:', error);
      // Don't fail the request if notification fails
    }

    return NextResponse.json(recipe, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Error creating recipe:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
