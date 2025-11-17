import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tasks, users, notifications } from '@/db/schema';
import { auth } from '@/auth';
import { eq, and, sql } from 'drizzle-orm';
import { z } from 'zod';

const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  notes: z.string().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  assignedTo: z.string().uuid().nullable().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  tags: z.string().optional(),
  completed: z.boolean().optional(),
  photoUrl: z.string().optional(), // Base64 encoded image or URL
  completionPhotoUrl: z.string().optional(), // Photo proving completion
});

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.familyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const task = await db.query.tasks.findFirst({
      where: and(eq(tasks.id, params.id), eq(tasks.familyId, session.user.familyId)),
      with: {
        assignedUser: {
          columns: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error('Error fetching task:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.familyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const data = updateTaskSchema.parse(body);

    // Get the current task to check if it's being completed
    const currentTask = await db.query.tasks.findFirst({
      where: and(eq(tasks.id, params.id), eq(tasks.familyId, session.user.familyId)),
    });

    if (!currentTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const updateData: any = { ...data, updatedAt: new Date() };
    if (data.dueDate !== undefined) {
      updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    }

    const [updatedTask] = await db
      .update(tasks)
      .set(updateData)
      .where(and(eq(tasks.id, params.id), eq(tasks.familyId, session.user.familyId)))
      .returning();

    if (!updatedTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Check if task is being marked as completed for the first time
    const isNewlyCompleted = !currentTask.completed && data.completed === true;

    if (isNewlyCompleted && updatedTask.assignedTo) {
      // Get the assigned user to check if they have gamification enabled
      const assignedUser = await db.query.users.findFirst({
        where: eq(users.id, updatedTask.assignedTo),
      });

      if (assignedUser && assignedUser.gamificationEnabled) {
        // Award points to the user
        const pointsToAward = parseFloat(assignedUser.pointsPerTask || '10');

        await db
          .update(users)
          .set({
            familyBucks: sql`${users.familyBucks} + ${pointsToAward}`,
            totalPointsEarned: sql`${users.totalPointsEarned} + ${pointsToAward}`,
          })
          .where(eq(users.id, updatedTask.assignedTo));

        console.log(
          `Awarded ${pointsToAward} points to ${assignedUser.name || assignedUser.email} for completing task: ${updatedTask.title}`
        );
      }

      // Check if ALL tasks assigned to this user are now completed
      const allUserTasks = await db.query.tasks.findMany({
        where: and(
          eq(tasks.familyId, session.user.familyId),
          eq(tasks.assignedTo, updatedTask.assignedTo)
        ),
      });

      const allTasksComplete = allUserTasks.every((task) => task.completed);

      if (allTasksComplete && allUserTasks.length > 0) {
        // Get all parents and family members who should be notified
        const familyMembers = await db.query.users.findMany({
          where: eq(users.familyId, session.user.familyId),
        });

        // Get the child's name for the notification message
        const childName = assignedUser?.name || assignedUser?.email || 'Your child';

        // Create notifications for all parents
        const parentsToNotify = familyMembers.filter((member) => member.role === 'parent');

        for (const parent of parentsToNotify) {
          await db.insert(notifications).values({
            familyId: session.user.familyId,
            userId: parent.id,
            type: 'all_tasks_complete',
            title: `${childName} completed all tasks!`,
            message: `Great news! ${childName} has completed all ${allUserTasks.length} assigned task${allUserTasks.length > 1 ? 's' : ''}!`,
            relatedUserId: updatedTask.assignedTo,
            relatedTaskId: updatedTask.id,
          });
        }

        console.log(
          `Created notifications for ${parentsToNotify.length} parent(s) - ${childName} completed all tasks`
        );
      }
    }

    return NextResponse.json(updatedTask);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Error updating task:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.familyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [deletedTask] = await db
      .delete(tasks)
      .where(and(eq(tasks.id, params.id), eq(tasks.familyId, session.user.familyId)))
      .returning();

    if (!deletedTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
