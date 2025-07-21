import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { styled } from '@mui/material/styles';
import { useMediaQuery, Theme } from '@mui/material';
import Image from 'next/image';
import { AnimationConfig } from '@/types/landing-page';

const AnimationContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1),
  backgroundColor: 'transparent',
  borderRadius: 0,
  overflow: 'hidden',
  position: 'relative',
  height: '100%',
  width: '100%',
  minHeight: '500px',

  [theme.breakpoints.up('md')]: {
    minHeight: '600px',
    padding: theme.spacing(2),
  },

  [theme.breakpoints.up('lg')]: {
    minHeight: '100vh',
    padding: theme.spacing(2),
  },
}));

const SliderBox = styled(Box)<{
  speed: number;
  direction: 'up' | 'down';
  isPaused: boolean;
}>(({ speed, direction, isPaused }) => ({
  '@keyframes slideup': {
    '0%': {
      transform: 'translate3d(0, 0, 0)',
    },
    '100%': {
      transform: 'translate3d(0px, -100%, 0px)',
    },
  },
  '@keyframes slidedown': {
    '0%': {
      transform: 'translate3d(0, -100%, 0)',
    },
    '100%': {
      transform: 'translate3d(0px, 0, 0px)',
    },
  },
  animation: isPaused
    ? 'none'
    : `${direction === 'up' ? 'slideup' : 'slidedown'} ${speed}s linear infinite`,
  willChange: 'transform',
}));

const ImageBox = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  borderRadius: theme.spacing(2),
  overflow: 'hidden',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
  background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
  border: '1px solid rgba(255, 255, 255, 0.8)',
  backdropFilter: 'blur(10px)',
  position: 'relative',

  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(145deg, rgba(25, 118, 210, 0.05) 0%, rgba(76, 175, 80, 0.05) 100%)',
    opacity: 0,
    transition: 'opacity 0.3s ease',
    zIndex: 1,
  },

  '&:hover': {
    transform: 'scale(1.05) translateY(-8px)',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',

    '&::before': {
      opacity: 1,
    },
  },

  '& img': {
    transition: 'transform 0.4s ease',
  },

  '&:hover img': {
    transform: 'scale(1.1)',
  },
}));

interface ScrollingImageAnimationProps {
  config: AnimationConfig;
  className?: string;
}

const ScrollingImageAnimation: React.FC<ScrollingImageAnimationProps> = ({
  config,
  className,
}) => {
  const [isPaused, setIsPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const isMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));

  const { images, speed, direction } = config;

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Pause animation when user prefers reduced motion
  useEffect(() => {
    setIsPaused(reducedMotion);
  }, [reducedMotion]);

  // Split images into two columns for the scrolling effect
  const leftImages = images.filter((_, index) => index % 2 === 0);
  const rightImages = images.filter((_, index) => index % 2 === 1);

  // Fallback for when images are not available
  const fallbackImages = [
    '/images/landingpage/bannerimg1.svg',
    '/images/landingpage/bannerimg2.svg',
  ];

  const displayLeftImages = leftImages.length > 0 ? leftImages : [fallbackImages[0]];
  const displayRightImages = rightImages.length > 0 ? rightImages : [fallbackImages[1]];

  return (
    <AnimationContainer
      className={className}
      onMouseEnter={() => !reducedMotion && setIsPaused(true)}
      onMouseLeave={() => !reducedMotion && setIsPaused(false)}
    >
      <Stack direction="row" spacing={isMobile ? 1 : 2} height="100%">
        {/* Left Column - Scrolling Up */}
        <Box flex={1}>
          <SliderBox speed={speed} direction="up" isPaused={isPaused}>
            {displayLeftImages.map((image, index) => (
              <ImageBox key={`left-${index}-1`}>
                <Image
                  src={image}
                  alt={`E-commerce dashboard ${index + 1}`}
                  width={300}
                  height={400}
                  priority={index < 1}
                  style={{
                    width: '100%',
                    height: 'auto',
                    display: 'block',
                  }}
                  onError={(e) => {
                    // Fallback to default image if loading fails
                    const target = e.target as HTMLImageElement;
                    target.src = fallbackImages[0];
                  }}
                />
              </ImageBox>
            ))}
          </SliderBox>
          <SliderBox speed={speed} direction="up" isPaused={isPaused}>
            {displayLeftImages.map((image, index) => (
              <ImageBox key={`left-${index}-2`}>
                <Image
                  src={image}
                  alt={`E-commerce dashboard ${index + 1}`}
                  width={300}
                  height={400}
                  style={{
                    width: '100%',
                    height: 'auto',
                    display: 'block',
                  }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = fallbackImages[0];
                  }}
                />
              </ImageBox>
            ))}
          </SliderBox>
        </Box>

        {/* Right Column - Scrolling Down */}
        <Box flex={1}>
          <SliderBox speed={speed} direction="down" isPaused={isPaused}>
            {displayRightImages.map((image, index) => (
              <ImageBox key={`right-${index}-1`}>
                <Image
                  src={image}
                  alt={`E-commerce dashboard ${index + 1}`}
                  width={300}
                  height={400}
                  priority={index < 1}
                  style={{
                    width: '100%',
                    height: 'auto',
                    display: 'block',
                  }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = fallbackImages[1];
                  }}
                />
              </ImageBox>
            ))}
          </SliderBox>
          <SliderBox speed={speed} direction="down" isPaused={isPaused}>
            {displayRightImages.map((image, index) => (
              <ImageBox key={`right-${index}-2`}>
                <Image
                  src={image}
                  alt={`E-commerce dashboard ${index + 1}`}
                  width={300}
                  height={400}
                  style={{
                    width: '100%',
                    height: 'auto',
                    display: 'block',
                  }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = fallbackImages[1];
                  }}
                />
              </ImageBox>
            ))}
          </SliderBox>
        </Box>
      </Stack>
    </AnimationContainer>
  );
};

export default ScrollingImageAnimation;