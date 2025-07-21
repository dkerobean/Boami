import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView, useAnimation } from 'framer-motion';
import Box from '@mui/material/Box';

// Fade In Animation Component
interface FadeInProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  distance?: number;
}

export const FadeIn: React.FC<FadeInProps> = ({
  children,
  delay = 0,
  duration = 0.6,
  direction = 'up',
  distance = 50,
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const controls = useAnimation();

  useEffect(() => {
    if (isInView) {
      controls.start('visible');
    }
  }, [isInView, controls]);

  const getInitialPosition = () => {
    switch (direction) {
      case 'up':
        return { y: distance, opacity: 0 };
      case 'down':
        return { y: -distance, opacity: 0 };
      case 'left':
        return { x: distance, opacity: 0 };
      case 'right':
        return { x: -distance, opacity: 0 };
      default:
        return { y: distance, opacity: 0 };
    }
  };

  return (
    <motion.div
      ref={ref}
      initial={getInitialPosition()}
      animate={controls}
      variants={{
        visible: {
          x: 0,
          y: 0,
          opacity: 1,
          transition: {
            duration,
            delay,
            ease: [0.25, 0.25, 0.25, 0.75],
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
};

// Stagger Animation for multiple children
interface StaggerProps {
  children: React.ReactNode;
  staggerDelay?: number;
  initialDelay?: number;
}

export const Stagger: React.FC<StaggerProps> = ({
  children,
  staggerDelay = 0.1,
  initialDelay = 0,
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={{
        visible: {
          transition: {
            delayChildren: initialDelay,
            staggerChildren: staggerDelay,
          },
        },
      }}
    >
      {React.Children.map(children, (child, index) => (
        <motion.div
          key={index}
          variants={{
            hidden: { opacity: 0, y: 30 },
            visible: {
              opacity: 1,
              y: 0,
              transition: {
                duration: 0.6,
                ease: [0.25, 0.25, 0.25, 0.75],
              },
            },
          }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
};

// Scale In Animation
interface ScaleInProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  scale?: number;
}

export const ScaleIn: React.FC<ScaleInProps> = ({
  children,
  delay = 0,
  duration = 0.5,
  scale = 0.8,
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <motion.div
      ref={ref}
      initial={{ scale, opacity: 0 }}
      animate={isInView ? { scale: 1, opacity: 1 } : { scale, opacity: 0 }}
      transition={{
        duration,
        delay,
        ease: [0.25, 0.25, 0.25, 0.75],
      }}
    >
      {children}
    </motion.div>
  );
};

// Slide In Animation
interface SlideInProps {
  children: React.ReactNode;
  direction?: 'left' | 'right';
  delay?: number;
  duration?: number;
  distance?: number;
}

export const SlideIn: React.FC<SlideInProps> = ({
  children,
  direction = 'left',
  delay = 0,
  duration = 0.6,
  distance = 100,
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  const initialX = direction === 'left' ? -distance : distance;

  return (
    <motion.div
      ref={ref}
      initial={{ x: initialX, opacity: 0 }}
      animate={isInView ? { x: 0, opacity: 1 } : { x: initialX, opacity: 0 }}
      transition={{
        duration,
        delay,
        ease: [0.25, 0.25, 0.25, 0.75],
      }}
    >
      {children}
    </motion.div>
  );
};

// Parallax Effect Component
interface ParallaxProps {
  children: React.ReactNode;
  speed?: number;
  className?: string;
}

export const Parallax: React.FC<ParallaxProps> = ({
  children,
  speed = 0.5,
  className,
}) => {
  const [offsetY, setOffsetY] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect();
        const scrolled = window.pageYOffset;
        const rate = scrolled * speed;
        setOffsetY(rate);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [speed]);

  return (
    <Box
      ref={ref}
      className={className}
      sx={{
        transform: `translateY(${offsetY}px)`,
        willChange: 'transform',
      }}
    >
      {children}
    </Box>
  );
};

// Hover Animation Component
interface HoverAnimationProps {
  children: React.ReactNode;
  scale?: number;
  rotate?: number;
  duration?: number;
}

export const HoverAnimation: React.FC<HoverAnimationProps> = ({
  children,
  scale = 1.05,
  rotate = 0,
  duration = 0.3,
}) => {
  return (
    <motion.div
      whileHover={{
        scale,
        rotate,
        transition: { duration, ease: 'easeInOut' },
      }}
      whileTap={{ scale: 0.95 }}
    >
      {children}
    </motion.div>
  );
};

// Floating Animation Component
interface FloatingProps {
  children: React.ReactNode;
  duration?: number;
  distance?: number;
}

export const Floating: React.FC<FloatingProps> = ({
  children,
  duration = 3,
  distance = 10,
}) => {
  return (
    <motion.div
      animate={{
        y: [-distance, distance, -distance],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      {children}
    </motion.div>
  );
};