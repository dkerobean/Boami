import React from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import { SxProps, Theme } from '@mui/material/styles';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
  sx?: SxProps<Theme>;
  fullHeight?: boolean;
  centerContent?: boolean;
}

const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  maxWidth = 'lg',
  sx = {},
  fullHeight = false,
  centerContent = false,
}) => {
  return (
    <Container
      maxWidth={maxWidth}
      sx={{
        px: { xs: 2, sm: 3, md: 4 },
        ...(fullHeight && { minHeight: '100vh' }),
        ...(centerContent && {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }),
        ...sx,
      }}
    >
      <Box
        sx={{
          width: '100%',
          ...(centerContent && {
            textAlign: 'center',
          }),
        }}
      >
        {children}
      </Box>
    </Container>
  );
};

export default ResponsiveContainer;