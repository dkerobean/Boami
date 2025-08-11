import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync, unlinkSync } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { authenticateApiRequest, createApiResponse } from '@/lib/auth/nextauth-middleware';
import User from '@/lib/database/models/User';
import { connectToDatabase } from '@/lib/database/connection';

/**
 * POST /api/user/profile-image - Upload user profile image
 */
export async function POST(request: NextRequest) {
  try {
    console.log('📸 Profile image upload API called');

    // Verify authentication using NextAuth middleware
    const authResult = await authenticateApiRequest(request);
    if (!authResult.success || !authResult.user) {
      console.log('❌ Authentication failed:', authResult.error);
      const { response, status } = createApiResponse(false, null, authResult.error, 401);
      return NextResponse.json(response, { status });
    }

    console.log('✅ User authenticated:', authResult.user.email);

    await connectToDatabase();

    // Get current user to check for existing profile image
    const existingUser = await User.findOne({ _id: authResult.user.id });

    const formData = await request.formData();
    const file = formData.get('profileImage') as File;

    if (!file) {
      const { response, status } = createApiResponse(
        false,
        null,
        { code: 'VALIDATION_ERROR', message: 'No image file provided' },
        400
      );
      return NextResponse.json(response, { status });
    }

    // Validate file type (allow GIF to match UI copy)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      const { response, status } = createApiResponse(
        false,
        null,
        { code: 'VALIDATION_ERROR', message: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.' },
        400
      );
      return NextResponse.json(response, { status });
    }

    // Validate file size (800KB limit to match frontend)
    const maxSize = 800 * 1024; // 800KB
    if (file.size > maxSize) {
      const { response, status } = createApiResponse(
        false,
        null,
        { code: 'VALIDATION_ERROR', message: 'File size too large. Maximum size is 800KB.' },
        400
      );
      return NextResponse.json(response, { status });
    }

    // Generate unique filename with random string for security
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const fileExtension = file.name.split('.').pop();
    const uniqueFilename = `${authResult.user.id}_${timestamp}_${randomString}.${fileExtension}`;

    // Define upload path
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'profiles');
    const filePath = path.join(uploadsDir, uniqueFilename);

    // Ensure upload directory exists
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Delete old profile image if it exists
    if (existingUser?.profileImage && existingUser.profileImage.startsWith('/uploads/')) {
      try {
        const oldFilePath = path.join(process.cwd(), 'public', existingUser.profileImage);
        if (existsSync(oldFilePath)) {
          unlinkSync(oldFilePath);
          console.log('✅ Successfully deleted old profile image:', existingUser.profileImage);
        }
      } catch (deleteError) {
        console.warn('⚠️ Failed to delete old profile image:', deleteError);
        // Continue with upload - deletion failure shouldn't block new upload
      }
    }

    // Set the public URL path
    const profileImagePath = `/uploads/profiles/${uniqueFilename}`;
    const user = await User.findOneAndUpdate(
      { _id: authResult.user.id },
      {
        profileImage: profileImagePath,
        avatar: profileImagePath // Keep both fields updated for compatibility
      },
      { new: true }
    ).select('-password');

    if (!user) {
      const { response, status } = createApiResponse(
        false,
        null,
        { code: 'NOT_FOUND', message: 'User not found' },
        404
      );
      return NextResponse.json(response, { status });
    }

    const { response, status } = createApiResponse(
      true,
      {
        profileImage: profileImagePath,
        user: user
      },
      undefined,
      200
    );
    return NextResponse.json(response, { status });

  } catch (error) {
    console.error('Profile image upload error:', error);
    const { response, status } = createApiResponse(
      false,
      null,
      { code: 'INTERNAL_ERROR', message: 'Failed to upload profile image' },
      500
    );
    return NextResponse.json(response, { status });
  }
}

/**
 * DELETE /api/user/profile-image - Delete user profile image
 */
export async function DELETE(request: NextRequest) {
  try {
    console.log('🗑️ Profile image deletion API called');

    // Verify authentication using NextAuth middleware
    const authResult = await authenticateApiRequest(request);
    if (!authResult.success || !authResult.user) {
      console.log('❌ Authentication failed:', authResult.error);
      const { response, status } = createApiResponse(false, null, authResult.error, 401);
      return NextResponse.json(response, { status });
    }

    console.log('✅ User authenticated:', authResult.user.email);

    await connectToDatabase();

    // Get current user to find existing profile image
    const existingUser = await User.findOne({ _id: authResult.user.id });

    if (!existingUser) {
      const { response, status } = createApiResponse(
        false,
        null,
        { code: 'NOT_FOUND', message: 'User not found' },
        404
      );
      return NextResponse.json(response, { status });
    }

    // Delete existing profile image file if it exists
    if (existingUser.profileImage && existingUser.profileImage.startsWith('/uploads/')) {
      try {
        const localFilePath = path.join(process.cwd(), 'public', existingUser.profileImage);
        if (existsSync(localFilePath)) {
          unlinkSync(localFilePath);
          console.log('✅ Successfully deleted existing profile image:', existingUser.profileImage);
        }
      } catch (deleteError) {
        console.warn('⚠️ Failed to delete existing profile image:', deleteError);
        // Continue with the operation - deletion failure shouldn't block the update
      }
    }

    // Update user to remove profile image
    const user = await User.findOneAndUpdate(
      { _id: authResult.user.id },
      {
        profileImage: null,
        avatar: null
      },
      { new: true }
    ).select('-password');

    const { response, status } = createApiResponse(
      true,
      { user },
      undefined,
      200
    );
    return NextResponse.json(response, { status });

  } catch (error) {
    console.error('Profile image deletion error:', error);
    const { response, status } = createApiResponse(
      false,
      null,
      { code: 'INTERNAL_ERROR', message: 'Failed to remove profile image' },
      500
    );
    return NextResponse.json(response, { status });
  }
}