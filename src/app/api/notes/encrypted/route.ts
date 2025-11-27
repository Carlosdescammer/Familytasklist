/**
 * Encrypted Notes API Routes
 *
 * GET /api/notes/encrypted - Get encrypted notes
 * POST /api/notes/encrypted - Create encrypted note
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { encryptedNotes } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

/**
 * GET - Fetch encrypted notes
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const familyId = searchParams.get('familyId');
    const noteType = searchParams.get('noteType');

    if (!familyId) {
      return NextResponse.json(
        { error: 'Family ID is required' },
        { status: 400 }
      );
    }

    // Build query
    let query = and(
      eq(encryptedNotes.userId, userId),
      eq(encryptedNotes.familyId, familyId)
    );

    if (noteType) {
      query = and(query, eq(encryptedNotes.noteType, noteType));
    }

    // Get notes
    const notes = await db.query.encryptedNotes.findMany({
      where: query,
      orderBy: [desc(encryptedNotes.createdAt)],
    });

    return NextResponse.json({ notes });
  } catch (error) {
    console.error('[Encrypted Notes GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notes' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create encrypted note
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      familyId,
      encryptedContent,
      encryptedKey,
      iv,
      noteType,
      title,
      algorithm,
      version,
    } = body;

    if (!familyId || !encryptedContent || !encryptedKey || !iv) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create encrypted note
    const newNote = await db.insert(encryptedNotes).values({
      userId,
      familyId,
      encryptedContent,
      encryptedKey,
      iv,
      noteType: noteType || 'note',
      title: title || null,
      algorithm: algorithm || 'RSA-OAEP + AES-256-GCM',
      version: version || 1,
    }).returning();

    return NextResponse.json({
      success: true,
      note: newNote[0],
    });
  } catch (error) {
    console.error('[Encrypted Notes POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create note' },
      { status: 500 }
    );
  }
}
