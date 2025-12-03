import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { shoppingLists, users } from '@/db/schema';
import { auth } from '@/lib/auth-helpers';
import { eq, and, desc, ne } from 'drizzle-orm';
import { z } from 'zod';
import { createNotifications } from '@/lib/notifications';

const createShoppingListSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  eventId: z.string().uuid().optional().nullable(),
  members: z.string().optional(), // Comma-separated user IDs
  isFamilyList: z.boolean().default(false),
});

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 404 });
    }

    const lists = await db.query.shoppingLists.findMany({
      where: eq(shoppingLists.familyId, session.user.familyId),
      orderBy: [desc(shoppingLists.createdAt)],
      with: {
        creator: {
          columns: {
            id: true,
            email: true,
            name: true,
          },
        },
        items: {
          with: {
            addedByUser: {
              columns: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(lists);
  } catch (error) {
    console.error('Error fetching shopping lists:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.familyId || !session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const data = createShoppingListSchema.parse(body);

    const [list] = await db
      .insert(shoppingLists)
      .values({
        ...data,
        familyId: session.user.familyId,
        createdBy: session.user.id,
      })
      .returning();

    // Send notifications to other family members
    try {
      const familyMembers = await db.query.users.findMany({
        where: and(
          eq(users.familyId, session.user.familyId),
          ne(users.id, session.user.id)
        ),
      });

      if (familyMembers.length > 0) {
        const creatorName = session.user.name || session.user.email || 'Someone';

        const notificationsList = familyMembers.map((member) => ({
          familyId: session.user.familyId!,
          userId: member.id,
          type: 'shopping_list_created' as const,
          title: `New Shopping List: ${data.name}`,
          message: `${creatorName} created a new shopping list "${data.name}"`,
        }));

        await createNotifications(notificationsList);

        console.log(`Sent shopping list creation notifications to ${familyMembers.length} family member(s) for list: ${data.name}`);
      }
    } catch (error) {
      console.error('Error processing notifications for shopping list:', error);
      // Don't fail the request if notification fails
    }

    return NextResponse.json(list, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Error creating shopping list:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
