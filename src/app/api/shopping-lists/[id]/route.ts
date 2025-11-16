import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { shoppingLists } from '@/db/schema';
import { auth } from '@/auth';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const updateShoppingListSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  eventId: z.string().uuid().optional().nullable(),
  members: z.string().optional(),
  isFamilyList: z.boolean().optional(),
});

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.familyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const list = await db.query.shoppingLists.findFirst({
      where: and(eq(shoppingLists.id, params.id), eq(shoppingLists.familyId, session.user.familyId)),
      with: {
        creator: {
          columns: {
            id: true,
            email: true,
            name: true,
          },
        },
        items: {
          orderBy: (items, { desc }) => [desc(items.createdAt)],
          with: {
            addedByUser: {
              columns: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
        event: {
          columns: {
            id: true,
            title: true,
            startTime: true,
            endTime: true,
          },
        },
      },
    });

    if (!list) {
      return NextResponse.json({ error: 'Shopping list not found' }, { status: 404 });
    }

    return NextResponse.json(list);
  } catch (error) {
    console.error('Error fetching shopping list:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.familyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const data = updateShoppingListSchema.parse(body);

    const updateData: any = { ...data, updatedAt: new Date() };

    const [updatedList] = await db
      .update(shoppingLists)
      .set(updateData)
      .where(and(eq(shoppingLists.id, params.id), eq(shoppingLists.familyId, session.user.familyId)))
      .returning();

    if (!updatedList) {
      return NextResponse.json({ error: 'Shopping list not found' }, { status: 404 });
    }

    return NextResponse.json(updatedList);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Error updating shopping list:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.familyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [deletedList] = await db
      .delete(shoppingLists)
      .where(and(eq(shoppingLists.id, params.id), eq(shoppingLists.familyId, session.user.familyId)))
      .returning();

    if (!deletedList) {
      return NextResponse.json({ error: 'Shopping list not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Shopping list deleted successfully' });
  } catch (error) {
    console.error('Error deleting shopping list:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
