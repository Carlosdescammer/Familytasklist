import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { aiUsageLogs } from '@/db/schema';
import { auth } from '@/lib/auth-helpers';
import { eq, and, gte, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

// GET /api/ai-usage - Get AI usage statistics for the current family
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.familyId || !session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
      recentLogs,
    });
  } catch (error) {
    console.error('Error fetching AI usage stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
