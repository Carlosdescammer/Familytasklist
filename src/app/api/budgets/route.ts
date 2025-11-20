import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { budgets } from '@/db/schema';
import { auth } from '@/lib/auth-helpers';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const budgetSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
  totalBudget: z.number().positive('Total budget must be positive'),
  savingsGoal: z.number().nonnegative('Savings goal must be non-negative').default(0),
  notes: z.string().optional(),
});

// GET /api/budgets - Get all budgets for the current family
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.familyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyBudgets = await db.query.budgets.findMany({
      where: eq(budgets.familyId, session.user.familyId),
      orderBy: [desc(budgets.month)],
    });

    return NextResponse.json(familyBudgets);
  } catch (error) {
    console.error('Error fetching budgets:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/budgets - Create a new budget
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.familyId || session.user.role !== 'parent') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = budgetSchema.parse(body);

    // Check if budget already exists for this month
    const existingBudget = await db.query.budgets.findFirst({
      where: and(
        eq(budgets.familyId, session.user.familyId),
        eq(budgets.month, validatedData.month)
      ),
    });

    if (existingBudget) {
      return NextResponse.json(
        { error: 'Budget already exists for this month' },
        { status: 400 }
      );
    }

    const [newBudget] = await db
      .insert(budgets)
      .values({
        familyId: session.user.familyId,
        month: validatedData.month,
        totalBudget: validatedData.totalBudget.toString(),
        savingsGoal: validatedData.savingsGoal.toString(),
        notes: validatedData.notes,
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json(newBudget, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', issues: error.issues },
        { status: 400 }
      );
    }
    console.error('Error creating budget:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
