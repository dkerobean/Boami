import NextAuth from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      firstName: string;
      lastName: string;
      role?: {
        id: string;
        name: string;
        permissions: string[];
      };
      isEmailVerified: boolean;
      profileImage?: string;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    firstName: string;
    lastName: string;
    role?: {
      id: string;
      name: string;
      permissions: string[];
    };
    isEmailVerified: boolean;
    profileImage?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role?: {
      id: string;
      name: string;
      permissions: string[];
    };
    firstName: string;
    lastName: string;
    isEmailVerified: boolean;
    profileImage?: string;
  }
}