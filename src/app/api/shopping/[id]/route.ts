import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { shoppingItems } from '@/db/schema';
import { auth } from '@/lib/auth-helpers';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const updateShoppingItemSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  qty: z.string().optional(),
  completed: z.boolean().optional(),
});

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.familyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const data = updateShoppingItemSchema.parse(body);

    const [updatedItem] = await db
      .update(shoppingItems)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(shoppingItems.id, params.id), eq(shoppingItems.familyId, session.user.familyId)))
      .returning();

    if (!updatedItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json(updatedItem);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Error updating shopping item:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.familyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [deletedItem] = await db
      .delete(shoppingItems)
      .where(and(eq(shoppingItems.id, params.id), eq(shoppingItems.familyId, session.user.familyId)))
      .returning();

    if (!deletedItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Error deleting shopping item:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
