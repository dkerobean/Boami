import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { JWTManager } from '@/lib/auth/jwt';
import User from '@/lib/database/models/User';
import { connectToDatabase } from '@/lib/database/mongoose-connection';

/**
 * POST /api/user/profile-image - Upload user profile image
 */
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    
    // Get current user from JWT token
    const currentUser = JWTManager.getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'No image file provided'
      }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.'
      }, { status: 400 });
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({
        success: false,
        error: 'File size too large. Maximum size is 5MB.'
      }, { status: 400 });
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'profiles');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const fileName = `${currentUser.email.replace('@', '_').replace('.', '_')}_${timestamp}.${fileExtension}`;
    const filePath = join(uploadsDir, fileName);

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Update user's profile image in database
    const profileImagePath = `/uploads/profiles/${fileName}`;
    const user = await User.findOneAndUpdate(
      { email: currentUser.email },
      { 
        profileImage: profileImagePath,
        avatar: profileImagePath // Keep both fields updated for compatibility
      },
      { new: true }
    ).select('-password');

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Profile image uploaded successfully',
      data: {
        profileImage: profileImagePath,
        user: user
      }
    });

  } catch (error) {
    console.error('Profile image upload error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to upload profile image'
    }, { status: 500 });
  }
}

/**
 * DELETE /api/user/profile-image - Delete user profile image
 */
export async function DELETE(request: NextRequest) {
  try {
    await connectToDatabase();
    
    // Get current user from JWT token
    const currentUser = JWTManager.getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    // Update user to remove profile image
    const user = await User.findOneAndUpdate(
      { email: currentUser.email },
      { 
        profileImage: null,
        avatar: null
      },
      { new: true }
    ).select('-password');

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Profile image removed successfully',
      data: { user }
    });

  } catch (error) {
    console.error('Profile image deletion error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to remove profile image'
    }, { status: 500 });
  }
}