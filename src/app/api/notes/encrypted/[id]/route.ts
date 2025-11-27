/**
 * Encrypted Notes API - Delete Route
 *
 * DELETE /api/notes/encrypted/[id] - Delete encrypted note
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { encryptedNotes } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const noteId = params.id;

    // Delete note (only if it belongs to the user)
    await db
      .delete(encryptedNotes)
      .where(
        and(
          eq(encryptedNotes.id, noteId),
          eq(encryptedNotes.userId, currentUser.id)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Encrypted Notes DELETE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete note' },
      { status: 500 }
    );
  }
}
