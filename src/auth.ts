import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '@/lib/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          access_type: 'offline',
          prompt: 'consent',
          scope: [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/calendar.events',
          ].join(' '),
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && account.access_token) {
        // Store Google tokens in JWT
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;

        // Create or update user in custom users table
        if (token.email) {
          // Check if user exists in custom users table
          const existingUser = await db.query.users.findFirst({
            where: eq(users.email, token.email),
          });

          if (existingUser) {
            // Update existing user with Google tokens
            await db
              .update(users)
              .set({
                googleId: account.providerAccountId,
                googleAccessToken: account.access_token,
                googleRefreshToken: account.refresh_token || undefined,
                tokenExpires: account.expires_at
                  ? new Date(account.expires_at * 1000)
                  : undefined,
              })
              .where(eq(users.email, token.email));
          } else {
            // Create new user in custom users table
            await db.insert(users).values({
              email: token.email,
              googleId: account.providerAccountId,
              googleAccessToken: account.access_token,
              googleRefreshToken: account.refresh_token || undefined,
              tokenExpires: account.expires_at
                ? new Date(account.expires_at * 1000)
                : undefined,
            });
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      // Add access token and family info to session
      if (session.user) {
        session.accessToken = token.accessToken as string;
        session.refreshToken = token.refreshToken as string;

        // Fetch user's family ID and settings from database
        if (session.user.email) {
          const user = await db.query.users.findFirst({
            where: eq(users.email, session.user.email),
            columns: {
              id: true,
              familyId: true,
              role: true,
              allowedPages: true,
            },
          });

          if (user) {
            session.user.id = user.id;
            session.user.familyId = user.familyId;
            session.user.role = user.role;
            session.user.allowedPages = user.allowedPages
              ? JSON.parse(user.allowedPages)
              : null;
          }
        }
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
  },
});
