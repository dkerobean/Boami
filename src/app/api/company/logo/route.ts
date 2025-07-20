import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { JWTManager } from '@/lib/auth/jwt';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/svg+xml'];

/**
 * POST /api/company/logo - Upload company logo
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const currentUser = JWTManager.getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json({ 
        success: false,
        message: 'Unauthorized' 
      }, { status: 401 });
    }

    const data = await request.formData();
    const file: File | null = data.get('logo') as unknown as File;

    if (!file) {
      return NextResponse.json({ 
        success: false, 
        message: 'No logo file uploaded' 
      }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ 
        success: false, 
        message: `Invalid file type. Allowed types: ${ALLOWED_TYPES.map(t => t.split('/')[1].toUpperCase()).join(', ')}` 
      }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        success: false, 
        message: 'File size must be less than 2MB' 
      }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const filename = `company-logo-${timestamp}.${fileExtension}`;

    // Ensure uploads directory exists
    const uploadsDir = join(process.cwd(), 'public/uploads/company');
    try {
      await mkdir(uploadsDir, { recursive: true });
    } catch (error) {
      // Directory might already exist, continue
    }

    const filePath = join(uploadsDir, filename);
    await writeFile(filePath, buffer);

    const logoUrl = `/uploads/company/${filename}`;

    return NextResponse.json({ 
      success: true, 
      message: 'Logo uploaded successfully',
      data: { 
        logoUrl,
        filename,
        originalName: file.name,
        size: file.size,
        type: file.type
      } 
    }, { status: 200 });

  } catch (error) {
    console.error('Error uploading company logo:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to upload logo. Please try again.' 
    }, { status: 500 });
  }
}