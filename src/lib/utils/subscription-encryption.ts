import crypto from 'crypto';

/**
 * Encryption utilities for sensitive subscription data
 */
export class SubscriptionEncryption {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_LENGTH = 32;
  private static readonly IV_LENGTH = 16;
  private static readonly TAG_LENGTH = 16;

  /**
   * Get encryption key from environment variable
   */
  private static getEncryptionKey(): Buffer {
    const key = process.env.SUBSCRIPTION_ENCRYPTION_KEY;

    if (!key) {
      throw new Error('SUBSCRIPTION_ENCRYPTION_KEY environment variable is required');
    }

    // If key is hex-encoded, decode it
    if (key.length === 64) {
      return Buffer.from(key, 'hex');
    }

    // Otherwise, hash the key to get consistent 32-byte key
    return crypto.createHash('sha256').update(key).digest();
  }

  /**
   * Encrypt sensitive data
   */
  static encrypt(plaintext: string): string {
    try {
      const key = this.getEncryptionKey();
      const iv = crypto.randomBytes(this.IV_LENGTH);

      const cipher = crypto.createCipher(this.ALGORITHM, key);
      cipher.setAAD(Buffer.from('subscription-data'));

      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const tag = cipher.getAuthTag();

      // Combine IV, tag, and encrypted data
      const combined = Buffer.concat([
        iv,
        tag,
        Buffer.from(encrypted, 'hex')
      ]);

      return combined.toString('base64');

    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data
   */
  static decrypt(encryptedData: string): string {
    try {
      const key = this.getEncryptionKey();
      const combined = Buffer.from(encryptedData, 'base64');

      // Extract IV, tag, and encrypted data
      const iv = combined.slice(0, this.IV_LENGTH);
      const tag = combined.slice(this.IV_LENGTH, this.IV_LENGTH + this.TAG_LENGTH);
      const encrypted = combined.slice(this.IV_LENGTH + this.TAG_LENGTH);

      const decipher = crypto.createDecipher(this.ALGORITHM, key);
      decipher.setAuthTag(tag);
      decipher.setAAD(Buffer.from('subscription-data'));

      let decrypted = decipher.update(encrypted, undefined, 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;

    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Hash sensitive data for comparison (one-way)
   */
  static hash(data: string): string {
    const salt = process.env.SUBSCRIPTION_HASH_SALT || 'default-salt';
    return crypto.createHash('sha256').update(data + salt).digest('hex');
  }

  /**
   * Generate secure random token
   */
  static generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Encrypt payment method information
   */
  static encryptPaymentMethod(paymentData: any): string {
    const sensitiveFields = {
      lastFourDigits: paymentData.lastFourDigits,
      expiryMonth: paymentData.expiryMonth,
      expiryYear: paymentData.expiryYear,
      cardType: paymentData.cardType,
      bankName: paymentData.bankName
    };

    return this.encrypt(JSON.stringify(sensitiveFields));
  }

  /**
   * Decrypt payment method information
   */
  static decryptPaymentMethod(encryptedData: string): any {
    try {
      const decryptedJson = this.decrypt(encryptedData);
      return JSON.parse(decryptedJson);
    } catch (error) {
      console.error('Error decrypting payment method:', error);
      return null;
    }
  }

  /**
   * Encrypt subscription metadata
   */
  static encryptMetadata(metadata: any): string {
    return this.encrypt(JSON.stringify(metadata));
  }

  /**
   * Decrypt subscription metadata
   */
  static decryptMetadata(encryptedData: string): any {
    try {
      const decryptedJson = this.decrypt(encryptedData);
      return JSON.parse(decryptedJson);
    } catch (error) {
      console.error('Error decrypting metadata:', error);
      return {};
    }
  }

  /**
   * Mask sensitive data for logging
   */
  static maskSensitiveData(data: any): any {
    const masked = { ...data };

    // Mask common sensitive fields
    const sensitiveFields = [
      'password',
      'cardNumber',
      'cvv',
      'accountNumber',
      'routingNumber',
      'ssn',
      'taxId'
    ];

    sensitiveFields.forEach(field => {
      if (masked[field]) {
        masked[field] = '***MASKED***';
      }
    });

    // Mask email partially
    if (masked.email) {
      const [local, domain] = masked.email.split('@');
      if (local && domain) {
        masked.email = `${local.substring(0, 2)}***@${domain}`;
      }
    }

    // Mask phone numbers
    if (masked.phone) {
      masked.phone = masked.phone.replace(/\d(?=\d{4})/g, '*');
    }

    return masked;
  }

  /**
   * Generate encryption key for new installations
   */
  static generateEncryptionKey(): string {
    return crypto.randomBytes(this.KEY_LENGTH).toString('hex');
  }

  /**
   * Validate encryption key format
   */
  static validateEncryptionKey(key: string): boolean {
    if (!key) return false;

    // Check if it's a valid hex string of correct length
    if (key.length === 64 && /^[0-9a-fA-F]+$/.test(key)) {
      return true;
    }

    // Or any string that can be hashed
    return key.length >= 16;
  }
}