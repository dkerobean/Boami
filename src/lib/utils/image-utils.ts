/**
 * Image utility functions for product images and fallbacks
 */

// Available product placeholder images
export const PRODUCT_PLACEHOLDER_IMAGES = [
  '/images/products/s1.jpg',
  '/images/products/s2.jpg',
  '/images/products/s3.jpg',
  '/images/products/s4.jpg',
  '/images/products/s5.jpg',
  '/images/products/s6.jpg',
  '/images/products/s7.jpg',
  '/images/products/s8.jpg',
  '/images/products/s9.jpg',
  '/images/products/s10.jpg',
  '/images/products/s11.jpg',
  '/images/products/s12.jpg',
] as const;

// Default fallback image
export const DEFAULT_PRODUCT_IMAGE = '/images/products/s1.jpg';

// No-image placeholder
export const NO_IMAGE_PLACEHOLDER = '/images/svgs/no-data.webp';

/**
 * Checks if a URL is a blob URL (temporary browser URL)
 */
export function isBlobUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  return url.startsWith('blob:');
}

/**
 * Checks if a URL is a data URL (base64 encoded)
 */
export function isDataUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  return url.startsWith('data:');
}

/**
 * Validates if a string is a valid, permanent image URL
 * Rejects blob URLs and other temporary URLs, but accepts uploaded image URLs
 */
export function isValidImageUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  
  // Reject blob URLs (temporary browser URLs)
  if (isBlobUrl(url)) {
    return false;
  }
  
  // Reject data URLs for database storage (too large)
  if (isDataUrl(url)) {
    return false;
  }
  
  // Accept uploaded image URLs (starts with /uploads/products/)
  if (url.startsWith('/uploads/products/')) {
    return true;
  }
  
  try {
    // Check if it's a relative URL
    if (url.startsWith('/')) {
      return true;
    }
    
    // Try to construct URL for absolute URLs
    new URL(url);
    
    // Check if it has an image extension
    const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?.*)?$/i;
    return imageExtensions.test(url);
  } catch {
    return false;
  }
}

/**
 * Gets validation message for invalid image URLs
 */
export function getImageUrlValidationMessage(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') {
    return 'Image URL is required';
  }
  
  if (isBlobUrl(url)) {
    return 'This is a temporary URL that cannot be saved. Please upload the file or use a hosted URL.';
  }
  
  if (isDataUrl(url)) {
    return 'Base64 images are too large for storage. Please upload the file or use a hosted image URL.';
  }
  
  if (!isValidImageUrl(url)) {
    return 'Please enter a valid image URL or upload an image file.';
  }
  
  return null;
}

/**
 * Gets a deterministic placeholder image based on a string (like product title or ID)
 */
export function getPlaceholderImage(seed?: string): string {
  if (!seed) return PRODUCT_PLACEHOLDER_IMAGES[0];
  
  // Create a simple hash from the seed to get consistent placeholder
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  const index = Math.abs(hash) % PRODUCT_PLACEHOLDER_IMAGES.length;
  return PRODUCT_PLACEHOLDER_IMAGES[index];
}

/**
 * Gets the best image source with fallback logic
 */
export function getImageSource(
  primarySrc?: string | null,
  fallbackSrc?: string | null,
  seed?: string
): string {
  // Try primary source first (but only if it's not a blob URL)
  if (primarySrc && !isBlobUrl(primarySrc) && isValidImageUrl(primarySrc)) {
    return primarySrc;
  }
  
  // Try fallback source (but only if it's not a blob URL)
  if (fallbackSrc && !isBlobUrl(fallbackSrc) && isValidImageUrl(fallbackSrc)) {
    return fallbackSrc;
  }
  
  // For any blob URLs or invalid URLs, show a helpful placeholder
  if (isBlobUrl(primarySrc) || isBlobUrl(fallbackSrc)) {
    // Use a specific placeholder that indicates the image needs to be re-uploaded with a hosted URL
    return getPlaceholderImage(seed);
  }
  
  // Use deterministic placeholder for any other cases
  return getPlaceholderImage(seed);
}

/**
 * Optimizes image URLs for different sizes
 */
export function getOptimizedImageUrl(
  src: string,
  width: number,
  height: number,
  quality: number = 75
): string {
  // If it's a local image, return as-is (Next.js will handle optimization)
  if (src.startsWith('/')) {
    return src;
  }
  
  // For external URLs, you could implement optimization services here
  // For now, return the original URL
  return src;
}

/**
 * Creates a srcSet for responsive images
 */
export function createImageSrcSet(src: string, sizes: number[]): string {
  if (src.startsWith('/')) {
    // For local images, let Next.js handle this
    return '';
  }
  
  // For external images, create srcSet manually
  return sizes
    .map(size => `${getOptimizedImageUrl(src, size, size)} ${size}w`)
    .join(', ');
}

/**
 * Validates multiple image sources (for galleries)
 */
export function validateImageGallery(images: (string | null | undefined)[]): string[] {
  return images
    .filter(isValidImageUrl)
    .map(img => img!) // Type assertion since we filtered nulls
    .slice(0, 10); // Limit gallery size
}

/**
 * Creates alt text for product images
 */
export function createImageAltText(productTitle?: string, imageIndex?: number): string {
  const baseTitle = productTitle || 'Product';
  
  if (imageIndex !== undefined && imageIndex > 0) {
    return `${baseTitle} - Image ${imageIndex + 1}`;
  }
  
  return `${baseTitle} product image`;
}

/**
 * Determines image priority for loading
 */
export function shouldPrioritizeImage(
  index: number,
  isAboveFold: boolean = false,
  isMainImage: boolean = false
): boolean {
  // Prioritize main images and first few items above the fold
  return isMainImage || (isAboveFold && index < 3);
}

/**
 * Image size presets for different use cases
 */
export const IMAGE_SIZES = {
  thumbnail: { width: 56, height: 56 },
  small: { width: 100, height: 100 },
  medium: { width: 200, height: 200 },
  large: { width: 400, height: 400 },
  hero: { width: 800, height: 600 },
  gallery: { width: 300, height: 300 },
} as const;

/**
 * Responsive sizes attribute for different breakpoints
 */
export const RESPONSIVE_SIZES = {
  thumbnail: '(max-width: 768px) 40px, 56px',
  small: '(max-width: 768px) 80px, 100px',
  medium: '(max-width: 768px) 150px, 200px',
  large: '(max-width: 768px) 300px, 400px',
  hero: '(max-width: 768px) 100vw, 800px',
} as const;

/**
 * Checks if an image URL might be broken and suggests retrying
 */
export function shouldRetryImageLoad(url: string, attempts: number = 0): boolean {
  // Don't retry local images or after too many attempts
  if (url.startsWith('/') || attempts >= 2) {
    return false;
  }
  
  // Retry external images once
  return attempts < 1;
}