import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { events, users, pushTokens } from '@/db/schema';
import { auth } from '@/lib/auth-helpers';
import { eq, and, desc, ne } from 'drizzle-orm';
import { z } from 'zod';
import { syncEventToGoogleCalendar } from '@/lib/google-calendar';
import { createCalendarNotificationPayload, sendPushNotificationToMultiple } from '@/lib/web-push-server';
import { createNotifications } from '@/lib/notifications';

const createEventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  location: z.string().optional(),
  eventType: z.string().optional(),
  attendees: z.string().optional(), // Comma-separated user IDs
  url: z.string().url().optional().or(z.literal('')),
  color: z.string().optional(),
  notes: z.string().optional(),
  photoUrl: z.string().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 404 });
    }

    const familyEvents = await db.query.events.findMany({
      where: eq(events.familyId, session.user.familyId),
      orderBy: [desc(events.startTime)],
      with: {
        creator: {
          columns: {
            id: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(familyEvents);
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.familyId || !session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const data = createEventSchema.parse(body);

    // Create event in database
    const [event] = await db
      .insert(events)
      .values({
        ...data,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        familyId: session.user.familyId,
        createdBy: session.user.id,
      })
      .returning();

    // Send notifications to other family members
    try {
      // Get other family members (not the creator)
      const familyMembers = await db.query.users.findMany({
        where: and(
          eq(users.familyId, session.user.familyId),
          ne(users.id, session.user.id)
        ),
      });

      if (familyMembers.length > 0) {
        const creatorName = session.user.name || session.user.email || 'Someone';
        const eventDate = new Date(event.startTime).toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        });

        // Create notifications for all family members (handles email + push + database)
        const notificationsList = familyMembers.map((member) => ({
          familyId: session.user.familyId,
          userId: member.id,
          type: 'event_created' as const,
          title: `New Event: ${event.title}`,
          message: `${creatorName} created a new event "${event.title}" on ${eventDate}`,
        }));

        await createNotifications(notificationsList);

        console.log(`Sent event creation notifications to ${familyMembers.length} family member(s) for event: ${event.title}`);
      }
    } catch (error) {
      console.error('Error processing notifications for event:', error);
      // Don't fail the request if notification fails
    }

    // Try to sync to Google Calendar if user has OAuth tokens
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, session.user.id),
        columns: {
          googleAccessToken: true,
        },
      });

      if (user?.googleAccessToken) {
        const googleEventId = await syncEventToGoogleCalendar(session.user.id, {
          id: event.id,
          title: event.title,
          description: event.description,
          startTime: event.startTime,
          endTime: event.endTime,
        });

        // Update event with Google Calendar ID
        if (googleEventId) {
          await db
            .update(events)
            .set({ googleEventId })
            .where(eq(events.id, event.id));

          // Return updated event
          return NextResponse.json({ ...event, googleEventId }, { status: 201 });
        }
      }
    } catch (googleError) {
      console.error('Failed to sync to Google Calendar:', googleError);
      // Don't fail the request - event was created successfully
    }

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Error creating event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
