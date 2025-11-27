/**
 * Encrypted Messages API Routes
 *
 * GET /api/messages/encrypted - Get encrypted messages
 * POST /api/messages/encrypted - Send encrypted message
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { encryptedMessages } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

/**
 * GET - Fetch encrypted messages for a family
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const familyId = searchParams.get('familyId');

    if (!familyId) {
      return NextResponse.json(
        { error: 'Family ID is required' },
        { status: 400 }
      );
    }

    // Get messages for this family
    const messages = await db.query.encryptedMessages.findMany({
      where: eq(encryptedMessages.familyId, familyId),
      orderBy: [desc(encryptedMessages.createdAt)],
      limit: 100, // Limit to last 100 messages
      with: {
        sender: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('[Encrypted Messages GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

/**
 * POST - Send encrypted message
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { familyId, encryptedContent, encryptedKeys, iv, algorithm, version } = body;

    if (!familyId || !encryptedContent || !encryptedKeys || !iv) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create encrypted message
    const newMessage = await db.insert(encryptedMessages).values({
      familyId,
      senderId: userId,
      encryptedContent,
      encryptedKeys: JSON.stringify(encryptedKeys),
      iv,
      algorithm: algorithm || 'RSA-OAEP + AES-256-GCM',
      version: version || 1,
    }).returning();

    // Emit real-time event (if Socket.IO is available)
    try {
      const { emitToFamily } = await import('@/lib/socket-server');
      emitToFamily(familyId, 'message:encrypted', {
        message: newMessage[0],
      });
    } catch (error) {
      // Socket.IO not available, continue without real-time
      console.log('[Encrypted Messages] Socket.IO not available');
    }

    return NextResponse.json({
      success: true,
      message: newMessage[0],
    });
  } catch (error) {
    console.error('[Encrypted Messages POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
