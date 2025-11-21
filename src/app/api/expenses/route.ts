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

    // Check budget and send alerts if needed
    try {
      const { createNotification, NotificationTemplates } = await import('@/lib/notifications');
      const { budgets, users } = await import('@/db/schema');

      const expenseMonth = new Date(validatedData.expenseDate).toISOString().slice(0, 7); // Format: YYYY-MM

      // Get budget for this month
      const monthBudget = await db.query.budgets.findFirst({
        where: and(
          eq(budgets.familyId, session.user.familyId),
          eq(budgets.month, expenseMonth)
        ),
      });

      if (monthBudget && monthBudget.totalBudget) {
        // Calculate total spending for this month
        const monthStart = new Date(`${expenseMonth}-01`);
        const monthEnd = new Date(monthStart);
        monthEnd.setMonth(monthEnd.getMonth() + 1);

        const totalSpending = await db
          .select({
            total: sql<number>`COALESCE(SUM(${expenses.amount}::numeric), 0)::numeric(10,2)`,
          })
          .from(expenses)
          .where(
            and(
              eq(expenses.familyId, session.user.familyId),
              gte(expenses.expenseDate, monthStart),
              lte(expenses.expenseDate, monthEnd)
            )
          );

        const totalSpent = parseFloat(totalSpending[0]?.total?.toString() || '0');
        const budgetLimit = parseFloat(monthBudget.totalBudget.toString());
        const percentageUsed = (totalSpent / budgetLimit) * 100;

        // Get all parents to notify
        const familyMembers = await db.query.users.findMany({
          where: eq(users.familyId, session.user.familyId),
        });
        const parents = familyMembers.filter(member => member.role === 'parent');

        // Send budget limit reached notification (100%+)
        if (percentageUsed >= 100) {
          const notificationTemplate = NotificationTemplates.budgetLimitReached(
            validatedData.category
          );

          for (const parent of parents) {
            await createNotification({
              familyId: session.user.familyId,
              userId: parent.id,
              type: 'budget_limit_reached',
              title: notificationTemplate.title,
              message: notificationTemplate.message,
            });
          }

          console.log(`Budget limit reached notification sent to ${parents.length} parent(s)`);
        }
        // Send budget alert notification (80%+)
        else if (percentageUsed >= 80) {
          const notificationTemplate = NotificationTemplates.budgetAlert(
            validatedData.category,
            Math.round(percentageUsed)
          );

          for (const parent of parents) {
            await createNotification({
              familyId: session.user.familyId,
              userId: parent.id,
              type: 'budget_alert',
              title: notificationTemplate.title,
              message: notificationTemplate.message,
            });
          }

          console.log(`Budget alert notification sent to ${parents.length} parent(s) - ${Math.round(percentageUsed)}% used`);
        }
      }
    } catch (budgetError) {
      console.error('Error checking budget alerts:', budgetError);
      // Don't fail the expense creation if budget alerts fail
    }

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
