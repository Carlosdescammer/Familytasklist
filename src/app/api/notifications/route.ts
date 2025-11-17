import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { notifications } from '@/db/schema';
import { auth } from '@/lib/auth-helpers';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id || !session?.user?.familyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all notifications for the current user
    const userNotifications = await db.query.notifications.findMany({
      where: and(
        eq(notifications.userId, session.user.id),
        eq(notifications.familyId, session.user.familyId)
      ),
      orderBy: [desc(notifications.createdAt)],
      limit: 50,
    });

    return NextResponse.json(userNotifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id || !session?.user?.familyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { notificationIds } = await req.json();

    if (!Array.isArray(notificationIds)) {
      return NextResponse.json(
        { error: 'notificationIds must be an array' },
        { status: 400 }
      );
    }

    // Mark notifications as read
    await db
      .update(notifications)
      .set({ read: true })
      .where(
        and(
          eq(notifications.userId, session.user.id),
          eq(notifications.familyId, session.user.familyId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
