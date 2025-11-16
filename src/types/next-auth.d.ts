import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      familyId: string | null;
      role: string;
      allowedPages: string[] | null;
    } & DefaultSession['user'];
    accessToken?: string;
    refreshToken?: string;
  }

  interface User {
    familyId?: string | null;
    role?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
  }
}
