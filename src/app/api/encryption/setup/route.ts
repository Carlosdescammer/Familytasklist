/**
 * E2EE Setup API Route
 *
 * POST /api/encryption/setup
 * Sets up end-to-end encryption for a user
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { userKeys } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { publicKey, encryptedPrivateKey } = body;

    if (!publicKey || !encryptedPrivateKey) {
      return NextResponse.json(
        { error: 'Public key and encrypted private key are required' },
        { status: 400 }
      );
    }

    // Check if user already has keys
    const existingKeys = await db.query.userKeys.findFirst({
      where: eq(userKeys.userId, userId),
    });

    if (existingKeys) {
      return NextResponse.json(
        { error: 'Encryption already set up for this user' },
        { status: 409 }
      );
    }

    // Store encryption keys
    const newKeys = await db.insert(userKeys).values({
      userId,
      publicKey,
      encryptedPrivateKey,
      keyVersion: 1,
    }).returning();

    return NextResponse.json({
      success: true,
      userId,
      publicKey: newKeys[0].publicKey,
    });
  } catch (error) {
    console.error('[E2EE Setup] Error:', error);
    return NextResponse.json(
      { error: 'Failed to set up encryption' },
      { status: 500 }
    );
  }
}
