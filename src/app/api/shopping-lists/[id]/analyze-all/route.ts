import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { shoppingItems, shoppingLists, families } from '@/db/schema';
import { auth } from '@/auth';
import { eq, and, isNull } from 'drizzle-orm';
import { decrypt } from '@/lib/encryption';
import { analyzeShoppingItem } from '@/lib/gemini';

// POST /api/shopping-lists/[id]/analyze-all - Analyze all items in a list that don't have AI data
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.familyId || !session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the shopping list exists and belongs to the user's family
    const list = await db.query.shoppingLists.findFirst({
      where: and(eq(shoppingLists.id, params.id), eq(shoppingLists.familyId, session.user.familyId)),
      with: {
        items: true,
      },
    });

    if (!list) {
      return NextResponse.json({ error: 'Shopping list not found' }, { status: 404 });
    }

    // Fetch family with AI settings
    const family = await db.query.families.findFirst({
      where: eq(families.id, session.user.familyId),
    });

    if (!family || !family.aiEnabled || !family.aiApiKey) {
      return NextResponse.json(
        { error: 'AI is not enabled for your family' },
        { status: 400 }
      );
    }

    // Find items that don't have AI data (no lastAiUpdate)
    const itemsToAnalyze = list.items?.filter((item) => !item.lastAiUpdate) || [];

    if (itemsToAnalyze.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All items already have AI data',
        itemsAnalyzed: 0,
      });
    }

    // Decrypt the API key
    const apiKey = decrypt(family.aiApiKey);

    // Parse preferred stores
    const preferredStores = family.preferredStores
      ? JSON.parse(family.preferredStores)
      : [];

    // Start analyzing items in the background (don't block the response)
    analyzeItemsBatch(
      itemsToAnalyze,
      apiKey,
      preferredStores,
      family.location || undefined,
      family.aiProvider as 'gemini' | 'openai'
    ).catch((error) => {
      console.error('Background batch analysis failed:', error);
    });

    return NextResponse.json({
      success: true,
      message: `Started analyzing ${itemsToAnalyze.length} items`,
      itemsToAnalyze: itemsToAnalyze.length,
      itemIds: itemsToAnalyze.map(i => i.id),
    });
  } catch (error) {
    console.error('Error starting batch analysis:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Analyzes multiple items with AI and updates them in the database
 * This runs in the background and doesn't block the API response
 */
async function analyzeItemsBatch(
  items: any[],
  apiKey: string,
  preferredStores: string[],
  location: string | undefined,
  provider: 'gemini' | 'openai'
) {
  console.log(`Starting batch analysis of ${items.length} items...`);

  for (const item of items) {
    try {
      console.log(`Analyzing item: ${item.name}...`);

      // Analyze the item
      const analysis = await analyzeShoppingItem(
        item.name,
        apiKey,
        preferredStores,
        location,
        provider
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
        .where(eq(shoppingItems.id, item.id));

      console.log(`✓ Successfully analyzed item: ${item.name}`);

      // Small delay between requests to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Failed to analyze item ${item.name}:`, error);
      // Continue with next item even if this one fails
    }
  }

  console.log(`✓ Batch analysis complete!`);
}
