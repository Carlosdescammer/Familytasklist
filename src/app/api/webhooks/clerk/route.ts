import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { Webhook } from 'svix';

export async function POST(req: NextRequest) {
  try {
    // Get webhook secret from environment
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

    // Read body once as text
    const bodyText = await req.text();
    let payload;

    // Verify webhook signature if secret is available
    if (webhookSecret) {
      const svixId = req.headers.get('svix-id');
      const svixTimestamp = req.headers.get('svix-timestamp');
      const svixSignature = req.headers.get('svix-signature');

      if (!svixId || !svixTimestamp || !svixSignature) {
        return NextResponse.json(
          { error: 'Missing Svix headers' },
          { status: 400 }
        );
      }

      const wh = new Webhook(webhookSecret);

      try {
        payload = wh.verify(bodyText, {
          'svix-id': svixId,
          'svix-timestamp': svixTimestamp,
          'svix-signature': svixSignature,
        }) as any;
      } catch (err) {
        console.error('Webhook signature verification failed:', err);
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 400 }
        );
      }
    } else {
      console.warn('CLERK_WEBHOOK_SECRET not set - skipping signature verification');
      payload = JSON.parse(bodyText);
    }

    const { type, data } = payload;

    console.log('Clerk webhook received:', type);

    switch (type) {
      case 'user.created':
        // Create or update user in database when they sign up
        const email = data.email_addresses.find((e: any) => e.id === data.primary_email_address_id)?.email_address;
        
        if (!email) {
          return NextResponse.json({ error: 'No email found' }, { status: 400 });
        }

        // Check if user already exists
        const existingUser = await db.query.users.findFirst({
          where: eq(users.email, email),
        });

        if (existingUser) {
          // Update existing user with Clerk ID
          await db.update(users)
            .set({
              clerkId: data.id,
              name: data.first_name || data.username || null,
            })
            .where(eq(users.id, existingUser.id));

          console.log('Updated existing user with Clerk ID:', data.id);
        } else {
          // Create new user
          await db.insert(users).values({
            clerkId: data.id,
            email,
            name: data.first_name || data.username || null,
            role: 'parent',
          });

          console.log('Created new user from Clerk:', data.id);
        }
        break;

      case 'user.updated':
        // Update user info when changed in Clerk
        await db.update(users)
          .set({
            name: data.first_name || data.username || null,
          })
          .where(eq(users.clerkId, data.id));
        
        console.log('Updated user from Clerk:', data.id);
        break;

      case 'user.deleted':
        // Optionally handle user deletion
        console.log('User deleted in Clerk:', data.id);
        // You might want to soft delete or keep the user data
        break;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Clerk webhook error:', error);
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 });
  }
}
