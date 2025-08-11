import { getServerSession } from 'next-auth';
import { authOptions } from './nextauth.config';
import User from '@/lib/database/models/User';
import { connectToDatabase } from '@/lib/database/connection';

/**
 * Utility functions for NextAuth session management
 */

/**
 * Refresh user data in NextAuth session after profile updates
 * This updates the JWT token with fresh user data from the database
 */
export async function refreshUserSession(userEmail: string): Promise<void> {
  try {
    await connectToDatabase();
    
    // Fetch fresh user data from database
    const user = await User.findOne({ email: userEmail })
      .populate('role')
      .select('-password');

    if (!user) {
      throw new Error('User not found');
    }

    // Note: NextAuth doesn't provide a direct way to update an active session
    // The session will be refreshed on the next request due to the JWT callback
    // This function serves as a placeholder for future session refresh logic
    console.log(`Session refresh triggered for user: ${userEmail}`);
    
    return;
  } catch (error) {
    console.error('Error refreshing user session:', error);
    throw error;
  }
}

/**
 * Get fresh user data that matches NextAuth session structure
 */
export async function getFreshUserData(userEmail: string) {
  try {
    await connectToDatabase();
    
    const user = await User.findOne({ email: userEmail })
      .populate('role')
      .select('-password');

    if (!user) {
      return null;
    }

    return {
      id: user._id.toString(),
      email: user.email,
      name: user.getFullName(),
      firstName: user.firstName,
      lastName: user.lastName,
      designation: user.designation,
      phone: user.phone,
      company: user.company,
      department: user.department,
      bio: user.bio,
      role: user.role ? {
        id: (user.role as any)._id.toString(),
        name: (user.role as any).name,
        permissions: (user.role as any).permissions || []
      } : undefined,
      isEmailVerified: user.isEmailVerified,
      profileImage: user.profileImage,
      avatar: user.avatar,
      status: user.status,
      isActive: user.isActive
    };
  } catch (error) {
    console.error('Error fetching fresh user data:', error);
    throw error;
  }
}