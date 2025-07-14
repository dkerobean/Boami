"use client";
import React, { useState } from 'react';
import Image from 'next/image';
import { Avatar, Box } from '@mui/material';
import { IconPhoto } from '@tabler/icons-react';
import { isValidImageUrl, isBlobUrl } from '@/lib/utils/image-utils';

interface ProductImageProps {
  src?: string;
  alt?: string;
  title?: string;
  width?: number;
  height?: number;
  variant?: 'circular' | 'rounded' | 'square';
  placeholder?: 'avatar' | 'icon' | 'text';
  fallbackSrc?: string;
  className?: string;
  sx?: any;
  priority?: boolean;
  sizes?: string;
}

/**
 * Enhanced ProductImage component with automatic fallbacks and placeholder handling
 * Supports both Next.js Image optimization and MUI Avatar fallbacks
 */
const ProductImage: React.FC<ProductImageProps> = ({
  src,
  alt = 'Product image',
  title,
  width = 56,
  height = 56,
  variant = 'circular',
  placeholder = 'avatar',
  fallbackSrc,
  className,
  sx,
  priority = false,
  sizes,
}) => {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Determine if we should use the image or show placeholder
  // Don't show blob URLs as they're temporary and will likely fail
  const shouldShowImage = src && !imageError && isValidImageUrl(src) && !isBlobUrl(src);
  
  // Get fallback image based on product category or use default
  const getDefaultFallback = () => {
    const fallbacks = [
      '/images/products/s1.jpg',
      '/images/products/s2.jpg', 
      '/images/products/s3.jpg',
      '/images/products/s4.jpg',
      '/images/products/s5.jpg',
      '/images/products/s6.jpg',
    ];
    
    // Use title to determine which fallback to use for consistency
    const index = title ? title.length % fallbacks.length : 0;
    return fallbacks[index];
  };

  const finalFallbackSrc = fallbackSrc || getDefaultFallback();

  // Handle image load error
  const handleImageError = () => {
    if (isBlobUrl(src)) {
      console.warn(`Blob URL detected and rejected: ${src}. Using fallback image instead.`);
    } else {
      console.warn(`Failed to load image: ${src}`);
    }
    setImageError(true);
    setIsLoading(false);
  };

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  // Handle fallback image error
  const handleFallbackError = () => {
    console.warn(`Failed to load fallback image: ${finalFallbackSrc}`);
    setImageError(true);
  };

  // For square/rounded variants, use Next.js Image
  if (variant === 'square' || variant === 'rounded') {
    return (
      <Box
        className={className}
        sx={{
          position: 'relative',
          width,
          height,
          borderRadius: variant === 'rounded' ? 2 : 0,
          overflow: 'hidden',
          bgcolor: 'grey.100',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...sx,
        }}
      >
        {shouldShowImage ? (
          <Image
            src={src!}
            alt={alt}
            width={width}
            height={height}
            className={className}
            priority={priority}
            sizes={sizes}
            onError={handleImageError}
            onLoad={handleImageLoad}
            style={{
              objectFit: 'cover',
              width: '100%',
              height: '100%',
            }}
          />
        ) : !imageError ? (
          <Image
            src={finalFallbackSrc}
            alt={alt}
            width={width}
            height={height}
            priority={priority}
            onError={handleFallbackError}
            style={{
              objectFit: 'cover',
              width: '100%',
              height: '100%',
            }}
          />
        ) : (
          // Final fallback when all images fail
          <Box
            sx={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'grey.100',
              color: 'grey.500',
            }}
          >
            <IconPhoto size={width * 0.4} />
          </Box>
        )}
        
        {/* Loading state */}
        {isLoading && shouldShowImage && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'grey.100',
            }}
          >
            <IconPhoto size={width * 0.3} color="currentColor" />
          </Box>
        )}
      </Box>
    );
  }

  // For circular variant, use MUI Avatar with enhanced fallback
  return (
    <Avatar
      src={shouldShowImage ? src : finalFallbackSrc}
      alt={alt}
      className={className}
      sx={{
        width,
        height,
        bgcolor: 'primary.light',
        color: 'primary.main',
        ...sx,
      }}
      onError={handleImageError}
    >
      {placeholder === 'icon' ? (
        <IconPhoto size={width * 0.4} />
      ) : placeholder === 'text' && title ? (
        title.charAt(0).toUpperCase()
      ) : (
        <IconPhoto size={width * 0.4} />
      )}
    </Avatar>
  );
};

export default ProductImage;