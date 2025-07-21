import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { styled } from '@mui/material/styles';

// Animated Button with Ripple Effect
const AnimatedButton = styled(motion.button)(({ theme }) => ({
  position: 'relative',
  overflow: 'hidden',
  border: 'none',
  borderRadius: theme.spacing(1),
  cursor: 'pointer',
  outline: 'none',

  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(255, 255, 255, 0.1)',
    transform: 'translateX(-100%)',
    transition: 'transform 0.6s ease',
  },

  '&:hover::before': {
    transform: 'translateX(0)',
  },
}));

interface RippleButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
}

export const RippleButton: React.FC<RippleButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'medium',
  disabled = false,
}) => {
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const newRipple = {
      id: Date.now(),
      x,
      y,
    };

    setRipples(prev => [...prev, newRipple]);

    // Remove ripple after animation
    setTimeout(() => {
      setRipples(prev => prev.filter(ripple => ripple.id !== newRipple.id));
    }, 600);

    onClick?.();
  };

  return (
    <AnimatedButton
      onClick={handleClick}
      disabled={disabled}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      style={{
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {children}
      <AnimatePresence>
        {ripples.map(ripple => (
          <motion.span
            key={ripple.id}
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 4, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              left: ripple.x,
              top: ripple.y,
              width: 20,
              height: 20,
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.6)',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
            }}
          />
        ))}
      </AnimatePresence>
    </AnimatedButton>
  );
};

// Magnetic Button Effect
interface MagneticButtonProps {
  children: React.ReactNode;
  strength?: number;
}

export const MagneticButton: React.FC<MagneticButtonProps> = ({
  children,
  strength = 0.3,
}) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = (event.clientX - centerX) * strength;
    const deltaY = (event.clientY - centerY) * strength;

    setPosition({ x: deltaX, y: deltaY });
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{ display: 'inline-block' }}
    >
      {children}
    </motion.div>
  );
};

// Glowing Border Effect
interface GlowingBorderProps {
  children: React.ReactNode;
  color?: string;
  intensity?: number;
}

export const GlowingBorder: React.FC<GlowingBorderProps> = ({
  children,
  color = '#1976d2',
  intensity = 0.5,
}) => {
  return (
    <Box
      sx={{
        position: 'relative',
        borderRadius: 2,
        '&::before': {
          content: '""',
          position: 'absolute',
          top: -2,
          left: -2,
          right: -2,
          bottom: -2,
          background: `linear-gradient(45deg, ${color}, transparent, ${color})`,
          borderRadius: 'inherit',
          opacity: 0,
          transition: 'opacity 0.3s ease',
          zIndex: -1,
        },
        '&:hover::before': {
          opacity: intensity,
        },
      }}
    >
      {children}
    </Box>
  );
};

// Pulse Animation
interface PulseProps {
  children: React.ReactNode;
  color?: string;
  duration?: number;
}

export const Pulse: React.FC<PulseProps> = ({
  children,
  color = '#1976d2',
  duration = 2,
}) => {
  return (
    <Box sx={{ position: 'relative', display: 'inline-block' }}>
      {children}
      <Box
        component={motion.div}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.7, 0, 0.7],
        }}
        transition={{
          duration,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          border: `2px solid ${color}`,
          borderRadius: 'inherit',
          pointerEvents: 'none',
        }}
      />
    </Box>
  );
};

// Tilt Effect
interface TiltProps {
  children: React.ReactNode;
  maxTilt?: number;
  perspective?: number;
}

export const Tilt: React.FC<TiltProps> = ({
  children,
  maxTilt = 15,
  perspective = 1000,
}) => {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const tiltX = ((event.clientY - centerY) / (rect.height / 2)) * maxTilt;
    const tiltY = ((event.clientX - centerX) / (rect.width / 2)) * -maxTilt;

    setTilt({ x: tiltX, y: tiltY });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{
        rotateX: tilt.x,
        rotateY: tilt.y,
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{
        perspective,
        transformStyle: 'preserve-3d',
      }}
    >
      {children}
    </motion.div>
  );
};

// Loading Dots Animation
export const LoadingDots: React.FC = () => {
  return (
    <Box display="flex" gap={0.5} alignItems="center">
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: index * 0.2,
          }}
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: 'currentColor',
          }}
        />
      ))}
    </Box>
  );
};

// Morphing Icon Button
interface MorphingIconProps {
  icon1: React.ReactNode;
  icon2: React.ReactNode;
  onClick?: () => void;
  tooltip?: string;
}

export const MorphingIcon: React.FC<MorphingIconProps> = ({
  icon1,
  icon2,
  onClick,
  tooltip,
}) => {
  const [isToggled, setIsToggled] = useState(false);

  const handleClick = () => {
    setIsToggled(!isToggled);
    onClick?.();
  };

  const button = (
    <IconButton onClick={handleClick}>
      <AnimatePresence mode="wait">
        <motion.div
          key={isToggled ? 'icon2' : 'icon1'}
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0, rotate: 180 }}
          transition={{ duration: 0.3 }}
        >
          {isToggled ? icon2 : icon1}
        </motion.div>
      </AnimatePresence>
    </IconButton>
  );

  return tooltip ? (
    <Tooltip title={tooltip}>
      {button}
    </Tooltip>
  ) : button;
};