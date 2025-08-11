import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/database/connection';
import { seedRBAC, getDefaultRoleId } from '@/lib/database/seeders/rbac-seeder';
import User from '@/lib/database/models/User';
import bcrypt from 'bcryptjs';

/**
 * POST /api/dev/init-rbac
 * Development endpoint to initialize RBAC system and create test user
 */
export async function POST(request: NextRequest) {
  try {
    // Only allow in development
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ 
        success: false,
        message: 'This endpoint is only available in development mode' 
      }, { status: 403 });
    }

    console.log('🚀 Initializing RBAC system...');

    await connectToDatabase();

    // Force RBAC seeding
    await seedRBAC();

    // Get the User role ID
    const userRoleId = await getDefaultRoleId('User');
    const adminRoleId = await getDefaultRoleId('Admin');

    if (!userRoleId || !adminRoleId) {
      throw new Error('Failed to get default role IDs');
    }

    // Create test admin user
    const existingAdmin = await User.findOne({ email: 'admin@example.com' });
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('admin123', 12);
      
      const adminUser = await User.create({
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@example.com',
        password: hashedPassword,
        role: adminRoleId,
        phone: '+1234567890',
        company: 'BOAMI Inc',
        designation: 'System Administrator',
        department: 'IT',
        bio: 'System administrator with full access',
        isEmailVerified: true,
        isActive: true
      });

      console.log('✅ Created admin user:', adminUser.email);
    } else {
      console.log('Admin user already exists');
    }

    // Create test regular user
    const existingUser = await User.findOne({ email: 'test@example.com' });
    if (!existingUser) {
      const hashedPassword = await bcrypt.hash('test123', 12);
      
      const testUser = await User.create({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: hashedPassword,
        role: userRoleId,
        phone: '+9876543210',
        company: 'Test Company',
        designation: 'Developer',
        department: 'Engineering',
        bio: 'Test user for development',
        isEmailVerified: true,
        isActive: true
      });

      console.log('✅ Created test user:', testUser.email);
    } else {
      console.log('Test user already exists');
    }

    return NextResponse.json({
      success: true,
      message: 'RBAC system initialized successfully',
      testUsers: [
        { email: 'admin@example.com', password: 'admin123', role: 'Admin' },
        { email: 'test@example.com', password: 'test123', role: 'User' }
      ]
    }, { status: 200 });

  } catch (error) {
    console.error('RBAC initialization error:', error);
    return NextResponse.json({ 
      success: false,
      message: 'Failed to initialize RBAC system',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}