/**
 * Authentication Configuration Management
 * Centralized configuration for authentication settings, route patterns, and security options
 */

// Environment types
type Environment = 'development' | 'production' | 'test';

// Configuration interfaces
interface SecurityConfig {
  headers: Record<string, string>;
  cookieSettings: {
    secure: boolean;
    httpOnly: boolean;
    sameSite: 'strict' | 'lax' | 'none';
    maxAge: number;
    domain?: string;
    path: string;
  };
  rateLimiting: {
    enabled: boolean;
    maxAttempts: number;
    windowMs: number;
    blockDuration: number;
  };
  csrf: {
    enabled: boolean;
    tokenLength: number;
    headerName: string;
  };
}

interface RouteConfig {
  protectedRoutes: string[];
  publicRoutes: string[];
  authRoutes: string[];
  adminRoutes: string[];
  moderatorRoutes: string[];
}

interface TokenConfig {
  accessToken: {
    expiresIn: string;
    algorithm: string;
    issuer: string;
    audience: string;
  };
  refreshToken: {
    expiresIn: string;
    algorithm: string;
    issuer: string;
    audience: string;
  };
  autoRefresh: {
    enabled: boolean;
    refreshThreshold: number; // minutes before expiry
    maxRetries: number;
  };
}

interface RedirectConfig {
  maxRedirectLength: number;
  allowedPatterns: string[];
  blockedPatterns: string[];
  defaultRedirect: string;
  loginRedirect: string;
  logoutRedirect: string;
}

interface LoadingConfig {
  showLoadingStates: boolean;
  minDisplayTime: number;
  maxDisplayTime: number;
  timeoutDuration: number;
  animationType: 'circular' | 'linear' | 'skeleton';
}

interface LoggingConfig {
  enabled: boolean;
  level: 'error' | 'warn' | 'info' | 'debug';
  events: {
    login: boolean;
    logout: boolean;
    refresh: boolean;
    errors: boolean;
    security: boolean;
  };
  retention: {
    days: number;
    maxEntries: number;
  };
}

interface AuthConfig {
  environment: Environment;
  security: SecurityConfig;
  routes: RouteConfig;
  tokens: TokenConfig;
  redirects: RedirectConfig;
  loading: LoadingConfig;
  logging: LoggingConfig;
  features: {
    emailVerification: boolean;
    multiFactorAuth: boolean;
    socialLogin: boolean;
    rememberMe: boolean;
    passwordReset: boolean;
  };
}

/**
 * Default configuration for development environment
 */
const developmentConfig: AuthConfig = {
  environment: 'development',
  security: {
    headers: {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-XSS-Protection': '1; mode=block',
    },
    cookieSettings: {
      secure: false,
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    },
    rateLimiting: {
      enabled: false,
      maxAttempts: 10,
      windowMs: 15 * 60 * 1000, // 15 minutes
      blockDuration: 30 * 60 * 1000, // 30 minutes
    },
    csrf: {
      enabled: false,
      tokenLength: 32,
      headerName: 'X-CSRF-Token',
    },
  },
  routes: {
    protectedRoutes: [
      '/dashboards',
      '/apps',
      '/charts',
      '/forms',
      '/tables',
      '/react-tables',
      '/ui-components',
      '/widgets',
      '/finance',
      '/layout',
      '/sample-page',
      '/theme-pages',
      '/icons',
      '/test-loading',
    ],
    publicRoutes: [
      '/',
      '/landingpage',
      '/frontend-pages/about',
      '/frontend-pages/contact',
      '/frontend-pages/blog',
      '/frontend-pages/portfolio',
      '/frontend-pages/pricing',
      '/frontend-pages/homepage',
    ],
    authRoutes: [
      '/auth/auth1/login',
      '/auth/auth1/register',
      '/auth/auth1/verify-email',
      '/auth/auth1/forgot-password',
      '/auth/auth1/reset-password',
      '/auth/auth2',
    ],
    adminRoutes: [
      '/admin',
      '/dashboards/admin',
    ],
    moderatorRoutes: [
      '/moderation',
      '/dashboards/moderation',
    ],
  },
  tokens: {
    accessToken: {
      expiresIn: '15m',
      algorithm: 'HS256',
      issuer: 'boami-auth',
      audience: 'boami-app',
    },
    refreshToken: {
      expiresIn: '7d',
      algorithm: 'HS256',
      issuer: 'boami-auth',
      audience: 'boami-app',
    },
    autoRefresh: {
      enabled: true,
      refreshThreshold: 5, // 5 minutes before expiry
      maxRetries: 3,
    },
  },
  redirects: {
    maxRedirectLength: 200,
    allowedPatterns: [
      '/dashboards',
      '/apps',
      '/charts',
      '/forms',
      '/tables',
      '/react-tables',
      '/ui-components',
      '/widgets',
      '/finance',
    ],
    blockedPatterns: [
      'javascript:',
      'data:',
      'vbscript:',
      'file:',
      'ftp:',
      'mailto:',
      'tel:',
    ],
    defaultRedirect: '/dashboards/ecommerce',
    loginRedirect: '/auth/auth1/login',
    logoutRedirect: '/landingpage',
  },
  loading: {
    showLoadingStates: true,
    minDisplayTime: 200,
    maxDisplayTime: 5000,
    timeoutDuration: 30000,
    animationType: 'circular',
  },
  logging: {
    enabled: true,
    level: 'debug',
    events: {
      login: true,
      logout: true,
      refresh: true,
      errors: true,
      security: true,
    },
    retention: {
      days: 30,
      maxEntries: 10000,
    },
  },
  features: {
    emailVerification: true,
    multiFactorAuth: false,
    socialLogin: true,
    rememberMe: true,
    passwordReset: true,
  },
};

/**
 * Production configuration
 */
const productionConfig: AuthConfig = {
  ...developmentConfig,
  environment: 'production',
  security: {
    ...developmentConfig.security,
    headers: {
      ...developmentConfig.security.headers,
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    },
    cookieSettings: {
      ...developmentConfig.security.cookieSettings,
      secure: true,
      sameSite: 'strict',
    },
    rateLimiting: {
      ...developmentConfig.security.rateLimiting,
      enabled: true,
      maxAttempts: 5,
      windowMs: 15 * 60 * 1000, // 15 minutes
      blockDuration: 60 * 60 * 1000, // 1 hour
    },
    csrf: {
      ...developmentConfig.security.csrf,
      enabled: true,
    },
  },
  logging: {
    ...developmentConfig.logging,
    level: 'error',
    events: {
      ...developmentConfig.logging.events,
      login: true,
      logout: true,
      refresh: false,
      errors: true,
      security: true,
    },
  },
  features: {
    ...developmentConfig.features,
    multiFactorAuth: true,
  },
};

/**
 * Test configuration
 */
const testConfig: AuthConfig = {
  ...developmentConfig,
  environment: 'test',
  security: {
    ...developmentConfig.security,
    rateLimiting: {
      ...developmentConfig.security.rateLimiting,
      enabled: false,
    },
  },
  tokens: {
    ...developmentConfig.tokens,
    accessToken: {
      ...developmentConfig.tokens.accessToken,
      expiresIn: '1h', // Longer for testing
    },
    autoRefresh: {
      ...developmentConfig.tokens.autoRefresh,
      enabled: false, // Disable for predictable testing
    },
  },
  loading: {
    ...developmentConfig.loading,
    minDisplayTime: 0,
    maxDisplayTime: 1000,
    timeoutDuration: 5000,
  },
  logging: {
    ...developmentConfig.logging,
    enabled: false,
  },
};

/**
 * Configuration manager class
 */
export class AuthConfigManager {
  private static instance: AuthConfigManager;
  private config: AuthConfig;
  private customConfig: Partial<AuthConfig> = {};

  private constructor() {
    this.config = this.getEnvironmentConfig();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): AuthConfigManager {
    if (!AuthConfigManager.instance) {
      AuthConfigManager.instance = new AuthConfigManager();
    }
    return AuthConfigManager.instance;
  }

  /**
   * Get configuration for current environment
   */
  private getEnvironmentConfig(): AuthConfig {
    const env = (process.env.NODE_ENV as Environment) || 'development';

    switch (env) {
      case 'production':
        return productionConfig;
      case 'test':
        return testConfig;
      default:
        return developmentConfig;
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): AuthConfig {
    return this.mergeConfigs(this.config, this.customConfig);
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<AuthConfig>): void {
    this.customConfig = this.mergeConfigs(this.customConfig, updates);
  }

  /**
   * Reset configuration to environment defaults
   */
  resetConfig(): void {
    this.customConfig = {};
    this.config = this.getEnvironmentConfig();
  }

  /**
   * Get specific configuration section
   */
  getSecurityConfig(): SecurityConfig {
    return this.getConfig().security;
  }

  getRouteConfig(): RouteConfig {
    return this.getConfig().routes;
  }

  getTokenConfig(): TokenConfig {
    return this.getConfig().tokens;
  }

  getRedirectConfig(): RedirectConfig {
    return this.getConfig().redirects;
  }

  getLoadingConfig(): LoadingConfig {
    return this.getConfig().loading;
  }

  getLoggingConfig(): LoggingConfig {
    return this.getConfig().logging;
  }

  /**
   * Validate configuration
   */
  validateConfig(): { isValid: boolean; errors: string[] } {
    const config = this.getConfig();
    const errors: string[] = [];

    // Validate required environment variables
    if (config.environment === 'production') {
      if (!process.env.JWT_SECRET) {
        errors.push('JWT_SECRET environment variable is required in production');
      }
      if (!process.env.JWT_REFRESH_SECRET) {
        errors.push('JWT_REFRESH_SECRET environment variable is required in production');
      }
    }

    // Validate route patterns
    if (!config.routes.protectedRoutes.length) {
      errors.push('At least one protected route must be defined');
    }

    // Validate token configuration
    if (config.tokens.accessToken.expiresIn === config.tokens.refreshToken.expiresIn) {
      errors.push('Access token and refresh token should have different expiry times');
    }

    // Validate redirect patterns
    if (config.redirects.allowedPatterns.length === 0) {
      errors.push('At least one allowed redirect pattern must be defined');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Merge configuration objects deeply
   */
  private mergeConfigs<T>(base: T, override: Partial<T>): T {
    const result = { ...base };

    for (const key in override) {
      if (override.hasOwnProperty(key)) {
        const value = override[key];
        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
          result[key] = this.mergeConfigs(result[key] as any, value as any);
        } else {
          result[key] = value as any;
        }
      }
    }

    return result;
  }

  /**
   * Export configuration for debugging
   */
  exportConfig(): string {
    return JSON.stringify(this.getConfig(), null, 2);
  }

  /**
   * Import configuration from JSON
   */
  importConfig(configJson: string): void {
    try {
      const config = JSON.parse(configJson);
      this.updateConfig(config);
    } catch (error) {
      throw new Error('Invalid configuration JSON');
    }
  }
}

/**
 * Convenience functions for accessing configuration
 */
export const getAuthConfig = (): AuthConfig => {
  return AuthConfigManager.getInstance().getConfig();
};

export const getSecurityConfig = (): SecurityConfig => {
  return AuthConfigManager.getInstance().getSecurityConfig();
};

export const getRouteConfig = (): RouteConfig => {
  return AuthConfigManager.getInstance().getRouteConfig();
};

export const getTokenConfig = (): TokenConfig => {
  return AuthConfigManager.getInstance().getTokenConfig();
};

export const getRedirectConfig = (): RedirectConfig => {
  return AuthConfigManager.getInstance().getRedirectConfig();
};

export const getLoadingConfig = (): LoadingConfig => {
  return AuthConfigManager.getInstance().getLoadingConfig();
};

export const getLoggingConfig = (): LoggingConfig => {
  return AuthConfigManager.getInstance().getLoggingConfig();
};

export const updateAuthConfig = (updates: Partial<AuthConfig>): void => {
  AuthConfigManager.getInstance().updateConfig(updates);
};

export const validateAuthConfig = (): { isValid: boolean; errors: string[] } => {
  return AuthConfigManager.getInstance().validateConfig();
};

// Export types
export type {
  AuthConfig,
  SecurityConfig,
  RouteConfig,
  TokenConfig,
  RedirectConfig,
  LoadingConfig,
  LoggingConfig,
  Environment,
};

// Export default instance
export default AuthConfigManager.getInstance();