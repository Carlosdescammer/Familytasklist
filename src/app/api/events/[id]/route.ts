import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { events, users } from '@/db/schema';
import { auth } from '@/lib/auth-helpers';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { syncEventToGoogleCalendar, deleteEventFromGoogleCalendar } from '@/lib/google-calendar';

const updateEventSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  eventType: z.string().optional(),
  attendees: z.string().optional(),
  url: z.string().url().optional().or(z.literal('')),
  color: z.string().optional(),
  notes: z.string().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
});

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.familyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const event = await db.query.events.findFirst({
      where: and(eq(events.id, params.id), eq(events.familyId, session.user.familyId)),
      with: {
        creator: {
          columns: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json(event);
  } catch (error) {
    console.error('Error fetching event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.familyId || !session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const data = updateEventSchema.parse(body);

    const updateData: any = { ...data, updatedAt: new Date() };
    if (data.startTime) updateData.startTime = new Date(data.startTime);
    if (data.endTime) updateData.endTime = new Date(data.endTime);

    const [updatedEvent] = await db
      .update(events)
      .set(updateData)
      .where(and(eq(events.id, params.id), eq(events.familyId, session.user.familyId)))
      .returning();

    if (!updatedEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Try to sync to Google Calendar if event has a googleEventId
    if (updatedEvent.googleEventId) {
      try {
        const user = await db.query.users.findFirst({
          where: eq(users.id, session.user.id),
          columns: {
            googleAccessToken: true,
          },
        });

        if (user?.googleAccessToken) {
          await syncEventToGoogleCalendar(session.user.id, {
            id: updatedEvent.id,
            title: updatedEvent.title,
            description: updatedEvent.description,
            startTime: updatedEvent.startTime,
            endTime: updatedEvent.endTime,
            googleEventId: updatedEvent.googleEventId,
          });
        }
      } catch (googleError) {
        console.error('Failed to sync update to Google Calendar:', googleError);
        // Don't fail the request - event was updated successfully
      }
    }

    return NextResponse.json(updatedEvent);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Error updating event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.familyId || !session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // First get the event to check if it has a Google Calendar ID
    const event = await db.query.events.findFirst({
      where: and(eq(events.id, params.id), eq(events.familyId, session.user.familyId)),
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Delete from Google Calendar if it has a googleEventId
    if (event.googleEventId) {
      try {
        const user = await db.query.users.findFirst({
          where: eq(users.id, session.user.id),
          columns: {
            googleAccessToken: true,
          },
        });

        if (user?.googleAccessToken) {
          await deleteEventFromGoogleCalendar(session.user.id, event.googleEventId);
        }
      } catch (googleError) {
        console.error('Failed to delete from Google Calendar:', googleError);
        // Continue with database deletion even if Google Calendar deletion fails
      }
    }

    // Delete from database
    await db
      .delete(events)
      .where(eq(events.id, params.id));

    return NextResponse.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
