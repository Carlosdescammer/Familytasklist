import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tasks, pushTokens, users } from '@/db/schema';
import { auth } from '@/lib/auth-helpers';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';
import { createTaskNotificationPayload, sendPushNotificationToMultiple } from '@/lib/web-push-server';
import { createNotification } from '@/lib/notifications';

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

    // Send notification if task is assigned to someone
    if (data.assignedTo && data.assignedTo !== session.user.id) {
      try {
        // Get assigned user details
        const assignedUser = await db.query.users.findFirst({
          where: eq(users.id, data.assignedTo),
        });

        if (assignedUser) {
          const assignerName = session.user.name || session.user.email || 'Someone';

          // Create notification (handles email + push + database entry)
          await createNotification({
            familyId: session.user.familyId,
            userId: data.assignedTo,
            type: 'task_assigned',
            title: `New Task Assigned: ${data.title}`,
            message: `${assignerName} assigned you a task: "${data.title}"`,
            relatedTaskId: task.id,
            relatedUserId: session.user.id,
          });

          console.log(`Sent task assignment notification to ${assignedUser.name || assignedUser.email} for task: ${data.title}`);
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
