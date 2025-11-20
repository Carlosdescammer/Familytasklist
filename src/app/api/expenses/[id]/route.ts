import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { expenses } from '@/db/schema';
import { auth } from '@/lib/auth-helpers';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const expenseUpdateSchema = z.object({
  category: z.string().min(1, 'Category is required').optional(),
  amount: z.number().positive('Amount must be positive').optional(),
  description: z.string().min(1, 'Description is required').optional(),
  expenseDate: z.string().datetime('Invalid date format').optional(),
  receiptUrl: z.string().url().optional().or(z.literal('')),
  notes: z.string().optional(),
});

// GET /api/expenses/[id] - Get a specific expense
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.familyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const expense = await db.query.expenses.findFirst({
      where: and(
        eq(expenses.id, params.id),
        eq(expenses.familyId, session.user.familyId)
      ),
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    return NextResponse.json(expense);
  } catch (error) {
    console.error('Error fetching expense:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/expenses/[id] - Update an expense
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.familyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = expenseUpdateSchema.parse(body);

    // Verify expense exists and belongs to family
    const existingExpense = await db.query.expenses.findFirst({
      where: and(
        eq(expenses.id, params.id),
        eq(expenses.familyId, session.user.familyId)
      ),
    });

    if (!existingExpense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    // Only parents or the expense creator can update
    if (session.user.role !== 'parent' && existingExpense.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (validatedData.category !== undefined) {
      updateData.category = validatedData.category;
    }
    if (validatedData.amount !== undefined) {
      updateData.amount = validatedData.amount.toString();
    }
    if (validatedData.description !== undefined) {
      updateData.description = validatedData.description;
    }
    if (validatedData.expenseDate !== undefined) {
      updateData.expenseDate = new Date(validatedData.expenseDate);
    }
    if (validatedData.receiptUrl !== undefined) {
      updateData.receiptUrl = validatedData.receiptUrl || null;
    }
    if (validatedData.notes !== undefined) {
      updateData.notes = validatedData.notes;
    }

    const [updatedExpense] = await db
      .update(expenses)
      .set(updateData)
      .where(
        and(
          eq(expenses.id, params.id),
          eq(expenses.familyId, session.user.familyId)
        )
      )
      .returning();

    // Fetch with user relation
    const expenseWithUser = await db.query.expenses.findFirst({
      where: eq(expenses.id, updatedExpense.id),
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(expenseWithUser);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', issues: error.issues },
        { status: 400 }
      );
    }
    console.error('Error updating expense:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/expenses/[id] - Delete an expense
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.familyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify expense exists and belongs to family
    const existingExpense = await db.query.expenses.findFirst({
      where: and(
        eq(expenses.id, params.id),
        eq(expenses.familyId, session.user.familyId)
      ),
    });

    if (!existingExpense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    // Only parents or the expense creator can delete
    if (session.user.role !== 'parent' && existingExpense.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db
      .delete(expenses)
      .where(
        and(
          eq(expenses.id, params.id),
          eq(expenses.familyId, session.user.familyId)
        )
      );

    return NextResponse.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Error deleting expense:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
