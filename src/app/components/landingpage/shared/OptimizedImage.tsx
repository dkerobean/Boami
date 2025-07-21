import React, { useState } from 'react';
import Image from 'next/image';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  className?: string;
  style?: React.CSSProperties;
  fill?: boolean;
  sizes?: string;
  quality?: number;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  priority = false,
  className,
  style,
  fill = false,
  sizes,
  quality = 85,
  placeholder = 'empty',
  blurDataURL
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  if (hasError) {
    return (
      <Box
        sx={{
          width: fill ? '100%' : width,
          height: fill ? '100%' : height,
          backgroundColor: 'grey.200',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'grey.500',
          fontSize: '0.875rem'
        }}
      >
        Image not available
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'relative', width: fill ? '100%' : width, height: fill ? '100%' : height }}>
      {isLoading && (
        <Skeleton
          variant="rectangular"
          width={fill ? '100%' : width}
          height={fill ? '100%' : height}
          sx={{ position: fill ? 'absolute' : 'static', top: 0, left: 0, zIndex: 1 }}
        />
      )}
      <Image
        src={src}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        fill={fill}
        priority={priority}
        quality={quality}
        sizes={sizes}
        placeholder={placeholder}
        blurDataURL={blurDataURL}
        className={className}
        style={{
          ...style,
          opacity: isLoading ? 0 : 1,
          transition: 'opacity 0.3s ease-in-out'
        }}
        onLoad={handleLoad}
        onError={handleError}
      />
    </Box>
  );
};

export default OptimizedImage;