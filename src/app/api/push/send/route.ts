import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { pushTokens } from '@/db/schema';
import { auth } from '@/lib/auth-helpers';
import { eq, and, inArray } from 'drizzle-orm';
import { z } from 'zod';
import {
  sendPushNotificationToMultiple,
  PushNotificationPayload,
} from '@/lib/web-push-server';

const sendNotificationSchema = z.object({
  userIds: z.array(z.string().uuid()).optional(), // Send to specific users
  payload: z.object({
    title: z.string(),
    body: z.string(),
    icon: z.string().optional(),
    badge: z.string().optional(),
    image: z.string().optional(),
    data: z.record(z.string(), z.any()).optional(),
    actions: z
      .array(
        z.object({
          action: z.string(),
          title: z.string(),
          icon: z.string().optional(),
        })
      )
      .optional(),
    tag: z.string().optional(),
    requireInteraction: z.boolean().optional(),
    silent: z.boolean().optional(),
    vibrate: z.array(z.number()).optional(),
    timestamp: z.number().optional(),
    url: z.string().optional(),
  }),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const data = sendNotificationSchema.parse(body);

    // Get active push tokens for the specified users or all family members
    let tokens;

    if (data.userIds && data.userIds.length > 0) {
      // Send to specific users
      tokens = await db.query.pushTokens.findMany({
        where: and(
          inArray(pushTokens.userId, data.userIds),
          eq(pushTokens.isActive, true)
        ),
      });
    } else if (session.user.familyId) {
      // Send to all family members
      tokens = await db.query.pushTokens.findMany({
        where: eq(pushTokens.isActive, true),
        with: {
          user: {
            columns: {
              familyId: true,
            },
          },
        },
      });

      // Filter to only tokens belonging to users in the same family
      tokens = tokens.filter(
        (token: any) => token.user?.familyId === session.user.familyId
      );
    } else {
      return NextResponse.json(
        {
          error: 'No target users specified and no family found',
        },
        { status: 400 }
      );
    }

    if (tokens.length === 0) {
      return NextResponse.json(
        {
          success: true,
          message: 'No active push subscriptions found for target users',
          successCount: 0,
          failureCount: 0,
        },
        { status: 200 }
      );
    }

    // Parse stored subscription JSON strings
    const subscriptions = tokens.map((token) => JSON.parse(token.token));

    // Send notifications
    const result = await sendPushNotificationToMultiple(
      subscriptions,
      data.payload as PushNotificationPayload
    );

    // Clean up expired subscriptions
    if (result.expiredSubscriptions.length > 0) {
      const expiredTokenStrings = result.expiredSubscriptions.map((sub) =>
        JSON.stringify(sub)
      );

      await db
        .delete(pushTokens)
        .where(inArray(pushTokens.token, expiredTokenStrings));

      console.log(
        `Cleaned up ${result.expiredSubscriptions.length} expired push subscriptions`
      );
    }

    return NextResponse.json({
      success: true,
      message: `Push notifications sent successfully`,
      successCount: result.successCount,
      failureCount: result.failureCount,
      expiredCount: result.expiredSubscriptions.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Error sending push notifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
