import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { shoppingItems, shoppingLists, families, pushTokens, users } from '@/db/schema';
import { auth } from '@/lib/auth-helpers';
import { eq, and, ne } from 'drizzle-orm';
import { z } from 'zod';
import { decrypt } from '@/lib/encryption';
import { analyzeShoppingItem } from '@/lib/gemini';
import { createShoppingNotificationPayload, sendPushNotificationToMultiple } from '@/lib/web-push-server';
import { createNotifications } from '@/lib/notifications';

const createShoppingItemSchema = z.object({
  name: z.string().min(1).max(200),
  qty: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.familyId || !session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the shopping list exists and belongs to the user's family
    const list = await db.query.shoppingLists.findFirst({
      where: and(eq(shoppingLists.id, params.id), eq(shoppingLists.familyId, session.user.familyId)),
    });

    if (!list) {
      return NextResponse.json({ error: 'Shopping list not found' }, { status: 404 });
    }

    const body = await req.json();
    const data = createShoppingItemSchema.parse(body);

    // Create the item first (without AI data)
    const [item] = await db
      .insert(shoppingItems)
      .values({
        ...data,
        listId: params.id,
        familyId: session.user.familyId,
        addedBy: session.user.id,
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
        const adderName = session.user.name || session.user.email || 'Someone';

        const notificationsList = familyMembers.map((member) => ({
          familyId: session.user.familyId!,
          userId: member.id,
          type: 'shopping_list_updated' as const,
          title: `Shopping List Updated`,
          message: `${adderName} added "${data.name}" to the shopping list "${list.name}"`,
        }));

        await createNotifications(notificationsList);

        console.log(`Sent shopping list update notifications to ${familyMembers.length} member(s) for item: ${data.name}`);
      }
    } catch (error) {
      console.error('Error sending shopping list update notifications:', error);
      // Don't fail the request if notification fails
    }

    // Try to analyze with AI in the background (don't block the response)
    // This runs asynchronously after returning the item
    analyzeItemWithAI(item.id, data.name, session.user.familyId).catch((error) => {
      console.error('Background AI analysis failed:', error);
      // Don't throw - we already returned the item successfully
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Error creating shopping item:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Analyzes an item with AI and updates it in the database
 * This runs in the background and doesn't block the API response
 */
async function analyzeItemWithAI(itemId: string, itemName: string, familyId: string) {
  try {
    // Fetch family with AI settings
    const family = await db.query.families.findFirst({
      where: eq(families.id, familyId),
    });

    if (!family || !family.aiEnabled || !family.aiApiKey) {
      // AI not enabled, skip analysis
      return;
    }

    // Decrypt the API key
    const apiKey = decrypt(family.aiApiKey);

    // Parse preferred stores
    const preferredStores = family.preferredStores
      ? JSON.parse(family.preferredStores)
      : [];

    // Analyze the item
    const analysis = await analyzeShoppingItem(
      itemName,
      apiKey,
      preferredStores,
      family.location || undefined,
      family.aiProvider as 'gemini' | 'openai'
    );

    // Update the item with AI analysis
    await db
      .update(shoppingItems)
      .set({
        category: analysis.category,
        estimatedPrice: analysis.estimatedPrice.toString(),
        currentPrice: analysis.currentPrice ? analysis.currentPrice.toString() : null,
        priceRange: analysis.priceRange,
        bestStore: analysis.bestStore,
        deals: analysis.deals ? JSON.stringify(analysis.deals) : null,
        brandOptions: analysis.brandOptions ? JSON.stringify(analysis.brandOptions) : null,
        aiMetadata: JSON.stringify({
          alternatives: analysis.alternatives,
          tips: analysis.tips,
        }),
        lastAiUpdate: new Date(),
      })
      .where(eq(shoppingItems.id, itemId));

    console.log(`Successfully analyzed item: ${itemName}`);
  } catch (error) {
    console.error(`Failed to analyze item ${itemName}:`, error);
    // Don't throw - this is a background operation
  }
}
