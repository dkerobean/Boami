import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define protected routes and their required permissions
const protectedRoutes: Record<string, { resource: string; action: string }> = {
  '/admin/user-management': { resource: 'users', action: 'read' },
  '/admin/role-management': { resource: 'roles', action: 'read' },
  '/api/users': { resource: 'users', action: 'read' },
  '/api/roles': { resource: 'roles', action: 'read' },
  '/api/permissions': { resource: 'roles', action: 'read' },
};

export default withAuth(
  function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Check if the route requires specific permissions
    const requiredPermission = protectedRoutes[pathname];

    if (requiredPermission) {
      // For now, we'll allow all authenticated users
      // TODO: Implement proper permission checking once the database is properly seeded
      console.log(`Route ${pathname} requires permission: ${requiredPermission.resource}.${requiredPermission.action}`);
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // Allow access to auth pages without token
        if (pathname.startsWith('/auth/')) {
          return true;
        }

        // Require token for protected routes
        if (pathname.startsWith('/admin/') || pathname.startsWith('/api/')) {
          return !!token;
        }

        return true;
      },
    },
  }
);

export const config = {
  matcher: [
    // Temporarily disable middleware to test NextAuth
    // '/admin/:path*',
    // '/api/users/:path*',
    // '/api/roles/:path*',
    // '/api/permissions/:path*',
    // '/api/auth/permissions/:path*'
  ]
};