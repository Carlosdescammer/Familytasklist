/**
 * Utility functions for generating calendar URLs for different providers
 */

export interface CalendarEvent {
  title: string;
  description?: string;
  location?: string;
  startTime: Date | string;
  endTime: Date | string;
  url?: string;
}

/**
 * Format date to YYYYMMDDTHHMMSSZ format for calendar URLs
 */
function formatCalendarDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

/**
 * Generate Google Calendar URL
 */
export function getGoogleCalendarUrl(event: CalendarEvent): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatCalendarDate(event.startTime)}/${formatCalendarDate(event.endTime)}`,
    details: event.description || '',
    location: event.location || '',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generate Outlook Calendar URL (web)
 */
export function getOutlookCalendarUrl(event: CalendarEvent): string {
  const start = typeof event.startTime === 'string' ? new Date(event.startTime) : event.startTime;
  const end = typeof event.endTime === 'string' ? new Date(event.endTime) : event.endTime;

  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: event.title,
    startdt: start.toISOString(),
    enddt: end.toISOString(),
    body: event.description || '',
    location: event.location || '',
  });

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/**
 * Generate Office 365 Calendar URL
 */
export function getOffice365CalendarUrl(event: CalendarEvent): string {
  const start = typeof event.startTime === 'string' ? new Date(event.startTime) : event.startTime;
  const end = typeof event.endTime === 'string' ? new Date(event.endTime) : event.endTime;

  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: event.title,
    startdt: start.toISOString(),
    enddt: end.toISOString(),
    body: event.description || '',
    location: event.location || '',
  });

  return `https://outlook.office365.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/**
 * Generate Yahoo Calendar URL
 */
export function getYahooCalendarUrl(event: CalendarEvent): string {
  const start = typeof event.startTime === 'string' ? new Date(event.startTime) : event.startTime;
  const end = typeof event.endTime === 'string' ? new Date(event.endTime) : event.endTime;

  // Calculate duration in hours and minutes
  const duration = Math.floor((end.getTime() - start.getTime()) / 1000 / 60); // minutes
  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;
  const durationStr = hours.toString().padStart(2, '0') + minutes.toString().padStart(2, '0');

  const params = new URLSearchParams({
    v: '60',
    title: event.title,
    st: formatCalendarDate(start),
    dur: durationStr,
    desc: event.description || '',
    in_loc: event.location || '',
  });

  return `https://calendar.yahoo.com/?${params.toString()}`;
}

/**
 * Get download URL for .ics file
 */
export function getIcsDownloadUrl(eventId: string): string {
  return `/api/calendar/event/${eventId}/export`;
}
