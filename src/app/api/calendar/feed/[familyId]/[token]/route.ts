import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { events, families } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { verifyCalendarToken } from '@/lib/calendar-token';
import ical from 'ical-generator';

export const dynamic = 'force-dynamic';

// GET /api/calendar/feed/[familyId]/[token] - Generate iCalendar feed
export async function GET(
  req: NextRequest,
  { params }: { params: { familyId: string; token: string } }
) {
  try {
    const { familyId, token } = params;

    // Verify the token
    if (!verifyCalendarToken(familyId, token)) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Verify family exists
    const family = await db.query.families.findFirst({
      where: eq(families.id, familyId),
    });

    if (!family) {
      return new NextResponse('Family not found', { status: 404 });
    }

    // Fetch all events for this family
    const familyEvents = await db.query.events.findMany({
      where: eq(events.familyId, familyId),
      orderBy: (events, { asc }) => [asc(events.startTime)],
    });

    // Create iCalendar feed
    const calendar = ical({
      name: `${family.name} - FamilyList`,
      description: `Calendar events for ${family.name}`,
      timezone: 'UTC',
      url: req.url,
    });

    // Add events to calendar
    for (const event of familyEvents) {
      calendar.createEvent({
        id: event.id,
        start: event.startTime,
        end: event.endTime,
        summary: event.title,
        description: event.description || '',
        location: event.location || '',
        url: `${process.env.NEXTAUTH_URL}/calendar`,
      });
    }

    // Return iCalendar feed
    const icsContent = calendar.toString();

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${family.name}-calendar.ics"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error generating calendar feed:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
