import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { forumPosts } from '@/db/schema';
import { desc, eq, and, sql } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const createPostSchema = z.object({
  categoryId: z.string().uuid(),
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  tags: z.array(z.string()).optional(),
});

// GET - Fetch forum posts (with optional category filter)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('categoryId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let posts;

    if (categoryId) {
      posts = await db.query.forumPosts.findMany({
        where: eq(forumPosts.categoryId, categoryId),
        with: {
          author: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
          category: true,
          lastReplyByUser: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: [desc(forumPosts.isPinned), desc(forumPosts.lastReplyAt), desc(forumPosts.createdAt)],
        limit,
        offset,
      });
    } else {
      posts = await db.query.forumPosts.findMany({
        with: {
          author: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
          category: true,
          lastReplyByUser: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: [desc(forumPosts.isPinned), desc(forumPosts.lastReplyAt), desc(forumPosts.createdAt)],
        limit,
        offset,
      });
    }

    return NextResponse.json({ posts });
  } catch (error) {
    console.error('Error fetching forum posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}

// POST - Create a new forum post
export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const data = createPostSchema.parse(body);

    const newPost = await db
      .insert(forumPosts)
      .values({
        categoryId: data.categoryId,
        authorId: user.id,
        familyId: familyId,
        title: data.title,
        content: data.content,
        tags: data.tags ? JSON.stringify(data.tags) : null,
        viewCount: 0,
        replyCount: 0,
        isPinned: false,
        isLocked: false,
      })
      .returning();

    const post = Array.isArray(newPost) ? newPost[0] : newPost;

    return NextResponse.json(
      { post, message: 'Post created successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating forum post:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 }
    );
  }
}
