import { NextRequest, NextResponse } from 'next/server';

/**
 * Comprehensive diagnostic endpoint to identify configuration issues
 */
export async function GET(request: NextRequest) {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    environment: {},
    imports: {},
    database: {},
    nextauth: {},
    errors: []
  };

  try {
    // Check environment variables
    console.log('🔍 Checking environment variables...');
    diagnostics.environment = {
      NODE_ENV: process.env.NODE_ENV,
      NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      MONGODB_URI: !!process.env.MONGODB_URI,
      JWT_SECRET: !!process.env.JWT_SECRET,
      SKIP_AUTH: process.env.SKIP_AUTH,
      NEXT_PUBLIC_SKIP_AUTH: process.env.NEXT_PUBLIC_SKIP_AUTH
    };

    // Test imports
    console.log('🔍 Testing imports...');
    try {
      await import('next-auth');
      diagnostics.imports.nextauth = '✅ Success';
    } catch (error: any) {
      diagnostics.imports.nextauth = `❌ Error: ${error.message}`;
      diagnostics.errors.push(`NextAuth import: ${error.message}`);
    }

    try {
      await import('next-auth/providers/credentials');
      diagnostics.imports.credentials = '✅ Success';
    } catch (error: any) {
      diagnostics.imports.credentials = `❌ Error: ${error.message}`;
      diagnostics.errors.push(`CredentialsProvider import: ${error.message}`);
    }

    try {
      await import('bcryptjs');
      diagnostics.imports.bcrypt = '✅ Success';
    } catch (error: any) {
      diagnostics.imports.bcrypt = `❌ Error: ${error.message}`;
      diagnostics.errors.push(`bcrypt import: ${error.message}`);
    }

    try {
      const { connectDB } = await import('@/lib/database/mongoose-connection');
      diagnostics.imports.database = '✅ Success';

      // Test database connection
      console.log('🔍 Testing database connection...');
      await connectDB();
      diagnostics.database.connection = '✅ Success';
    } catch (error: any) {
      diagnostics.imports.database = `❌ Error: ${error.message}`;
      diagnostics.database.connection = `❌ Error: ${error.message}`;
      diagnostics.errors.push(`Database: ${error.message}`);
    }

    try {
      const { User } = await import('@/lib/database/models');
      diagnostics.imports.userModel = '✅ Success';

      // Test User model
      if (diagnostics.database.connection.includes('✅')) {
        const userCount = await User.countDocuments();
        diagnostics.database.userCount = userCount;
        diagnostics.database.userModel = '✅ Success';
      }
    } catch (error: any) {
      diagnostics.imports.userModel = `❌ Error: ${error.message}`;
      diagnostics.database.userModel = `❌ Error: ${error.message}`;
      diagnostics.errors.push(`User model: ${error.message}`);
    }

    // Test NextAuth configuration
    console.log('🔍 Testing NextAuth configuration...');
    try {
      const NextAuth = await import('next-auth');
      const CredentialsProvider = await import('next-auth/providers/credentials');

      const testAuthOptions = {
        providers: [
          CredentialsProvider.default({
            name: 'credentials',
            credentials: {
              email: { label: 'Email', type: 'email' },
              password: { label: 'Password', type: 'password' }
            },
            async authorize() {
              return null;
            }
          })
        ],
        session: { strategy: 'jwt' as const },
        jwt: { secret: process.env.NEXTAUTH_SECRET },
        debug: false
      };

      const handler = NextAuth.default(testAuthOptions);
      diagnostics.nextauth.configuration = '✅ Success';
      diagnostics.nextauth.handler = '✅ Success';
    } catch (error: any) {
      diagnostics.nextauth.configuration = `❌ Error: ${error.message}`;
      diagnostics.nextauth.handler = `❌ Error: ${error.message}`;
      diagnostics.errors.push(`NextAuth config: ${error.message}`);
    }

    // Test actual NextAuth route import
    try {
      const { authOptions } = await import('@/app/api/auth/[...nextauth]/route');
      diagnostics.nextauth.routeImport = '✅ Success';
      diagnostics.nextauth.authOptions = !!authOptions ? '✅ Success' : '❌ Missing';
    } catch (error: any) {
      diagnostics.nextauth.routeImport = `❌ Error: ${error.message}`;
      diagnostics.errors.push(`NextAuth route import: ${error.message}`);
    }

    console.log('🔍 Diagnosis complete');
    console.log('Errors found:', diagnostics.errors.length);

    return NextResponse.json({
      success: diagnostics.errors.length === 0,
      diagnostics,
      summary: {
        totalErrors: diagnostics.errors.length,
        criticalIssues: diagnostics.errors.filter((error: string) =>
          error.includes('NextAuth') || error.includes('Database') || error.includes('NEXTAUTH_SECRET')
        )
      }
    });

  } catch (error: any) {
    console.error('❌ Diagnosis failed:', error);

    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error instanceof Error ? error.stack : 'No stack trace',
      diagnostics,
      message: 'Diagnostic test failed'
    }, { status: 500 });
  }
}