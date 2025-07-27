/**
 * Security configuration for subscription system
 */
export class SecurityConfig {

  /**
   * Validate required security environment variables
   */
  static validateSecurityConfig(): { valid: boolean; missing: string[] } {
    const requiredVars = [
      'JWT_SECRET',
      'NEXTAUTH_SECRET',
      'FLUTTERWAVE_SECRET_KEY',
      'FLUTTERWAVE_SECRET_HASH',
      'SUBSCRIPTION_ENCRYPTION_KEY'
    ];

    const missing: string[] = [];

    requiredVars.forEach(varName => {
      if (!process.env[varName]) {
        missing.push(varName);
      }
    });

    return {
      valid: missing.length === 0,
      missing
    };
  }

  /**
   * Get security configuration
   */
  static getSecurityConfig() {
    return {
      // JWT Configuration
      jwt: {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
      },

      // Encryption Configuration
      encryption: {
        key: process.env.SUBSCRIPTION_ENCRYPTION_KEY,
        algorithm: 'aes-256-gcm'
      },

      // Rate Limiting Configuration
      rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
        skipSuccessfulRequests: process.env.RATE_LIMIT_SKIP_SUCCESS === 'true'
      },

      // CORS Configuration
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || [process.env.NEXTAUTH_URL],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: [
          'Content-Type',
          'Authorization',
          'X-CSRF-Token',
          'X-Session-Token'
        ]
      },

      // Session Configuration
      session: {
        secret: process.env.NEXTAUTH_SECRET,
        maxAge: parseInt(process.env.SESSION_MAX_AGE || '86400'), // 24 hours
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'strict' as const
      },

      // Webhook Security
      webhooks: {
        flutterwave: {
          secretHash: process.env.FLUTTERWAVE_SECRET_HASH,
          allowedIPs: process.env.FLUTTERWAVE_ALLOWED_IPS?.split(',') || []
        },
        internal: {
          secret: process.env.INTERNAL_WEBHOOK_SECRET
        }
      },

      // Password Policy
      password: {
        minLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8'),
        requireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE !== 'false',
        requireLowercase: process.env.PASSWORD_REQUIRE_LOWERCASE !== 'false',
        requireNumbers: process.env.PASSWORD_REQUIRE_NUMBERS !== 'false',
        requireSpecialChars: process.env.PASSWORD_REQUIRE_SPECIAL !== 'false',
        maxAttempts: parseInt(process.env.PASSWORD_MAX_ATTEMPTS || '5'),
        lockoutDuration: parseInt(process.env.PASSWORD_LOCKOUT_DURATION || '900') // 15 minutes
      },

      // Audit Logging
      audit: {
        enabled: process.env.AUDIT_LOGGING_ENABLED !== 'false',
        retentionDays: parseInt(process.env.AUDIT_RETENTION_DAYS || '730'), // 2 years
        logLevel: process.env.AUDIT_LOG_LEVEL || 'info'
      },

      // Security Headers
      headers: {
        hsts: {
          maxAge: parseInt(process.env.HSTS_MAX_AGE || '31536000'), // 1 year
          includeSubDomains: process.env.HSTS_INCLUDE_SUBDOMAINS !== 'false',
          preload: process.env.HSTS_PRELOAD !== 'false'
        },
        csp: {
          enabled: process.env.CSP_ENABLED !== 'false',
          reportOnly: process.env.CSP_REPORT_ONLY === 'true',
          reportUri: process.env.CSP_REPORT_URI
        }
      },

      // IP Security
      ipSecurity: {
        whitelist: process.env.IP_WHITELIST?.split(',') || [],
        blacklist: process.env.IP_BLACKLIST?.split(',') || [],
        maxFailedAttempts: parseInt(process.env.IP_MAX_FAILED_ATTEMPTS || '10'),
        blockDuration: parseInt(process.env.IP_BLOCK_DURATION || '3600') // 1 hour
      },

      // Data Protection
      dataProtection: {
        encryptSensitiveFields: process.env.ENCRYPT_SENSITIVE_FIELDS !== 'false',
        maskLogging: process.env.MASK_SENSITIVE_LOGGING !== 'false',
        dataRetentionDays: parseInt(process.env.DATA_RETENTION_DAYS || '2555'), // 7 years
        anonymizeAfterDays: parseInt(process.env.ANONYMIZE_AFTER_DAYS || '1095') // 3 years
      }
    };
  }

  /**
   * Validate password against policy
   */
  static validatePassword(password: string): { valid: boolean; errors: string[] } {
    const config = this.getSecurityConfig().password;
    const errors: string[] = [];

    if (password.length < config.minLength) {
      errors.push(`Password must be at least ${config.minLength} characters long`);
    }

    if (config.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (config.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (config.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (config.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if IP is allowed
   */
  static isIPAllowed(ip: string): boolean {
    const config = this.getSecurityConfig().ipSecurity;

    // Check blacklist first
    if (config.blacklist.includes(ip)) {
      return false;
    }

    // If whitelist is empty, allow all (except blacklisted)
    if (config.whitelist.length === 0) {
      return true;
    }

    // Check whitelist
    return config.whitelist.includes(ip);
  }

  /**
   * Get CSP header value
   */
  static getCSPHeader(): string {
    const config = this.getSecurityConfig().headers.csp;

    if (!config.enabled) {
      return '';
    }

    const directives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.flutterwave.com https://api.flutterwave.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https:",
      "connect-src 'self' https://api.flutterwave.com https://checkout.flutterwave.com",
      "frame-src 'self' https://checkout.flutterwave.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self' https://checkout.flutterwave.com"
    ];

    if (config.reportUri) {
      directives.push(`report-uri ${config.reportUri}`);
    }

    return directives.join('; ');
  }

  /**
   * Initialize security configuration
   */
  static initialize(): { success: boolean; errors: string[] } {
    const validation = this.validateSecurityConfig();
    const errors: string[] = [];

    if (!validation.valid) {
      errors.push(`Missing required environment variables: ${validation.missing.join(', ')}`);
    }

    // Validate encryption key
    const encryptionKey = process.env.SUBSCRIPTION_ENCRYPTION_KEY;
    if (encryptionKey && encryptionKey.length < 32) {
      errors.push('SUBSCRIPTION_ENCRYPTION_KEY must be at least 32 characters long');
    }

    // Validate JWT secret
    const jwtSecret = process.env.JWT_SECRET;
    if (jwtSecret && jwtSecret.length < 32) {
      errors.push('JWT_SECRET must be at least 32 characters long');
    }

    // Log security configuration status
    if (errors.length === 0) {
      console.log('✅ Security configuration initialized successfully');
    } else {
      console.error('❌ Security configuration errors:', errors);
    }

    return {
      success: errors.length === 0,
      errors
    };
  }

  /**
   * Get environment-specific security settings
   */
  static getEnvironmentSettings() {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isProduction = process.env.NODE_ENV === 'production';

    return {
      isDevelopment,
      isProduction,

      // Relaxed settings for development
      development: {
        skipIPWhitelist: true,
        allowInsecureConnections: true,
        verboseLogging: true,
        skipCSRFValidation: true
      },

      // Strict settings for production
      production: {
        enforceHTTPS: true,
        strictCSP: true,
        enableHSTS: true,
        requireSecureCookies: true
      }
    };
  }
}