import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { shoppingItems } from '@/db/schema';
import { auth } from '@/auth';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';

const createShoppingItemSchema = z.object({
  name: z.string().min(1).max(200),
  qty: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 404 });
    }

    const items = await db.query.shoppingItems.findMany({
      where: eq(shoppingItems.familyId, session.user.familyId),
      orderBy: [desc(shoppingItems.createdAt)],
      with: {
        addedByUser: {
          columns: {
            id: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error('Error fetching shopping items:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.familyId || !session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const data = createShoppingItemSchema.parse(body);

    const [item] = await db
      .insert(shoppingItems)
      .values({
        ...data,
        familyId: session.user.familyId,
        addedBy: session.user.id,
      })
      .returning();

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Error creating shopping item:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
