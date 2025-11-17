import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { families } from '@/db/schema';
import { auth } from '@/lib/auth-helpers';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { decrypt } from '@/lib/encryption';
import { analyzeShoppingItem } from '@/lib/gemini';

const analyzeItemSchema = z.object({
  itemName: z.string().min(1).max(200),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.familyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { itemName } = analyzeItemSchema.parse(body);

    // Fetch family with AI settings
    const family = await db.query.families.findFirst({
      where: eq(families.id, session.user.familyId),
    });

    if (!family) {
      return NextResponse.json({ error: 'Family not found' }, { status: 404 });
    }

    // Check if AI is enabled and API key exists
    if (!family.aiEnabled || !family.aiApiKey) {
      return NextResponse.json(
        { error: 'AI features are not enabled for your family. Please configure AI settings first.' },
        { status: 400 }
      );
    }

    // Decrypt the API key
    let apiKey: string;
    try {
      apiKey = decrypt(family.aiApiKey);
    } catch (error) {
      console.error('Error decrypting API key:', error);
      return NextResponse.json(
        { error: 'Failed to decrypt API key. Please update your API key in settings.' },
        { status: 500 }
      );
    }

    // Parse preferred stores from JSON
    const preferredStores = family.preferredStores
      ? JSON.parse(family.preferredStores)
      : [];

    // Analyze the item using Gemini AI
    try {
      const analysis = await analyzeShoppingItem(
        itemName,
        apiKey,
        preferredStores,
        family.location || undefined
      );

      return NextResponse.json({
        success: true,
        analysis: {
          category: analysis.category,
          estimatedPrice: analysis.estimatedPrice,
          priceRange: analysis.priceRange,
          bestStore: analysis.bestStore,
          metadata: {
            alternatives: analysis.alternatives,
            tips: analysis.tips,
          },
        },
      });
    } catch (error) {
      console.error('Error analyzing item with AI:', error);

      // Check if it's an API key error
      if (error instanceof Error && error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'Invalid API key. Please update your Google Gemini API key in settings.' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          error: 'Failed to analyze item with AI',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Error in analyze endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
