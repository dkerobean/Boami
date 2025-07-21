import { NextRequest, NextResponse } from 'next/server';
import { FileCleanup } from '@/lib/utils/file-cleanup';

/**
 * DELETE /api/cleanup/product-image - Clean up old product images
 * Accepts JSON body with imageUrl to delete
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageUrl } = body;

    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Image URL is required'
      }, { status: 400 });
    }

    const deleted = await FileCleanup.deleteProductImage(imageUrl);

    return NextResponse.json({
      success: true,
      message: deleted ? 'Image deleted successfully' : 'Image not found or not deleted',
      deleted
    });

  } catch (error) {
    console.error('Image cleanup error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to cleanup image'
    }, { status: 500 });
  }
}