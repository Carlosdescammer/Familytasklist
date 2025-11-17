'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';

type DbUserRaw = {
  id: string;
  clerkId: string | null;
  email: string;
  name: string | null;
  role: string;
  familyId: string | null;
  allowedPages: string | null;
  gamificationEnabled: boolean;
  familyBucks: string;
  totalPointsEarned: string;
  pointsPerTask: string;
};

type DbUser = Omit<DbUserRaw, 'allowedPages'> & {
  allowedPages: string[] | null;
};

export function useCurrentUser() {
  const { user: clerkUser, isSignedIn, isLoaded } = useUser();
  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDbUser = async () => {
      if (!isLoaded) return;

      if (!isSignedIn || !clerkUser) {
        setDbUser(null);
        setLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/users/me');
        if (res.ok) {
          const data: DbUserRaw = await res.json();

          // Parse allowedPages JSON string to array
          const parsedUser: DbUser = {
            ...data,
            allowedPages: data.allowedPages
              ? JSON.parse(data.allowedPages)
              : null,
          };

          setDbUser(parsedUser);
        } else {
          setDbUser(null);
        }
      } catch (error) {
        console.error('Error fetching database user:', error);
        setDbUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchDbUser();
  }, [clerkUser, isSignedIn, isLoaded]);

  return {
    // Clerk user data
    clerkUser,
    isSignedIn,
    isLoaded: isLoaded && !loading,

    // Database user data (compatible with old NextAuth session.user structure)
    user: dbUser,

    // Loading state
    loading: !isLoaded || loading,
  };
}
