import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { events } from '@/db/schema';
import { auth } from '@/auth';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';

const createEventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  location: z.string().optional(),
  eventType: z.string().optional(),
  attendees: z.string().optional(), // Comma-separated user IDs
  url: z.string().url().optional().or(z.literal('')),
  color: z.string().optional(),
  notes: z.string().optional(),
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

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Error creating event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
