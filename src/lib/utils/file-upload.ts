/**
 * File upload utility functions for product images
 */

// Allowed image types
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/webp'
];

// Maximum file size (5MB)
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Validates if a file is a valid image for upload
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`
    };
  }

  return { valid: true };
}

/**
 * Uploads a file to the product image endpoint
 */
export async function uploadProductImage(file: File): Promise<{
  success: boolean;
  url?: string;
  error?: string;
  data?: any;
}> {
  try {
    // Validate file first
    const validation = validateImageFile(file);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      };
    }

    // Create form data
    const formData = new FormData();
    formData.append('file', file);

    // Upload to API
    const response = await fetch('/api/upload/product-image', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error || 'Upload failed'
      };
    }

    return {
      success: true,
      url: result.data.url,
      data: result.data
    };

  } catch (error) {
    console.error('Upload error:', error);
    return {
      success: false,
      error: 'Failed to upload image'
    };
  }
}

/**
 * Uploads multiple files to the product image endpoint
 */
export async function uploadMultipleProductImages(files: File[]): Promise<{
  success: boolean;
  results: Array<{
    file: string;
    success: boolean;
    url?: string;
    error?: string;
  }>;
}> {
  const results = await Promise.all(
    files.map(async (file) => {
      const result = await uploadProductImage(file);
      return {
        file: file.name,
        success: result.success,
        url: result.url,
        error: result.error
      };
    })
  );

  const allSuccessful = results.every(result => result.success);

  return {
    success: allSuccessful,
    results
  };
}

/**
 * Checks if a URL is an uploaded image URL
 */
export function isUploadedImageUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  return url.startsWith('/uploads/products/');
}

/**
 * Gets a user-friendly file size string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Generates a preview URL for a file (for immediate display)
 */
export function generateFilePreview(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Cleans up a blob URL to prevent memory leaks
 */
export function cleanupBlobUrl(url: string): void {
  if (url && url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}