import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { connectDB } from '@/lib/database/connection';
import { User, Role, Permission } from '@/lib/database/models';
import bcrypt from 'bcryptjs';

console.log('NextAuth configuration loading...');
console.log('Environment check:', {
  NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  NODE_ENV: process.env.NODE_ENV
});

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        console.log('NextAuth authorize called');

        if (!credentials?.email || !credentials?.password) {
          console.log('Missing credentials');
          return null;
        }

        try {
          console.log('Attempting database connection...');
          await connectDB();
          console.log('Database connected successfully');

          // Ensure models are registered by importing them
          console.log('Models imported:', { User: !!User, Role: !!Role, Permission: !!Permission });

          const user = await User.findOne({
            email: credentials.email.toLowerCase()
          }).select('+password').populate('role');

          if (!user) {
            console.log('User not found');
            return null;
          }

          console.log('User found:', { 
            id: user._id, 
            email: user.email, 
            isActive: user.isActive,
            hasPassword: !!user.password,
            passwordLength: user.password ? user.password.length : 0
          });

          // Check if user is active
          if (!user.isActive) {
            console.log('User is not active');
            return null;
          }

          // Verify password
          console.log('Attempting password verification...');
          const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
          console.log('Password verification result:', isPasswordValid);
          
          if (!isPasswordValid) {
            console.log('Invalid password for user:', user.email);
            return null;
          }

          // Update last login
          user.lastLogin = new Date();
          await user.save();

          const userResult = {
            id: (user._id as any).toString(),
            email: user.email,
            name: user.getFullName(),
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role ? {
              id: (user.role as any)._id.toString(),
              name: (user.role as any).name,
              permissions: (user.role as any).permissions || []
            } : undefined,
            isEmailVerified: user.isEmailVerified,
            profileImage: user.profileImage
          };

          console.log('Auth successful for user:', userResult.email);
          return userResult;
        } catch (error) {
          console.error('Auth error details:', error);
          console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
          return null;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  jwt: {
    secret: process.env.NEXTAUTH_SECRET,
    maxAge: 24 * 60 * 60, // 24 hours
  },
  pages: {
    signIn: '/auth/auth1/login',
    error: '/auth/error',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        token.isEmailVerified = user.isEmailVerified;
        token.profileImage = user.profileImage;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as any;
        session.user.firstName = token.firstName as string;
        session.user.lastName = token.lastName as string;
        session.user.isEmailVerified = token.isEmailVerified as boolean;
        session.user.profileImage = token.profileImage as string;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    }
  },
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      console.log('User signed in:', user.email);
    },
    async signOut({ session, token }) {
      console.log('User signed out:', session?.user?.email);
    }
  },
  debug: process.env.NODE_ENV === 'development',
};