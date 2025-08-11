import { NextRequest, NextResponse } from 'next/server';
import { put, del } from '@vercel/blob';
import fs from 'node:fs';
import path from 'node:path';
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

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      const { response, status } = createApiResponse(
        false,
        null,
        { code: 'VALIDATION_ERROR', message: 'File size too large. Maximum size is 5MB.' },
        400
      );
      return NextResponse.json(response, { status });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const fileName = `${authResult.user.id}_${timestamp}.${fileExtension}`;

    let profileImagePath: string;
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

    if (blobToken) {
      // Upload to Vercel Blob storage
      const blob = await put(`profiles/${fileName}`, file, {
        access: 'public',
        token: blobToken,
        contentType: file.type,
      });
      profileImagePath = blob.url;
    } else {
      // Fallback for local development when no Blob token is configured
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'profiles');
      try {
        fs.mkdirSync(uploadsDir, { recursive: true });
      } catch (_) {}

      const fileBuffer = Buffer.from(await file.arrayBuffer());
      const localFilename = `${authResult.user.id}_${timestamp}.${fileExtension}`;
      const localPath = path.join(uploadsDir, localFilename);
      fs.writeFileSync(localPath, fileBuffer);
      profileImagePath = `/uploads/profiles/${localFilename}`;
    }
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

    // Delete from Vercel Blob if exists
    if (existingUser.profileImage && existingUser.profileImage.includes('vercel-storage.com')) {
      try {
        await del(existingUser.profileImage);
      } catch (blobError) {
        console.warn('Failed to delete blob:', blobError);
      }
    }
    // If existing image was stored locally, attempt to remove it as cleanup (best-effort)
    if (existingUser.profileImage && existingUser.profileImage.startsWith('/uploads/')) {
      try {
        const localFilePath = path.join(process.cwd(), 'public', existingUser.profileImage);
        if (fs.existsSync(localFilePath)) {
          fs.unlinkSync(localFilePath);
        }
      } catch (localDelErr) {
        console.warn('Failed to delete local image:', localDelErr);
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