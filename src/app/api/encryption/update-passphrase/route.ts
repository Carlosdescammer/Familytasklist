/**
 * Update Passphrase API Route
 *
 * POST /api/encryption/update-passphrase
 * Updates the encrypted private key (when passphrase changes)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { userKeys } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user's database ID
    const { users } = await import('@/db/schema');
    const currentUser = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkUserId),
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await req.json();
    const { encryptedPrivateKey } = body;

    if (!encryptedPrivateKey) {
      return NextResponse.json(
        { error: 'Encrypted private key is required' },
        { status: 400 }
      );
    }

    // Update encrypted private key
    const updated = await db
      .update(userKeys)
      .set({
        encryptedPrivateKey,
        updatedAt: new Date(),
      })
      .where(eq(userKeys.userId, currentUser.id))
      .returning();

    if (!updated || updated.length === 0) {
      return NextResponse.json(
        { error: 'Encryption not set up for this user' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      userId: currentUser.id,
    });
  } catch (error) {
    console.error('[E2EE Update Passphrase] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update passphrase' },
      { status: 500 }
    );
  }
}
