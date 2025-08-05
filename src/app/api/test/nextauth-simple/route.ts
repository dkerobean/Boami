import { NextRequest, NextResponse } from 'next/server';

/**
 * Test endpoint to check if NextAuth can be imported and configured without database
 */
export async function GET(request: NextRequest) {
  try {
    console.log('Testing NextAuth imports...');

    // Test NextAuth import
    const NextAuth = await import('next-auth');
    console.log('✅ NextAuth import successful');

    // Test CredentialsProvider import
    const CredentialsProvider = await import('next-auth/providers/credentials');
    console.log('✅ CredentialsProvider import successful');

    // Test basic NextAuth configuration without database
    const basicAuthOptions = {
      providers: [
        CredentialsProvider.default({
          name: 'credentials',
          credentials: {
            email: { label: 'Email', type: 'email' },
            password: { label: 'Password', type: 'password' }
          },
          async authorize(credentials) {
            console.log('Basic authorize called');
            return null; // Just return null for testing
          }
        })
      ],
      session: {
        strategy: 'jwt' as const,
      },
      jwt: {
        secret: process.env.NEXTAUTH_SECRET,
      },
      debug: true,
    };

    console.log('✅ Basic NextAuth configuration created');

    // Test NextAuth handler creation
    const handler = NextAuth.default(basicAuthOptions);
    console.log('✅ NextAuth handler created successfully');

    return NextResponse.json({
      success: true,
      message: 'NextAuth imports and basic configuration successful',
      environment: {
        NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
        NEXTAUTH_URL: process.env.NEXTAUTH_URL,
        NODE_ENV: process.env.NODE_ENV
      }
    });
  } catch (error: any) {
    console.error('❌ NextAuth test error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');

    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error instanceof Error ? error.stack : 'No stack trace',
      message: 'NextAuth import or configuration failed'
    }, { status: 500 });
  }
}