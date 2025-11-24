import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { forumReplies, forumPosts } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const createReplySchema = z.object({
  content: z.string().min(1),
  parentReplyId: z.string().uuid().optional(),
});

// GET - Fetch all replies for a post
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const replies = await db.query.forumReplies.findMany({
      where: eq(forumReplies.postId, params.id),
      with: {
        author: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
        parentReply: true,
      },
      orderBy: (replies, { asc }) => [asc(replies.createdAt)],
    });

    return NextResponse.json({ replies });
  } catch (error) {
    console.error('Error fetching replies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch replies' },
      { status: 500 }
    );
  }
}

// POST - Create a new reply
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from database
    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.clerkId, userId),
      columns: {
        id: true,
        familyId: true,
        activeFamilyId: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const familyId = user.activeFamilyId || user.familyId;
    if (!familyId) {
      return NextResponse.json({ error: 'No active family' }, { status: 400 });
    }

    // Check if post exists and isn't locked
    const post = await db.query.forumPosts.findFirst({
      where: eq(forumPosts.id, params.id),
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    if (post.isLocked) {
      return NextResponse.json(
        { error: 'This post is locked and cannot accept new replies' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const data = createReplySchema.parse(body);

    // Create the reply
    const newReply = await db
      .insert(forumReplies)
      .values({
        postId: params.id,
        authorId: user.id,
        familyId: familyId,
        content: data.content,
        parentReplyId: data.parentReplyId || null,
        isAccepted: false,
      })
      .returning();

    // Update post reply count and last reply info
    await db
      .update(forumPosts)
      .set({
        replyCount: sql`${forumPosts.replyCount} + 1`,
        lastReplyAt: new Date(),
        lastReplyBy: user.id,
      })
      .where(eq(forumPosts.id, params.id));

    const reply = Array.isArray(newReply) ? newReply[0] : newReply;

    return NextResponse.json(
      { reply, message: 'Reply created successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating reply:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create reply' },
      { status: 500 }
    );
  }
}
