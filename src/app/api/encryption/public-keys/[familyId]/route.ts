/**
 * Get Public Keys API Route
 *
 * GET /api/encryption/public-keys/[familyId]
 * Gets public keys for all members of a family
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { userKeys, familyMembers } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  req: NextRequest,
  { params }: { params: { familyId: string } }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { familyId } = params;

    // Get all family members
    const members = await db.query.familyMembers.findMany({
      where: eq(familyMembers.familyId, familyId),
      with: {
        user: true,
      },
    });

    // Get public keys for all family members
    const publicKeys: Record<string, string> = {};

    for (const member of members) {
      const keys = await db.query.userKeys.findFirst({
        where: eq(userKeys.userId, member.userId),
      });

      if (keys) {
        publicKeys[member.userId] = keys.publicKey;
      }
    }

    return NextResponse.json({ publicKeys });
  } catch (error) {
    console.error('[E2EE Public Keys] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get public keys' },
      { status: 500 }
    );
  }
}
