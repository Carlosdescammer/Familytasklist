import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { forumCategories } from '@/db/schema';
import { asc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

// GET - Fetch all forum categories
export async function GET(req: NextRequest) {
  try {
    const categories = await db.query.forumCategories.findMany({
      where: (categories, { eq }) => eq(categories.isActive, true),
      orderBy: [asc(forumCategories.order), asc(forumCategories.name)],
    });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Error fetching forum categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

// POST - Create a new forum category (admin only)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, icon, slug, order } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Name and slug are required' },
        { status: 400 }
      );
    }

    const newCategory = await db
      .insert(forumCategories)
      .values({
        name,
        description,
        icon,
        slug,
        order: order || 0,
        isActive: true,
      })
      .returning();

    const category = Array.isArray(newCategory) ? newCategory[0] : newCategory;

    return NextResponse.json(
      { category, message: 'Category created successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating forum category:', error);
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    );
  }
}
