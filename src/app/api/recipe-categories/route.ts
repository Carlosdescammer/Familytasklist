import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { recipeCategories } from '@/db/schema';
import { auth } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

// GET /api/recipe-categories - Get all recipe categories
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const categories = await db.query.recipeCategories.findMany({
      orderBy: (recipeCategories, { asc }) => [asc(recipeCategories.name)],
    });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Error fetching recipe categories:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
