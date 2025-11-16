import { google } from 'googleapis';
import { db } from '@/lib/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function getGoogleCalendarClient(userId: string) {
  // Fetch user's tokens from database
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      googleAccessToken: true,
      googleRefreshToken: true,
      tokenExpires: true,
    },
  });

  if (!user?.googleAccessToken) {
    throw new Error('No Google access token found');
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NEXTAUTH_URL + '/api/auth/callback/google'
  );

  oauth2Client.setCredentials({
    access_token: user.googleAccessToken,
    refresh_token: user.googleRefreshToken,
    expiry_date: user.tokenExpires ? new Date(user.tokenExpires).getTime() : undefined,
  });

  // Automatically refresh token if expired
  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.access_token) {
      await db
        .update(users)
        .set({
          googleAccessToken: tokens.access_token,
          googleRefreshToken: tokens.refresh_token || user.googleRefreshToken,
          tokenExpires: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
        })
        .where(eq(users.id, userId));
    }
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

export async function syncEventToGoogleCalendar(
  userId: string,
  event: {
    id: string;
    title: string;
    description?: string | null;
    startTime: Date;
    endTime: Date;
    googleEventId?: string | null;
  }
) {
  try {
    const calendar = await getGoogleCalendarClient(userId);

    const googleEvent = {
      summary: event.title,
      description: event.description || '',
      start: {
        dateTime: event.startTime.toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: event.endTime.toISOString(),
        timeZone: 'UTC',
      },
    };

    if (event.googleEventId) {
      // Update existing event
      const response = await calendar.events.update({
        calendarId: 'primary',
        eventId: event.googleEventId,
        requestBody: googleEvent,
      });
      return response.data.id;
    } else {
      // Create new event
      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: googleEvent,
      });
      return response.data.id;
    }
  } catch (error) {
    console.error('Error syncing to Google Calendar:', error);
    throw error;
  }
}

export async function deleteEventFromGoogleCalendar(userId: string, googleEventId: string) {
  try {
    const calendar = await getGoogleCalendarClient(userId);

    await calendar.events.delete({
      calendarId: 'primary',
      eventId: googleEventId,
    });

    return true;
  } catch (error) {
    console.error('Error deleting from Google Calendar:', error);
    throw error;
  }
}
