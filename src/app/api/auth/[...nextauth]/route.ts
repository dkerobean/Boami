import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth.config';

let handler;

try {
  console.log('Creating NextAuth handler...');
  handler = NextAuth(authOptions);
  console.log('NextAuth handler created successfully');
} catch (error) {
  console.error('Error creating NextAuth handler:', error);
  console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
  throw error;
}

export { handler as GET, handler as POST };