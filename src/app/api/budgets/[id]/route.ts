import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { budgets } from '@/db/schema';
import { auth } from '@/lib/auth-helpers';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const budgetUpdateSchema = z.object({
  totalBudget: z.number().positive('Total budget must be positive').optional(),
  savingsGoal: z.number().nonnegative('Savings goal must be non-negative').optional(),
  notes: z.string().optional(),
});

// GET /api/budgets/[id] - Get a specific budget
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.familyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const budget = await db.query.budgets.findFirst({
      where: and(
        eq(budgets.id, params.id),
        eq(budgets.familyId, session.user.familyId)
      ),
    });

    if (!budget) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 });
    }

    return NextResponse.json(budget);
  } catch (error) {
    console.error('Error fetching budget:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/budgets/[id] - Update a budget
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.familyId || session.user.role !== 'parent') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = budgetUpdateSchema.parse(body);

    // Verify budget exists and belongs to family
    const existingBudget = await db.query.budgets.findFirst({
      where: and(
        eq(budgets.id, params.id),
        eq(budgets.familyId, session.user.familyId)
      ),
    });

    if (!existingBudget) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 });
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (validatedData.totalBudget !== undefined) {
      updateData.totalBudget = validatedData.totalBudget.toString();
    }
    if (validatedData.savingsGoal !== undefined) {
      updateData.savingsGoal = validatedData.savingsGoal.toString();
    }
    if (validatedData.notes !== undefined) {
      updateData.notes = validatedData.notes;
    }

    const [updatedBudget] = await db
      .update(budgets)
      .set(updateData)
      .where(
        and(
          eq(budgets.id, params.id),
          eq(budgets.familyId, session.user.familyId)
        )
      )
      .returning();

    return NextResponse.json(updatedBudget);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', issues: error.issues },
        { status: 400 }
      );
    }
    console.error('Error updating budget:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/budgets/[id] - Delete a budget
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.familyId || session.user.role !== 'parent') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify budget exists and belongs to family
    const existingBudget = await db.query.budgets.findFirst({
      where: and(
        eq(budgets.id, params.id),
        eq(budgets.familyId, session.user.familyId)
      ),
    });

    if (!existingBudget) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 });
    }

    await db
      .delete(budgets)
      .where(
        and(
          eq(budgets.id, params.id),
          eq(budgets.familyId, session.user.familyId)
        )
      );

    return NextResponse.json({ message: 'Budget deleted successfully' });
  } catch (error) {
    console.error('Error deleting budget:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
