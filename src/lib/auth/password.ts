import bcrypt from 'bcryptjs';

/**
 * Password Manager class for handling password operations
 * Follows security best practices for password hashing and validation
 */
export class PasswordManager {
  private static readonly SALT_ROUNDS = 12;

  /**
   * Hashes a plain text password using bcrypt
   * @param password - Plain text password to hash
   * @returns Promise<string> - Hashed password
   * @throws {Error} If password is invalid or hashing fails
   */
  static async hashPassword(password: string): Promise<string> {
    try {
      // Validate password
      this.validatePassword(password);
      
      // Generate salt and hash password
      const salt = await bcrypt.genSalt(this.SALT_ROUNDS);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      return hashedPassword;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to hash password');
    }
  }

  /**
   * Compares a plain text password with a hashed password
   * @param password - Plain text password
   * @param hashedPassword - Hashed password to compare against
   * @returns Promise<boolean> - Whether passwords match
   */
  static async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    try {
      if (!password || !hashedPassword) {
        return false;
      }
      
      return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
      console.error('Password comparison failed:', error);
      return false;
    }
  }

  /**
   * Validates password strength and requirements
   * @param password - Password to validate
   * @throws {Error} If password doesn't meet requirements
   */
  static validatePassword(password: string): void {
    if (!password || typeof password !== 'string') {
      throw new Error('Password is required');
    }

    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    if (password.length > 128) {
      throw new Error('Password cannot exceed 128 characters');
    }

    // Check for at least one lowercase letter
    if (!/[a-z]/.test(password)) {
      throw new Error('Password must contain at least one lowercase letter');
    }

    // Check for at least one uppercase letter
    if (!/[A-Z]/.test(password)) {
      throw new Error('Password must contain at least one uppercase letter');
    }

    // Check for at least one number
    if (!/\d/.test(password)) {
      throw new Error('Password must contain at least one number');
    }

    // Check for at least one special character
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      throw new Error('Password must contain at least one special character');
    }

    // Check for common weak passwords
    const commonPasswords = [
      'password', 'password123', '123456789', 'qwerty123',
      'admin123', 'welcome123', 'letmein123', 'password1'
    ];
    
    if (commonPasswords.includes(password.toLowerCase())) {
      throw new Error('Password is too common. Please choose a more secure password');
    }

    // Check for sequential characters
    if (this.hasSequentialChars(password)) {
      throw new Error('Password cannot contain sequential characters (e.g., 123, abc)');
    }

    // Check for repeated characters
    if (this.hasRepeatedChars(password)) {
      throw new Error('Password cannot contain more than 2 repeated characters in a row');
    }
  }

  /**
   * Checks if password contains sequential characters
   * @param password - Password to check
   * @returns boolean - Whether password has sequential characters
   */
  private static hasSequentialChars(password: string): boolean {
    const sequences = [
      'abcdefghijklmnopqrstuvwxyz',
      'qwertyuiopasdfghjklzxcvbnm',
      '0123456789'
    ];

    for (const sequence of sequences) {
      for (let i = 0; i <= sequence.length - 3; i++) {
        const subSeq = sequence.substring(i, i + 3);
        if (password.toLowerCase().includes(subSeq)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Checks if password contains repeated characters
   * @param password - Password to check
   * @returns boolean - Whether password has repeated characters
   */
  private static hasRepeatedChars(password: string): boolean {
    for (let i = 0; i <= password.length - 3; i++) {
      const char = password[i];
      if (password[i + 1] === char && password[i + 2] === char) {
        return true;
      }
    }
    return false;
  }

  /**
   * Generates a secure random password
   * @param length - Length of password to generate (default: 16)
   * @returns string - Generated password
   */
  static generateSecurePassword(length: number = 16): string {
    if (length < 8) {
      throw new Error('Password length must be at least 8 characters');
    }

    if (length > 128) {
      throw new Error('Password length cannot exceed 128 characters');
    }

    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    // Ensure at least one character from each category
    let password = '';
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];

    // Fill the rest of the password
    const allChars = lowercase + uppercase + numbers + symbols;
    for (let i = 4; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle the password to avoid predictable patterns
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Estimates password strength
   * @param password - Password to analyze
   * @returns object - Password strength analysis
   */
  static analyzePasswordStrength(password: string): {
    score: number;
    strength: 'very-weak' | 'weak' | 'fair' | 'good' | 'strong';
    feedback: string[];
  } {
    const feedback: string[] = [];
    let score = 0;

    if (!password) {
      return {
        score: 0,
        strength: 'very-weak',
        feedback: ['Password is required']
      };
    }

    // Length check
    if (password.length >= 8) score += 1;
    else feedback.push('Use at least 8 characters');

    if (password.length >= 12) score += 1;
    else if (password.length >= 8) feedback.push('Consider using 12 or more characters');

    // Character variety checks
    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('Include lowercase letters');

    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('Include uppercase letters');

    if (/\d/.test(password)) score += 1;
    else feedback.push('Include numbers');

    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 1;
    else feedback.push('Include special characters');

    // Additional checks
    if (password.length >= 16) score += 1;
    if (!/(.)\1{2,}/.test(password)) score += 1; // No repeated characters
    else feedback.push('Avoid repeated characters');

    // Determine strength
    let strength: 'very-weak' | 'weak' | 'fair' | 'good' | 'strong';
    if (score <= 2) strength = 'very-weak';
    else if (score <= 3) strength = 'weak';
    else if (score <= 5) strength = 'fair';
    else if (score <= 6) strength = 'good';
    else strength = 'strong';

    return { score, strength, feedback };
  }
}