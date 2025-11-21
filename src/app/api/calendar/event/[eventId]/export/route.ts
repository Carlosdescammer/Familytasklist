import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { events } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth-helpers';
import ical from 'ical-generator';

export const dynamic = 'force-dynamic';

// GET /api/calendar/event/[eventId]/export - Generate .ics file for a single event
export async function GET(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.familyId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { eventId } = params;

    // Fetch the event and verify it belongs to user's family
    const event = await db.query.events.findFirst({
      where: eq(events.id, eventId),
    });

    if (!event) {
      return new NextResponse('Event not found', { status: 404 });
    }

    if (event.familyId !== session.user.familyId) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Create iCalendar for single event
    const calendar = ical({
      name: event.title,
      description: event.description || '',
      timezone: 'UTC',
    });

    calendar.createEvent({
      id: event.id,
      start: event.startTime,
      end: event.endTime,
      summary: event.title,
      description: event.description || '',
      location: event.location || '',
      url: event.url || '',
    });

    // Return .ics file
    const icsContent = calendar.toString();

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${event.title.replace(/[^a-z0-9]/gi, '_')}.ics"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error generating event export:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
