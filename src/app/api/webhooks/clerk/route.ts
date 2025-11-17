import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
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
