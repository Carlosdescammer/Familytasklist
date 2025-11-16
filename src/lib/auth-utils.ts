import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export async function getSession() {
  return await auth();
}

export async function getCurrentUser() {
  const session = await getSession();
  return session?.user;
}

export async function requireAuth() {
  const session = await getSession();
  if (!session?.user) {
    redirect('/auth/signin');
  }
  return session;
}

export async function requireFamily() {
  const session = await requireAuth();
  if (!session.user.familyId) {
    redirect('/onboarding');
  }
  return session;
}
