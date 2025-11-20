import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { expenses } from '@/db/schema';
import { auth } from '@/lib/auth-helpers';
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const expenseSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  amount: z.number().positive('Amount must be positive'),
  description: z.string().min(1, 'Description is required'),
  expenseDate: z.string().datetime('Invalid date format'),
  receiptUrl: z.string().url().optional().or(z.literal('')),
  notes: z.string().optional(),
});

// GET /api/expenses - Get expenses for the current family with optional filters
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.familyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // Format: YYYY-MM
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '100');

    let conditions = [eq(expenses.familyId, session.user.familyId)];

    // Filter by month if provided
    if (month) {
      const startDate = new Date(`${month}-01`);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);

      conditions.push(
        gte(expenses.expenseDate, startDate),
        lte(expenses.expenseDate, endDate)
      );
    }

    // Filter by category if provided
    if (category) {
      conditions.push(eq(expenses.category, category));
    }

    const familyExpenses = await db.query.expenses.findMany({
      where: and(...conditions),
      orderBy: [desc(expenses.expenseDate)],
      limit,
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

    return NextResponse.json(familyExpenses);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/expenses - Create a new expense
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.familyId || !session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = expenseSchema.parse(body);

    const [newExpense] = await db
      .insert(expenses)
      .values({
        familyId: session.user.familyId,
        userId: session.user.id,
        category: validatedData.category,
        amount: validatedData.amount.toString(),
        description: validatedData.description,
        expenseDate: new Date(validatedData.expenseDate),
        receiptUrl: validatedData.receiptUrl || null,
        notes: validatedData.notes,
        updatedAt: new Date(),
      })
      .returning();

    // Fetch the expense with user relation
    const expenseWithUser = await db.query.expenses.findFirst({
      where: eq(expenses.id, newExpense.id),
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

    return NextResponse.json(expenseWithUser, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', issues: error.issues },
        { status: 400 }
      );
    }
    console.error('Error creating expense:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
