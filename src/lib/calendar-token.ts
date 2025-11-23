import { createHash } from 'crypto';

/**
 * Generates a secure calendar feed token for a family
 * This token allows anyone with the URL to access the family's calendar feed
 */
export function generateCalendarToken(familyId: string): string {
  const secret = process.env.CALENDAR_SECRET;

  if (!secret) {
    throw new Error('CALENDAR_SECRET environment variable is not set');
  }

  const hash = createHash('sha256')
    .update(`${familyId}:${secret}`)
    .digest('hex');
  return hash.substring(0, 32); // Use first 32 characters for a shorter token
}

/**
 * Verifies a calendar token and returns the family ID if valid
 */
export function verifyCalendarToken(familyId: string, token: string): boolean {
  const expectedToken = generateCalendarToken(familyId);
  return token === expectedToken;
}
