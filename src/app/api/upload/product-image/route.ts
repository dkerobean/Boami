import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';

// Allowed image types
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/webp'
];

// Maximum file size (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * POST /api/upload/product-image - Upload product image
 * Accepts multipart/form-data with image file
 * Returns permanent URL for uploaded image
 */
export async function POST(request: NextRequest) {
  console.log('🔧 Upload API called:', {
    method: request.method,
    url: request.url,
    headers: Object.fromEntries(request.headers.entries())
  });

  try {
    console.log('🔧 Parsing FormData...');
    const formData = await request.formData();
    console.log('🔧 FormData entries:', Array.from(formData.entries()).map(([key, value]) => [
      key, 
      value instanceof File ? `File: ${value.name} (${value.size} bytes, ${value.type})` : value
    ]));
    
    const file = formData.get('file') as File;
    console.log('🔧 Extracted file:', {
      hasFile: !!file,
      name: file?.name,
      size: file?.size,
      type: file?.type
    });

    if (!file) {
      console.error('🔧 No file provided in FormData');
      return NextResponse.json({
        success: false,
        error: 'No file provided'
      }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'
      }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({
        success: false,
        error: 'File too large. Maximum size is 5MB.'
      }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const fileExtension = path.extname(file.name);
    const uniqueFilename = `product-${timestamp}-${randomString}${fileExtension}`;

    // Define upload path
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'products');
    const filePath = path.join(uploadDir, uniqueFilename);

    // Ensure upload directory exists
    console.log('🔧 Checking upload directory:', uploadDir);
    if (!existsSync(uploadDir)) {
      console.log('🔧 Upload directory does not exist, creating...');
      await mkdir(uploadDir, { recursive: true });
      console.log('🔧 Upload directory created successfully');
    } else {
      console.log('🔧 Upload directory already exists');
    }

    // Convert file to buffer and save
    console.log('🔧 Converting file to buffer...');
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    console.log('🔧 Buffer created, size:', buffer.length);
    
    console.log('🔧 Writing file to:', filePath);
    await writeFile(filePath, buffer);
    console.log('🔧 File written successfully');

    // Return the public URL
    const publicUrl = `/uploads/products/${uniqueFilename}`;
    console.log('🔧 Generated public URL:', publicUrl);

    return NextResponse.json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        url: publicUrl,
        filename: uniqueFilename,
        originalName: file.name,
        size: file.size,
        type: file.type
      }
    });

  } catch (error) {
    console.error('🔧 Upload error occurred:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      type: error?.constructor?.name
    });
    return NextResponse.json({
      success: false,
      error: 'Failed to upload file',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

/**
 * GET /api/upload/product-image - Get upload info (for testing)
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Product image upload endpoint',
    info: {
      allowedTypes: ALLOWED_TYPES,
      maxFileSize: `${MAX_FILE_SIZE / (1024 * 1024)}MB`,
      endpoint: 'POST /api/upload/product-image'
    }
  });
}