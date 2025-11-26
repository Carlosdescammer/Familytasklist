import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tasks, pushTokens } from '@/db/schema';
import { auth } from '@/lib/auth-helpers';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';
import { createTaskNotificationPayload, sendPushNotificationToMultiple } from '@/lib/web-push-server';

const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  notes: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  assignedTo: z.string().uuid().optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  tags: z.string().optional(),
  photoUrl: z.string().optional(), // Base64 encoded image or URL
});

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 404 });
    }

    const familyTasks = await db.query.tasks.findMany({
      where: eq(tasks.familyId, session.user.familyId),
      orderBy: [desc(tasks.createdAt)],
      with: {
        assignedUser: {
          columns: {
            id: true,
            email: true,
            name: true,
            relationship: true,
          },
        },
      },
    });

    return NextResponse.json(familyTasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.familyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const data = createTaskSchema.parse(body);

    const taskData: any = {
      title: data.title,
      notes: data.notes,
      priority: data.priority,
      tags: data.tags,
      familyId: session.user.familyId,
      assignedTo: data.assignedTo,
      photoUrl: data.photoUrl,
    };

    if (data.dueDate) {
      taskData.dueDate = new Date(data.dueDate);
    }

    const [task] = await db.insert(tasks).values(taskData).returning();

    // Send push notification if task is assigned to someone
    if (data.assignedTo && data.assignedTo !== session.user.id) {
      try {
        // Get push tokens for the assigned user
        const tokens = await db.query.pushTokens.findMany({
          where: and(
            eq(pushTokens.userId, data.assignedTo),
            eq(pushTokens.isActive, true)
          ),
        });

        if (tokens.length > 0) {
          const subscriptions = tokens.map((token) => JSON.parse(token.token));
          const assignerName = session.user.name || session.user.email || 'Someone';

          const payload = createTaskNotificationPayload(
            data.title,
            task.id,
            assignerName
          );

          // Send notification asynchronously (don't wait for it)
          sendPushNotificationToMultiple(subscriptions, payload).catch((error) => {
            console.error('Error sending task notification:', error);
          });
        }
      } catch (error) {
        console.error('Error processing push notification for task:', error);
        // Don't fail the request if notification fails
      }
    }

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Error creating task:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
