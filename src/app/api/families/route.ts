import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { families, users } from '@/db/schema';
import { auth } from '@/lib/auth-helpers';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { encrypt, decrypt, isValidEncryptedKey } from '@/lib/encryption';
import { testApiKey } from '@/lib/gemini';

const createFamilySchema = z.object({
  name: z.string().min(1).max(100),
});

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed similar looking characters
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name } = createFamilySchema.parse(body);

    // Create the family with an invite code
    const inviteCode = generateInviteCode();
    const [family] = await db.insert(families).values({ name, inviteCode }).returning();

    // Update user to be part of this family
    await db
      .update(users)
      .set({ familyId: family.id, role: 'parent' })
      .where(eq(users.email, session.user.email));

    return NextResponse.json(family, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Error creating family:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 404 });
    }

    // Get family with users using the primary familyId relation
    const family = await db.query.families.findFirst({
      where: eq(families.id, session.user.familyId),
      with: {
        users: {
          where: eq(users.familyId, session.user.familyId),
          columns: {
            id: true,
            email: true,
            role: true,
            name: true,
            relationship: true,
          },
        },
      },
    });

    if (!family) {
      return NextResponse.json({ error: 'Family not found' }, { status: 404 });
    }

    // Format the response - mask API key and parse JSON fields
    const response = {
      ...family,
      aiApiKey: family.aiApiKey ? '••••••••' : null,
      hasApiKey: !!family.aiApiKey, // Boolean to indicate if key exists
      preferredStores: family.preferredStores
        ? JSON.parse(family.preferredStores)
        : [],
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching family:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const updateFamilySchema = z.object({
  description: z.string().optional(),
  funFacts: z.string().optional(),
  // AI Shopping Assistant fields
  aiProvider: z.enum(['gemini', 'openai']).optional(),
  aiApiKey: z.string().optional(),
  aiEnabled: z.boolean().optional(),
  preferredStores: z.array(z.string()).optional(),
  location: z.string().optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.familyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only parents can update family profile
    if (session.user.role !== 'parent') {
      return NextResponse.json({ error: 'Forbidden - Only parents can update' }, { status: 403 });
    }

    const body = await req.json();
    const data = updateFamilySchema.parse(body);

    // Prepare the update data
    const updateData: any = {
      description: data.description,
      funFacts: data.funFacts,
      location: data.location,
      aiEnabled: data.aiEnabled,
      aiProvider: data.aiProvider,
    };

    // Handle preferred stores - convert array to JSON string
    if (data.preferredStores !== undefined) {
      updateData.preferredStores = JSON.stringify(data.preferredStores);
    }

    // Handle AI API key - encrypt if provided
    if (data.aiApiKey !== undefined) {
      if (data.aiApiKey && data.aiApiKey.trim().length > 0) {
        // Validate API key with the selected provider (or default to gemini)
        const provider = data.aiProvider || 'gemini';
        const isValid = await testApiKey(data.aiApiKey, provider);
        if (!isValid) {
          const providerName = provider === 'openai' ? 'OpenAI' : 'Google Gemini';
          return NextResponse.json(
            { error: `Invalid API key. Please check your ${providerName} API key and try again.` },
            { status: 400 }
          );
        }
        // Encrypt the API key before storing
        updateData.aiApiKey = encrypt(data.aiApiKey);
      } else {
        // Clear the API key if empty string provided
        updateData.aiApiKey = null;
        updateData.aiEnabled = false; // Disable AI if key is removed
      }
    }

    const [updatedFamily] = await db
      .update(families)
      .set(updateData)
      .where(eq(families.id, session.user.familyId))
      .returning();

    if (!updatedFamily) {
      return NextResponse.json({ error: 'Family not found' }, { status: 404 });
    }

    // Don't send the encrypted API key back to the client
    // Instead, send a masked version if it exists
    const response = {
      ...updatedFamily,
      aiApiKey: updatedFamily.aiApiKey ? '••••••••' : null,
      preferredStores: updatedFamily.preferredStores
        ? JSON.parse(updatedFamily.preferredStores)
        : [],
    };

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Error updating family:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
