import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tasks } from '@/db/schema';
import { auth } from '@/auth';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';

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

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Error creating task:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
