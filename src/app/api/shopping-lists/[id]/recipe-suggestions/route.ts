import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { families, shoppingLists } from '@/db/schema';
import { auth } from '@/auth';
import { eq, and } from 'drizzle-orm';
import { decrypt } from '@/lib/encryption';
import { generateRecipeSuggestions } from '@/lib/gemini';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.familyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch the shopping list with items
    const list = await db.query.shoppingLists.findFirst({
      where: and(
        eq(shoppingLists.id, params.id),
        eq(shoppingLists.familyId, session.user.familyId)
      ),
      with: {
        items: true,
      },
    });

    if (!list) {
      return NextResponse.json({ error: 'Shopping list not found' }, { status: 404 });
    }

    if (!list.items || list.items.length === 0) {
      return NextResponse.json(
        { error: 'Shopping list is empty. Add some items first.' },
        { status: 400 }
      );
    }

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

    // Extract item names
    const itemNames = list.items.map(item => item.name);

    // Generate recipe suggestions using Gemini AI
    try {
      const recipes = await generateRecipeSuggestions(itemNames, apiKey);

      return NextResponse.json({
        success: true,
        recipes,
        itemCount: itemNames.length,
      });
    } catch (error) {
      console.error('Error generating recipe suggestions:', error);

      // Check if it's an API key error
      if (error instanceof Error && error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'Invalid API key. Please update your Google Gemini API key in settings.' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          error: 'Failed to generate recipe suggestions',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in recipe suggestions endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
