import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { budgets, expenses } from '@/db/schema';
import { auth } from '@/lib/auth-helpers';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

// GET /api/budget-stats - Get budget statistics for a specific month
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.familyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // Format: YYYY-MM

    if (!month) {
      return NextResponse.json({ error: 'Month parameter is required' }, { status: 400 });
    }

    // Get budget for the month
    const budget = await db.query.budgets.findFirst({
      where: and(
        eq(budgets.familyId, session.user.familyId),
        eq(budgets.month, month)
      ),
    });

    // Calculate date range for the month
    const startDate = new Date(`${month}-01`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    // Get total expenses for the month
    const expenseStats = await db
      .select({
        totalSpent: sql<number>`COALESCE(SUM(${expenses.amount}), 0)::numeric(10,2)`,
        expenseCount: sql<number>`COUNT(*)::int`,
      })
      .from(expenses)
      .where(
        and(
          eq(expenses.familyId, session.user.familyId),
          gte(expenses.expenseDate, startDate),
          lte(expenses.expenseDate, endDate)
        )
      );

    // Get expenses by category
    const categoryBreakdown = await db
      .select({
        category: expenses.category,
        total: sql<number>`COALESCE(SUM(${expenses.amount}), 0)::numeric(10,2)`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(expenses)
      .where(
        and(
          eq(expenses.familyId, session.user.familyId),
          gte(expenses.expenseDate, startDate),
          lte(expenses.expenseDate, endDate)
        )
      )
      .groupBy(expenses.category)
      .orderBy(sql`SUM(${expenses.amount}) DESC`);

    // Get daily spending for the month (for charts)
    const dailySpending = await db
      .select({
        date: sql<string>`DATE(${expenses.expenseDate})`,
        total: sql<number>`COALESCE(SUM(${expenses.amount}), 0)::numeric(10,2)`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(expenses)
      .where(
        and(
          eq(expenses.familyId, session.user.familyId),
          gte(expenses.expenseDate, startDate),
          lte(expenses.expenseDate, endDate)
        )
      )
      .groupBy(sql`DATE(${expenses.expenseDate})`)
      .orderBy(sql`DATE(${expenses.expenseDate}) ASC`);

    // Get top spenders for the month
    const topSpenders = await db
      .select({
        userId: expenses.userId,
        userName: sql<string>`users.name`,
        total: sql<number>`COALESCE(SUM(${expenses.amount}), 0)::numeric(10,2)`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(expenses)
      .leftJoin(sql`users`, sql`users.id = ${expenses.userId}`)
      .where(
        and(
          eq(expenses.familyId, session.user.familyId),
          gte(expenses.expenseDate, startDate),
          lte(expenses.expenseDate, endDate)
        )
      )
      .groupBy(expenses.userId, sql`users.name`)
      .orderBy(sql`SUM(${expenses.amount}) DESC`)
      .limit(5);

    const totalSpent = parseFloat(expenseStats[0]?.totalSpent?.toString() || '0');
    const totalBudget = budget ? parseFloat(budget.totalBudget) : 0;
    const savingsGoal = budget ? parseFloat(budget.savingsGoal) : 0;

    const remaining = totalBudget - totalSpent;
    const percentUsed = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
    const onTrack = totalBudget > 0 && totalSpent <= totalBudget;
    const savingsAchieved = remaining;
    const savingsProgress = savingsGoal > 0 ? (savingsAchieved / savingsGoal) * 100 : 0;

    return NextResponse.json({
      month,
      budget: budget ? {
        id: budget.id,
        totalBudget,
        savingsGoal,
        notes: budget.notes,
      } : null,
      spending: {
        totalSpent,
        expenseCount: expenseStats[0]?.expenseCount || 0,
        remaining,
        percentUsed: parseFloat(percentUsed.toFixed(1)),
        onTrack,
      },
      savings: {
        goal: savingsGoal,
        achieved: savingsAchieved,
        progress: parseFloat(savingsProgress.toFixed(1)),
      },
      categoryBreakdown: categoryBreakdown.map(c => ({
        category: c.category,
        total: parseFloat(c.total.toString()),
        count: c.count,
        percentage: totalSpent > 0 ? parseFloat(((parseFloat(c.total.toString()) / totalSpent) * 100).toFixed(1)) : 0,
      })),
      dailySpending: dailySpending.map(d => ({
        date: d.date,
        total: parseFloat(d.total.toString()),
        count: d.count,
      })),
      topSpenders: topSpenders.map(s => ({
        userId: s.userId,
        userName: s.userName || 'Unknown',
        total: parseFloat(s.total.toString()),
        count: s.count,
      })),
    });
  } catch (error) {
    console.error('Error fetching budget stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
