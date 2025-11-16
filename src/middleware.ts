import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  // Public paths that don't require authentication
  const publicPaths = ['/auth/signin', '/auth/error', '/api/auth'];
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));

  // Allow access to public paths
  if (isPublicPath) {
    return NextResponse.next();
  }

  // Redirect to sign-in if not authenticated
  if (!isLoggedIn) {
    const signInUrl = new URL('/auth/signin', req.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Allow API routes to proceed without family check
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Check if user has a family - redirect to setup if not
  if (isLoggedIn && !req.auth?.user?.familyId && pathname !== '/onboarding') {
    return NextResponse.redirect(new URL('/onboarding', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - manifest.json, icons, etc.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.svg|.*\\.ico|manifest.json).*)',
  ],
};
