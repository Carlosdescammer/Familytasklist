import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { clerkClient } from '@clerk/nextjs/server';

export async function DELETE() {
  try {
    const session = await auth();
    
    if (!session?.user?.id || !session?.user?.clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete user from Clerk
    try {
      await clerkClient.users.deleteUser(session.user.clerkId);
    } catch (clerkError) {
      console.error('Error deleting Clerk user:', clerkError);
      // Continue with database deletion even if Clerk deletion fails
    }

    // Delete user from database (CASCADE will handle related data)
    await db.delete(users).where(eq(users.id, session.user.id));

    return NextResponse.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
