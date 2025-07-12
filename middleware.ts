import { NextRequest, NextResponse } from 'next/server';
import { JWTManager } from '@/lib/auth/jwt';

/**
 * Protected routes that require authentication
 */
const protectedRoutes = [
  '/dashboards',
  '/apps',
  '/charts',
  '/forms',
  '/tables',
  '/react-tables',
  '/ui-components',
  '/widgets',
  '/layout',
];

/**
 * Auth routes that should redirect authenticated users
 */
const authRoutes = [
  '/auth/auth1/login',
  '/auth/auth1/register',
  '/auth/auth1/verify-email',
  '/auth/auth1/forgot-password',
  '/auth/auth1/reset-password',
];

/**
 * Public routes that don't require authentication
 */
const publicRoutes = [
  '/',
  '/landingpage',
  '/frontend-pages',
  '/api/auth',
];

/**
 * Check if a path matches any of the given route patterns
 */
function matchesRoute(pathname: string, routes: string[]): boolean {
  return routes.some(route => pathname.startsWith(route));
}

/**
 * Check if user is authenticated by verifying JWT token
 */
function isAuthenticated(request: NextRequest): boolean {
  try {
    const accessToken = request.cookies.get('accessToken')?.value;
    
    if (!accessToken) {
      return false;
    }

    const payload = JWTManager.verifyAccessToken(accessToken);
    
    return !!payload;
  } catch (error) {
    console.error('Authentication check failed:', error);
    return false;
  }
}

/**
 * Next.js middleware function
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for API routes (except auth routes), static files, and Next.js internals
  if (
    pathname.startsWith('/api') && !pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') && !pathname.endsWith('.html')
  ) {
    return NextResponse.next();
  }

  const authenticated = isAuthenticated(request);

  // Handle protected routes
  if (matchesRoute(pathname, protectedRoutes)) {
    if (!authenticated) {
      console.log(`🔒 Redirecting unauthenticated user from ${pathname} to login`);
      const loginUrl = new URL('/auth/auth1/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    
    // Add security headers for protected routes
    const response = NextResponse.next();
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    return response;
  }

  // Handle auth routes (redirect authenticated users to dashboard)
  if (matchesRoute(pathname, authRoutes)) {
    if (authenticated) {
      console.log(`🔄 Redirecting authenticated user from ${pathname} to dashboard`);
      
      // Check for redirect parameter
      const redirectTo = request.nextUrl.searchParams.get('redirect');
      if (redirectTo && matchesRoute(redirectTo, protectedRoutes)) {
        return NextResponse.redirect(new URL(redirectTo, request.url));
      }
      
      return NextResponse.redirect(new URL('/dashboards/modern', request.url));
    }
  }

  // Handle public routes
  if (matchesRoute(pathname, publicRoutes)) {
    return NextResponse.next();
  }

  // Handle root path redirection
  if (pathname === '/') {
    if (authenticated) {
      return NextResponse.redirect(new URL('/dashboards/modern', request.url));
    } else {
      return NextResponse.redirect(new URL('/landingpage', request.url));
    }
  }

  // Default: allow access
  return NextResponse.next();
}

/**
 * Middleware configuration
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, icons, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};