import { createTheme } from '@mui/material/styles';
import { plus } from './Typography';

// BOAMI Brand Colors based on design document
const BOAMIColors = {
  primary: {
    main: '#1976d2',
    light: '#42a5f5',
    dark: '#1565c0',
    contrastText: '#ffffff',
  },
  secondary: {
    main: '#4caf50',
    light: '#81c784',
    dark: '#388e3c',
    contrastText: '#ffffff',
  },
  accent: {
    orange: '#ff9800',
    purple: '#9c27b0',
  },
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#eeeeee',
    300: '#e0e0e0',
    400: '#bdbdbd',
    500: '#9e9e9e',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  },
};

// Enhanced Typography Scale for Landing Page
const BOAMITypography = {
  fontFamily: plus.style.fontFamily,

  // Responsive headings using clamp for better mobile experience
  h1: {
    fontWeight: 700,
    fontSize: 'clamp(2rem, 5vw, 3rem)', // 32px to 48px
    lineHeight: 1.2,
    letterSpacing: '-0.02em',
  },
  h2: {
    fontWeight: 600,
    fontSize: 'clamp(1.5rem, 4vw, 2.25rem)', // 24px to 36px
    lineHeight: 1.3,
    letterSpacing: '-0.01em',
  },
  h3: {
    fontWeight: 600,
    fontSize: 'clamp(1.25rem, 3vw, 1.875rem)', // 20px to 30px
    lineHeight: 1.4,
  },
  h4: {
    fontWeight: 600,
    fontSize: 'clamp(1.125rem, 2.5vw, 1.5rem)', // 18px to 24px
    lineHeight: 1.4,
  },
  h5: {
    fontWeight: 600,
    fontSize: '1.125rem', // 18px
    lineHeight: 1.5,
  },
  h6: {
    fontWeight: 600,
    fontSize: '1rem', // 16px
    lineHeight: 1.5,
  },

  // Body text variants
  body1: {
    fontSize: '1rem', // 16px
    fontWeight: 400,
    lineHeight: 1.6,
  },
  body2: {
    fontSize: '0.875rem', // 14px
    fontWeight: 400,
    lineHeight: 1.5,
  },

  // Landing page specific variants
  subtitle1: {
    fontSize: '1.125rem', // 18px - for hero subheadlines
    fontWeight: 400,
    lineHeight: 1.6,
  },
  subtitle2: {
    fontSize: '1rem', // 16px
    fontWeight: 500,
    lineHeight: 1.5,
  },

  // Button text
  button: {
    fontWeight: 600,
    fontSize: '1rem',
    textTransform: 'none' as const,
    letterSpacing: '0.02em',
  },

  // Caption text
  caption: {
    fontSize: '0.75rem', // 12px
    fontWeight: 400,
    lineHeight: 1.4,
  },

  // Overline text (for small labels)
  overline: {
    fontSize: '0.75rem', // 12px
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    lineHeight: 1.4,
  },
};

// Create BOAMI Theme
export const createBOAMITheme = (mode: 'light' | 'dark' = 'light') => {
  const theme = createTheme({
    palette: {
      mode,
      primary: BOAMIColors.primary,
      secondary: BOAMIColors.secondary,
      ...(mode === 'light' ? {
        background: {
          default: '#ffffff',
          paper: '#ffffff',
        },
        text: {
          primary: BOAMIColors.neutral[900],
          secondary: BOAMIColors.neutral[600],
        },
        grey: BOAMIColors.neutral,
      } : {
        background: {
          default: BOAMIColors.neutral[900],
          paper: BOAMIColors.neutral[800],
        },
        text: {
          primary: '#ffffff',
          secondary: BOAMIColors.neutral[300],
        },
        grey: BOAMIColors.neutral,
      }),
      success: {
        main: '#4caf50',
        light: '#81c784',
        dark: '#388e3c',
      },
      warning: {
        main: BOAMIColors.accent.orange,
        light: '#ffb74d',
        dark: '#f57c00',
      },
      error: {
        main: '#f44336',
        light: '#e57373',
        dark: '#d32f2f',
      },
      info: {
        main: '#2196f3',
        light: '#64b5f6',
        dark: '#1976d2',
      },
    },
    typography: BOAMITypography,
    shape: {
      borderRadius: 8,
    },
    spacing: 8,
    shadows: [
      'none',
      '0px 1px 3px rgba(0, 0, 0, 0.12), 0px 1px 2px rgba(0, 0, 0, 0.24)',
      '0px 3px 6px rgba(0, 0, 0, 0.16), 0px 3px 6px rgba(0, 0, 0, 0.23)',
      '0px 10px 20px rgba(0, 0, 0, 0.19), 0px 6px 6px rgba(0, 0, 0, 0.23)',
      '0px 14px 28px rgba(0, 0, 0, 0.25), 0px 10px 10px rgba(0, 0, 0, 0.22)',
      '0px 19px 38px rgba(0, 0, 0, 0.30), 0px 15px 12px rgba(0, 0, 0, 0.22)',
      '0px 24px 48px rgba(0, 0, 0, 0.35), 0px 19px 15px rgba(0, 0, 0, 0.22)',
      '0px 32px 64px rgba(0, 0, 0, 0.40), 0px 24px 18px rgba(0, 0, 0, 0.22)',
      '0px 40px 80px rgba(0, 0, 0, 0.45), 0px 30px 22px rgba(0, 0, 0, 0.22)',
      // Continue with more shadow levels...
    ] as any,
  });

  // Add custom component overrides
  theme.components = {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: theme.spacing(1),
          padding: '12px 24px',
          fontSize: '1rem',
          fontWeight: 600,
          textTransform: 'none',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: theme.shadows[2],
          },
        },
        containedPrimary: {
          background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
          '&:hover': {
            background: `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: theme.spacing(2),
          boxShadow: theme.shadows[1],
          '&:hover': {
            boxShadow: theme.shadows[4],
          },
        },
      },
    },
    MuiContainer: {
      styleOverrides: {
        root: {
          paddingLeft: theme.spacing(2),
          paddingRight: theme.spacing(2),
          [theme.breakpoints.up('sm')]: {
            paddingLeft: theme.spacing(3),
            paddingRight: theme.spacing(3),
          },
        },
      },
    },
  };

  return theme;
};

export default createBOAMITheme;