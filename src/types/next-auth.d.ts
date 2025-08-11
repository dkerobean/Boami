import NextAuth from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      firstName: string;
      lastName: string;
      designation?: string;
      phone?: string;
      company?: string;
      department?: string;
      bio?: string;
      role?: {
        id: string;
        name: string;
        permissions: string[];
      };
      isEmailVerified: boolean;
      profileImage?: string;
      avatar?: string;
      status?: string;
      isActive?: boolean;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    firstName: string;
    lastName: string;
    designation?: string;
    phone?: string;
    company?: string;
    department?: string;
    bio?: string;
    role?: {
      id: string;
      name: string;
      permissions: string[];
    };
    isEmailVerified: boolean;
    profileImage?: string;
    avatar?: string;
    status?: string;
    isActive?: boolean;
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
    designation?: string;
    phone?: string;
    company?: string;
    department?: string;
    bio?: string;
    isEmailVerified: boolean;
    profileImage?: string;
    avatar?: string;
    status?: string;
    isActive?: boolean;
  }
}