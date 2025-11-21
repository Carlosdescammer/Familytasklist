import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/db/schema';
import { auth } from '@/lib/auth-helpers';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const updatePreferencesSchema = z.object({
  emailNotifications: z.boolean().optional(),
  notificationPreferences: z.record(z.string(), z.boolean()).optional(), // Object with notification types as keys
});

// GET /api/users/preferences - Get user notification preferences
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      columns: {
        emailNotifications: true,
        notificationPreferences: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Parse notification preferences JSON
    let notificationPreferences = {};
    if (user.notificationPreferences) {
      try {
        notificationPreferences = JSON.parse(user.notificationPreferences);
      } catch (e) {
        console.error('Error parsing notification preferences:', e);
      }
    }

    return NextResponse.json({
      emailNotifications: user.emailNotifications,
      notificationPreferences,
    });
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/users/preferences - Update user notification preferences
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const data = updatePreferencesSchema.parse(body);

    const updateData: any = {};

    if (data.emailNotifications !== undefined) {
      updateData.emailNotifications = data.emailNotifications;
    }

    if (data.notificationPreferences !== undefined) {
      updateData.notificationPreferences = JSON.stringify(
        data.notificationPreferences
      );
    }

    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, session.user.id))
      .returning({
        emailNotifications: users.emailNotifications,
        notificationPreferences: users.notificationPreferences,
      });

    // Parse notification preferences for response
    let notificationPreferences = {};
    if (updatedUser.notificationPreferences) {
      try {
        notificationPreferences = JSON.parse(
          updatedUser.notificationPreferences
        );
      } catch (e) {
        console.error('Error parsing notification preferences:', e);
      }
    }

    return NextResponse.json({
      emailNotifications: updatedUser.emailNotifications,
      notificationPreferences,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Error updating user preferences:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
