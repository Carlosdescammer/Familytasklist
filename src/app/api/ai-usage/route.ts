import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { aiUsageLogs } from '@/db/schema';
import { auth } from '@/lib/auth-helpers';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

// GET /api/ai-usage - Get AI usage statistics for the current family
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.familyId || !session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters for date range
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Get the start of current month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Get overall stats
    const overallStats = await db
      .select({
        totalCalls: sql<number>`COUNT(*)::int`,
        totalCost: sql<number>`COALESCE(SUM(${aiUsageLogs.cost}), 0)::numeric(10,6)`,
        totalTokens: sql<number>`COALESCE(SUM(${aiUsageLogs.tokensUsed}), 0)::int`,
        successfulCalls: sql<number>`COUNT(CASE WHEN ${aiUsageLogs.success} = true THEN 1 END)::int`,
      })
      .from(aiUsageLogs)
      .where(eq(aiUsageLogs.familyId, session.user.familyId));

    // Get current month stats
    const monthStats = await db
      .select({
        totalCalls: sql<number>`COUNT(*)::int`,
        totalCost: sql<number>`COALESCE(SUM(${aiUsageLogs.cost}), 0)::numeric(10,6)`,
        totalTokens: sql<number>`COALESCE(SUM(${aiUsageLogs.tokensUsed}), 0)::int`,
      })
      .from(aiUsageLogs)
      .where(
        and(
          eq(aiUsageLogs.familyId, session.user.familyId),
          gte(aiUsageLogs.createdAt, startOfMonth)
        )
      );

    // Get stats by feature
    const featureStats = await db
      .select({
        feature: aiUsageLogs.feature,
        count: sql<number>`COUNT(*)::int`,
        totalCost: sql<number>`COALESCE(SUM(${aiUsageLogs.cost}), 0)::numeric(10,6)`,
      })
      .from(aiUsageLogs)
      .where(eq(aiUsageLogs.familyId, session.user.familyId))
      .groupBy(aiUsageLogs.feature)
      .orderBy(sql`COUNT(*) DESC`);

    // Get stats by provider
    const providerStats = await db
      .select({
        provider: aiUsageLogs.provider,
        count: sql<number>`COUNT(*)::int`,
        totalCost: sql<number>`COALESCE(SUM(${aiUsageLogs.cost}), 0)::numeric(10,6)`,
      })
      .from(aiUsageLogs)
      .where(eq(aiUsageLogs.familyId, session.user.familyId))
      .groupBy(aiUsageLogs.provider);

    // Get recent logs
    const recentLogs = await db.query.aiUsageLogs.findMany({
      where: eq(aiUsageLogs.familyId, session.user.familyId),
      orderBy: (aiUsageLogs, { desc }) => [desc(aiUsageLogs.createdAt)],
      limit: 10,
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

    // Get monthly breakdown for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const monthlyBreakdown = await db
      .select({
        month: sql<string>`TO_CHAR(${aiUsageLogs.createdAt}, 'YYYY-MM')`,
        totalCalls: sql<number>`COUNT(*)::int`,
        totalCost: sql<number>`COALESCE(SUM(${aiUsageLogs.cost}), 0)::numeric(10,6)`,
        totalTokens: sql<number>`COALESCE(SUM(${aiUsageLogs.tokensUsed}), 0)::int`,
      })
      .from(aiUsageLogs)
      .where(
        and(
          eq(aiUsageLogs.familyId, session.user.familyId),
          gte(aiUsageLogs.createdAt, sixMonthsAgo)
        )
      )
      .groupBy(sql`TO_CHAR(${aiUsageLogs.createdAt}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${aiUsageLogs.createdAt}, 'YYYY-MM') ASC`);

    // Get daily breakdown for current month (for chart)
    const dailyBreakdown = await db
      .select({
        date: sql<string>`TO_CHAR(${aiUsageLogs.createdAt}, 'YYYY-MM-DD')`,
        totalCalls: sql<number>`COUNT(*)::int`,
        totalCost: sql<number>`COALESCE(SUM(${aiUsageLogs.cost}), 0)::numeric(10,6)`,
      })
      .from(aiUsageLogs)
      .where(
        and(
          eq(aiUsageLogs.familyId, session.user.familyId),
          gte(aiUsageLogs.createdAt, startOfMonth)
        )
      )
      .groupBy(sql`TO_CHAR(${aiUsageLogs.createdAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`TO_CHAR(${aiUsageLogs.createdAt}, 'YYYY-MM-DD') ASC`);

    return NextResponse.json({
      overall: {
        totalCalls: overallStats[0]?.totalCalls || 0,
        totalCost: parseFloat(overallStats[0]?.totalCost?.toString() || '0'),
        totalTokens: overallStats[0]?.totalTokens || 0,
        successRate: overallStats[0]?.totalCalls > 0
          ? parseFloat(((overallStats[0]?.successfulCalls || 0) / overallStats[0].totalCalls * 100).toFixed(1))
          : 0,
      },
      currentMonth: {
        totalCalls: monthStats[0]?.totalCalls || 0,
        totalCost: parseFloat(monthStats[0]?.totalCost?.toString() || '0'),
        totalTokens: monthStats[0]?.totalTokens || 0,
      },
      byFeature: featureStats.map(f => ({
        feature: f.feature,
        count: f.count,
        totalCost: parseFloat(f.totalCost?.toString() || '0'),
      })),
      byProvider: providerStats.map(p => ({
        provider: p.provider,
        count: p.count,
        totalCost: parseFloat(p.totalCost?.toString() || '0'),
      })),
      monthlyHistory: monthlyBreakdown.map(m => ({
        month: m.month,
        totalCalls: m.totalCalls,
        totalCost: parseFloat(m.totalCost?.toString() || '0'),
        totalTokens: m.totalTokens,
      })),
      dailyHistory: dailyBreakdown.map(d => ({
        date: d.date,
        totalCalls: d.totalCalls,
        totalCost: parseFloat(d.totalCost?.toString() || '0'),
      })),
      recentLogs,
    });
  } catch (error) {
    console.error('Error fetching AI usage stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
