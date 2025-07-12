import crypto from 'crypto';
import VerificationCode, { IVerificationCodeDocument } from '@/lib/database/models/VerificationCode';
import { connectDB } from '@/lib/database/mongoose-connection';

/**
 * Verification code types
 */
export type VerificationType = 'email_verification' | 'password_reset';

/**
 * Verification result interface
 */
export interface IVerificationResult {
  success: boolean;
  message: string;
  attemptsRemaining?: number;
}

/**
 * Verification Code Manager class for handling email verification and password reset codes
 * Implements security best practices including rate limiting and secure code generation
 */
export class VerificationCodeManager {
  private static readonly CODE_LENGTH = 4;
  private static readonly DEFAULT_EXPIRY_MINUTES = 5;
  private static readonly MAX_ATTEMPTS = 3;

  /**
   * Generates a cryptographically secure 4-digit verification code
   * @returns string - 4-digit numeric code
   */
  static generateCode(): string {
    // Use crypto.randomInt for cryptographically secure random number generation
    const code = crypto.randomInt(1000, 9999).toString().padStart(this.CODE_LENGTH, '0');
    return code;
  }

  /**
   * Creates a new verification code for a user
   * Invalidates any existing active codes of the same type
   * @param userId - User's ID
   * @param type - Type of verification (email_verification or password_reset)
   * @param expiryMinutes - Code expiry time in minutes (default: 5)
   * @returns Promise<string> - Generated verification code
   * @throws {Error} If code creation fails
   */
  static async createVerificationCode(
    userId: string,
    type: VerificationType,
    expiryMinutes: number = this.DEFAULT_EXPIRY_MINUTES
  ): Promise<string> {
    try {
      await connectDB();

      // Generate new code
      const code = this.generateCode();

      // Create verification code in database
      await VerificationCode.createVerificationCode(userId, code, type);

      console.log(`✅ Verification code created for user ${userId}, type: ${type}`);
      return code;
    } catch (error) {
      console.error('Failed to create verification code:', error);
      throw new Error('Failed to create verification code');
    }
  }

  /**
   * Validates a verification code
   * Implements rate limiting and attempt tracking
   * @param userId - User's ID
   * @param code - Verification code to validate
   * @param type - Type of verification
   * @returns Promise<IVerificationResult> - Validation result
   */
  static async validateCode(
    userId: string,
    code: string,
    type: VerificationType
  ): Promise<IVerificationResult> {
    try {
      await connectDB();

      // Find the verification code
      const verification = await VerificationCode.findValidCode(userId, code, type);

      if (!verification) {
        return {
          success: false,
          message: 'Invalid or expired verification code'
        };
      }

      // Check if code can be attempted
      if (!verification.canAttempt()) {
        return {
          success: false,
          message: 'Verification code has expired or too many attempts made'
        };
      }

      // Validate the code
      if (verification.code !== code) {
        // Increment attempts for wrong code
        await verification.incrementAttempts();
        
        const attemptsRemaining = verification.maxAttempts - verification.attempts;
        return {
          success: false,
          message: 'Invalid verification code',
          attemptsRemaining: Math.max(0, attemptsRemaining)
        };
      }

      // Code is valid - mark as used
      await verification.markAsUsed();

      console.log(`✅ Verification code validated for user ${userId}, type: ${type}`);
      return {
        success: true,
        message: 'Verification code validated successfully'
      };

    } catch (error) {
      console.error('Failed to validate verification code:', error);
      return {
        success: false,
        message: 'Failed to validate verification code'
      };
    }
  }

  /**
   * Checks if a user has an active verification code
   * @param userId - User's ID
   * @param type - Type of verification
   * @returns Promise<boolean> - Whether user has active code
   */
  static async hasActiveCode(userId: string, type: VerificationType): Promise<boolean> {
    try {
      await connectDB();
      const activeCode = await VerificationCode.findActiveCodeForUser(userId, type);
      return activeCode !== null;
    } catch (error) {
      console.error('Failed to check for active code:', error);
      return false;
    }
  }

  /**
   * Gets remaining attempts for a user's active verification code
   * @param userId - User's ID
   * @param type - Type of verification
   * @returns Promise<number> - Number of attempts remaining
   */
  static async getRemainingAttempts(userId: string, type: VerificationType): Promise<number> {
    try {
      await connectDB();
      const activeCode = await VerificationCode.findActiveCodeForUser(userId, type);
      
      if (!activeCode) {
        return 0;
      }

      return Math.max(0, activeCode.maxAttempts - activeCode.attempts);
    } catch (error) {
      console.error('Failed to get remaining attempts:', error);
      return 0;
    }
  }

  /**
   * Invalidates all active verification codes for a user and type
   * @param userId - User's ID
   * @param type - Type of verification
   * @returns Promise<void>
   */
  static async invalidateUserCodes(userId: string, type: VerificationType): Promise<void> {
    try {
      await connectDB();
      
      // Mark all active codes as used
      await VerificationCode.updateMany(
        {
          userId,
          type,
          isUsed: false,
          expiresAt: { $gt: new Date() }
        },
        {
          $set: { isUsed: true }
        }
      );

      console.log(`✅ Invalidated all ${type} codes for user ${userId}`);
    } catch (error) {
      console.error('Failed to invalidate user codes:', error);
      throw new Error('Failed to invalidate verification codes');
    }
  }

  /**
   * Cleans up expired and used verification codes
   * Should be called periodically to maintain database hygiene
   * @returns Promise<void>
   */
  static async cleanupExpiredCodes(): Promise<void> {
    try {
      await connectDB();
      await VerificationCode.cleanupExpiredCodes();
      console.log('✅ Cleaned up expired verification codes');
    } catch (error) {
      console.error('Failed to cleanup expired codes:', error);
    }
  }

  /**
   * Gets verification code statistics for monitoring
   * @param userId - User's ID (optional)
   * @returns Promise<object> - Statistics object
   */
  static async getCodeStatistics(userId?: string): Promise<{
    totalCodes: number;
    activeCodes: number;
    expiredCodes: number;
    usedCodes: number;
  }> {
    try {
      await connectDB();

      const filter = userId ? { userId } : {};

      const [totalCodes, activeCodes, expiredCodes, usedCodes] = await Promise.all([
        VerificationCode.countDocuments(filter),
        VerificationCode.countDocuments({
          ...filter,
          isUsed: false,
          expiresAt: { $gt: new Date() }
        }),
        VerificationCode.countDocuments({
          ...filter,
          expiresAt: { $lt: new Date() }
        }),
        VerificationCode.countDocuments({
          ...filter,
          isUsed: true
        })
      ]);

      return {
        totalCodes,
        activeCodes,
        expiredCodes,
        usedCodes
      };
    } catch (error) {
      console.error('Failed to get code statistics:', error);
      return {
        totalCodes: 0,
        activeCodes: 0,
        expiredCodes: 0,
        usedCodes: 0
      };
    }
  }

  /**
   * Validates verification code format
   * @param code - Code to validate
   * @returns boolean - Whether code format is valid
   */
  static isValidCodeFormat(code: string): boolean {
    if (!code || typeof code !== 'string') {
      return false;
    }

    // Must be exactly 4 digits
    return /^\d{4}$/.test(code);
  }

  /**
   * Gets time until code expires
   * @param userId - User's ID
   * @param type - Type of verification
   * @returns Promise<number> - Minutes until expiry (0 if expired/not found)
   */
  static async getTimeUntilExpiry(userId: string, type: VerificationType): Promise<number> {
    try {
      await connectDB();
      const activeCode = await VerificationCode.findActiveCodeForUser(userId, type);
      
      if (!activeCode) {
        return 0;
      }

      const now = new Date();
      const expiryTime = new Date(activeCode.expiresAt);
      const diffMs = expiryTime.getTime() - now.getTime();
      
      if (diffMs <= 0) {
        return 0;
      }

      return Math.ceil(diffMs / (1000 * 60)); // Convert to minutes
    } catch (error) {
      console.error('Failed to get time until expiry:', error);
      return 0;
    }
  }
}