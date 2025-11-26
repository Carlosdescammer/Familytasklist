import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { pushTokens } from '@/db/schema';
import { auth } from '@/lib/auth-helpers';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const unsubscribeSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url(),
    expirationTime: z.number().nullable().optional(),
    keys: z.object({
      p256dh: z.string(),
      auth: z.string(),
    }),
  }),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const data = unsubscribeSchema.parse(body);

    // Convert subscription object to JSON string
    const tokenString = JSON.stringify(data.subscription);

    // Find and delete the subscription
    const deleted = await db
      .delete(pushTokens)
      .where(
        and(
          eq(pushTokens.userId, session.user.id),
          eq(pushTokens.token, tokenString)
        )
      )
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Subscription not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Push subscription removed successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Error unsubscribing from push notifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
