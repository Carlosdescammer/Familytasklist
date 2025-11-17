'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';

type DbUser = {
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
          const data = await res.json();
          setDbUser(data);
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
