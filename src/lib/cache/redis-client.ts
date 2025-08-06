import Redis from 'ioredis';

/**
 * Redis client configuration and management
 */
class RedisClient {
  private static instance: Redis | null = null;
  private static isConnected = false;

  /**
   * Get Redis client instance (singleton)
   */
  static getInstance(): Redis {
    if (!this.instance) {
      this.instance = this.createClient();
    }
    return this.instance;
  }

  /**
   * Create Redis client with configuration
   */
  private static createClient(): Redis {
    const redisUrl = process.env.REDIS_URL;
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = parseInt(process.env.REDIS_PORT || '6379');
    const redisPassword = process.env.REDIS_PASSWORD;
    const redisDb = parseInt(process.env.REDIS_DB || '0');

    let client: Redis;

    if (redisUrl) {
      // Use Redis URL if provided (common in production)
      client = new Redis(redisUrl, {
        enableReadyCheck: false,
        maxRetriesPerRequest: null,
      });
    } else {
      // Use individual configuration
      client = new Redis({
        host: redisHost,
        port: redisPort,
        password: redisPassword,
        db: redisDb,
        enableReadyCheck: false,
        maxRetriesPerRequest: null,
      });
    }

    // Event handlers
    client.on('connect', () => {
      console.log('✅ Redis client connected');
      this.isConnected = true;
    });

    client.on('ready', () => {
      console.log('✅ Redis client ready');
    });

    client.on('error', (error) => {
      console.error('❌ Redis client error:', error);
      this.isConnected = false;
    });

    client.on('close', () => {
      console.log('🔌 Redis client connection closed');
      this.isConnected = false;
    });

    client.on('reconnecting', () => {
      console.log('🔄 Redis client reconnecting...');
    });

    return client;
  }

  /**
   * Check if Redis is connected
   */
  static isRedisConnected(): boolean {
    return this.isConnected && this.instance?.status === 'ready';
  }

  /**
   * Close Redis connection
   */
  static async disconnect(): Promise<void> {
    if (this.instance) {
      await this.instance.quit();
      this.instance = null;
      this.isConnected = false;
    }
  }

  /**
   * Test Redis connection
   */
  static async testConnection(): Promise<boolean> {
    try {
      const client = this.getInstance();
      const result = await client.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Redis connection test failed:', error);
      return false;
    }
  }

  /**
   * Get Redis info
   */
  static async getInfo(): Promise<any> {
    try {
      const client = this.getInstance();
      const info = await client.info();
      return this.parseRedisInfo(info);
    } catch (error) {
      console.error('Failed to get Redis info:', error);
      return null;
    }
  }

  /**
   * Parse Redis info string into object
   */
  private static parseRedisInfo(info: string): any {
    const lines = info.split('\r\n');
    const result: any = {};
    let currentSection = 'general';

    for (const line of lines) {
      if (line.startsWith('#')) {
        currentSection = line.substring(2).toLowerCase();
        result[currentSection] = {};
      } else if (line.includes(':')) {
        const [key, value] = line.split(':');
        if (!result[currentSection]) {
          result[currentSection] = {};
        }
        result[currentSection][key] = value;
      }
    }

    return result;
  }

  /**
   * Flush all Redis data (use with caution)
   */
  static async flushAll(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot flush Redis in production environment');
    }

    try {
      const client = this.getInstance();
      await client.flushall();
      console.log('🗑️ Redis data flushed');
    } catch (error) {
      console.error('Failed to flush Redis:', error);
      throw error;
    }
  }
}

export default RedisClient;