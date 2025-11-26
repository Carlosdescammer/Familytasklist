import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { pushTokens } from '@/db/schema';
import { auth } from '@/lib/auth-helpers';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const subscribeSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url(),
    expirationTime: z.number().nullable().optional(),
    keys: z.object({
      p256dh: z.string(),
      auth: z.string(),
    }),
  }),
  deviceType: z.string().optional(),
  deviceName: z.string().optional(),
  userAgent: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const data = subscribeSchema.parse(body);

    // Convert subscription object to JSON string for storage
    const tokenString = JSON.stringify(data.subscription);

    // Check if this subscription already exists for this user
    const existing = await db.query.pushTokens.findFirst({
      where: and(
        eq(pushTokens.userId, session.user.id),
        eq(pushTokens.token, tokenString)
      ),
    });

    if (existing) {
      // Update the existing subscription
      const [updated] = await db
        .update(pushTokens)
        .set({
          isActive: true,
          lastUsed: new Date(),
          deviceType: data.deviceType || existing.deviceType,
          deviceName: data.deviceName || existing.deviceName,
          userAgent: data.userAgent || existing.userAgent,
          updatedAt: new Date(),
        })
        .where(eq(pushTokens.id, existing.id))
        .returning();

      return NextResponse.json({
        success: true,
        message: 'Push subscription updated successfully',
        subscription: updated,
      });
    }

    // Create new subscription
    const [newSubscription] = await db
      .insert(pushTokens)
      .values({
        userId: session.user.id,
        token: tokenString,
        deviceType: data.deviceType || 'web',
        deviceName: data.deviceName || 'Unknown Device',
        userAgent: data.userAgent || '',
        isActive: true,
        lastUsed: new Date(),
      })
      .returning();

    return NextResponse.json(
      {
        success: true,
        message: 'Push subscription created successfully',
        subscription: newSubscription,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Error subscribing to push notifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
