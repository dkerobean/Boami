import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * Protected routes that require authentication
 * All dashboard and application routes are protected
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
  '/finance',
  '/layout',
  '/sample-page',
  '/theme-pages',
  '/icons',
  '/test-loading',
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
  '/auth/auth2',
];

/**
 * Public routes that don't require authentication
 */
const publicRoutes = [
  '/',
  '/landingpage',
  '/frontend-pages/about',
  '/frontend-pages/contact',
  '/frontend-pages/blog',
  '/frontend-pages/portfolio',
  '/frontend-pages/pricing',
  '/frontend-pages/homepage',
  '/api/auth',
];

/**
 * Security headers for protected routes
 */
const securityHeaders = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-XSS-Protection': '1; mode=block',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

/**
 * Configuration for redirect validation
 */
const redirectConfig = {
  maxRedirectLength: 200,
  allowedPatterns: protectedRoutes,
  blockedPatterns: [
    'javascript:',
    'data:',
    'vbscript:',
    'file:',
    'ftp:',
  ],
};

/**
 * Check if a path matches any of the given route patterns
 */
function matchesRoute(pathname: string, routes: string[]): boolean {
  return routes.some(route => pathname.startsWith(route));
}

/**
 * Validate redirect URL to prevent malicious redirects
 */
function isValidRedirect(redirectUrl: string): boolean {
  try {
    // Check length
    if (redirectUrl.length > redirectConfig.maxRedirectLength) {
      return false;
    }

    // Check for blocked patterns
    const lowerUrl = redirectUrl.toLowerCase();
    if (redirectConfig.blockedPatterns.some(pattern => lowerUrl.startsWith(pattern))) {
      return false;
    }

    // Must be a relative URL or same origin
    if (redirectUrl.startsWith('http://') || redirectUrl.startsWith('https://')) {
      return false;
    }

    // Must match allowed patterns (protected routes)
    return redirectConfig.allowedPatterns.some(pattern => redirectUrl.startsWith(pattern));
  } catch (error) {
    console.error('Redirect validation error:', error);
    return false;
  }
}

/**
 * Check if user is authenticated by verifying JWT token
 */
async function isAuthenticated(request: NextRequest): Promise<boolean> {
  try {
    // Use NextAuth JWT (session.strategy = 'jwt')
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token) return false;

    // Enforce Remember Me semantics
    const rememberCookie = request.cookies.get('boami_remember_me');
    const sessionOnlyCookie = request.cookies.get('boami_session_only');
    const sessionStartCookie = request.cookies.get('boami_session_start');

    // If neither persistent nor session-only marker exists, treat as logged out
    if (!rememberCookie && !sessionOnlyCookie) {
      return false;
    }

    // If session-only, enforce default timeout of 24h from first login
    if (sessionOnlyCookie) {
      const defaultTimeoutMs = 24 * 60 * 60 * 1000;
      const startMs = sessionStartCookie ? Number(sessionStartCookie.value) : NaN;
      if (!Number.isFinite(startMs)) {
        // No start marker -> treat as invalid session-only state
        return false;
      }
      if (Date.now() - startMs > defaultTimeoutMs) {
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Authentication check failed:', error);
    return false;
  }
}

/**
 * Next.js middleware function
 */
export async function middleware(request: NextRequest) {
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

  const authenticated = await isAuthenticated(request);

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
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }

  // Handle auth routes (redirect authenticated users to dashboard)
  if (matchesRoute(pathname, authRoutes)) {
    if (authenticated) {
      console.log(`🔄 Redirecting authenticated user from ${pathname} to dashboard`);

      // Check for redirect parameter with validation
      const redirectTo = request.nextUrl.searchParams.get('redirect');
      if (redirectTo && isValidRedirect(redirectTo)) {
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