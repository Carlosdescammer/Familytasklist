import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { forumPosts } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

// GET - Fetch a single post with details
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const post = await db.query.forumPosts.findFirst({
      where: eq(forumPosts.id, params.id),
      with: {
        author: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
        category: true,
        replies: {
          with: {
            author: {
              columns: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: (replies, { asc }) => [asc(replies.createdAt)],
        },
      },
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Increment view count
    await db
      .update(forumPosts)
      .set({ viewCount: sql`${forumPosts.viewCount} + 1` })
      .where(eq(forumPosts.id, params.id));

    return NextResponse.json({ post });
  } catch (error) {
    console.error('Error fetching forum post:', error);
    return NextResponse.json(
      { error: 'Failed to fetch post' },
      { status: 500 }
    );
  }
}

// PATCH - Update a post (author only)
export async function PATCH(
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
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if post exists and user is the author
    const existingPost = await db.query.forumPosts.findFirst({
      where: eq(forumPosts.id, params.id),
      columns: {
        id: true,
        authorId: true,
      },
    });

    if (!existingPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    if (existingPost.authorId !== user.id) {
      return NextResponse.json(
        { error: 'You can only edit your own posts' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { title, content, isPinned, isLocked } = body;

    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    // Only allow admin to pin/lock (for now, just ignore these fields for regular users)
    // if (isPinned !== undefined) updates.isPinned = isPinned;
    // if (isLocked !== undefined) updates.isLocked = isLocked;

    const updatedPost = await db
      .update(forumPosts)
      .set(updates)
      .where(eq(forumPosts.id, params.id))
      .returning();

    const postArray = Array.isArray(updatedPost) ? updatedPost : [updatedPost];

    return NextResponse.json({
      post: postArray[0],
      message: 'Post updated successfully',
    });
  } catch (error) {
    console.error('Error updating forum post:', error);
    return NextResponse.json(
      { error: 'Failed to update post' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a post (author only)
export async function DELETE(
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
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if post exists and user is the author
    const existingPost = await db.query.forumPosts.findFirst({
      where: eq(forumPosts.id, params.id),
      columns: {
        id: true,
        authorId: true,
      },
    });

    if (!existingPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    if (existingPost.authorId !== user.id) {
      return NextResponse.json(
        { error: 'You can only delete your own posts' },
        { status: 403 }
      );
    }

    const deletedPost = await db
      .delete(forumPosts)
      .where(eq(forumPosts.id, params.id))
      .returning();

    return NextResponse.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting forum post:', error);
    return NextResponse.json(
      { error: 'Failed to delete post' },
      { status: 500 }
    );
  }
}
