import RedisClient from './redis-client';
import { ISubscription } from '../database/models/Subscription';
import { IPlan } from '../database/models/Plan';

/**
 * Subscription caching service for improved performance
 */
export class SubscriptionCache {
  private static readonly CACHE_PREFIX = 'subscription:';
  private static readonly PLAN_PREFIX = 'plan:';
  private static readonly USER_SUBSCRIPTION_PREFIX = 'user_subscription:';
  private static readonly FEATURE_ACCESS_PREFIX = 'feature_access:';

  // Cache TTL in seconds
  private static readonly DEFAULT_TTL = 3600; // 1 hour
  private static readonly SUBSCRIPTION_TTL = 1800; // 30 minutes
  private static readonly PLAN_TTL = 7200; // 2 hours
  private static readonly FEATURE_ACCESS_TTL = 900; // 15 minutes

  /**
   * Check if caching is available
   */
  private static isCacheAvailable(): boolean {
    return RedisClient.isRedisConnected();
  }

  /**
   * Generate cache key
   */
  private static generateKey(prefix: string, identifier: string): string {
    return `${prefix}${identifier}`;
  }

  /**
   * Cache subscription data
   */
  static async cacheSubscription(subscription: any): Promise<void> {
    if (!this.isCacheAvailable()) return;

    try {
      const client = RedisClient.getInstance();
      const key = this.generateKey(this.CACHE_PREFIX, subscription._id.toString());

      // Cache the subscription
      await client.setex(key, this.SUBSCRIPTION_TTL, JSON.stringify(subscription));

      // Cache user -> subscription mapping
      const userKey = this.generateKey(this.USER_SUBSCRIPTION_PREFIX, subscription.userId.toString());
      await client.setex(userKey, this.SUBSCRIPTION_TTL, subscription._id.toString());

      console.log(`📦 Cached subscription: ${subscription._id}`);
    } catch (error) {
      console.error('Failed to cache subscription:', error);
    }
  }

  /**
   * Get cached subscription
   */
  static async getCachedSubscription(subscriptionId: string): Promise<any | null> {
    if (!this.isCacheAvailable()) return null;

    try {
      const client = RedisClient.getInstance();
      const key = this.generateKey(this.CACHE_PREFIX, subscriptionId);
      const cached = await client.get(key);

      if (cached) {
        console.log(`🎯 Cache hit for subscription: ${subscriptionId}`);
        return JSON.parse(cached);
      }

      console.log(`❌ Cache miss for subscription: ${subscriptionId}`);
      return null;
    } catch (error) {
      console.error('Failed to get cached subscription:', error);
      return null;
    }
  }

  /**
   * Get cached subscription by user ID
   */
  static async getCachedUserSubscription(userId: string): Promise<any | null> {
    if (!this.isCacheAvailable()) return null;

    try {
      const client = RedisClient.getInstance();
      const userKey = this.generateKey(this.USER_SUBSCRIPTION_PREFIX, userId);
      const subscriptionId = await client.get(userKey);

      if (subscriptionId) {
        return await this.getCachedSubscription(subscriptionId);
      }

      return null;
    } catch (error) {
      console.error('Failed to get cached user subscription:', error);
      return null;
    }
  }

  /**
   * Cache plan data
   */
  static async cachePlan(plan: any): Promise<void> {
    if (!this.isCacheAvailable()) return;

    try {
      const client = RedisClient.getInstance();
      const key = this.generateKey(this.PLAN_PREFIX, plan._id.toString());

      await client.setex(key, this.PLAN_TTL, JSON.stringify(plan));
      console.log(`📦 Cached plan: ${plan._id}`);
    } catch (error) {
      console.error('Failed to cache plan:', error);
    }
  }

  /**
   * Get cached plan
   */
  static async getCachedPlan(planId: string): Promise<any | null> {
    if (!this.isCacheAvailable()) return null;

    try {
      const client = RedisClit.getInstance();
      const key = this.generateKey(this.PLAN_PREFIX, planId);
      const cached = await client.get(key);

      if (cached) {
        console.log(`🎯 Cache hit for plan: ${planId}`);
        return JSON.parse(cached);
      }

      console.log(`❌ Cache miss for plan: ${planId}`);
      return null;
    } catch (error) {
      console.error('Failed to get cached plan:', error);
      return null;
    }
  }

  /**
   * Cache feature access result
   */
  static async cacheFeatureAccess(
    userId: string,
    feature: string,
    hasAccess: boolean
  ): Promise<void> {
    if (!this.isCacheAvailable()) return;

    try {
      const client = RedisClient.getInstance();
      const key = this.generateKey(this.FEATURE_ACCESS_PREFIX, `${userId}:${feature}`);

      await client.setex(key, this.FEATURE_ACCESS_TTL, JSON.stringify({ hasAccess, cachedAt: Date.now() }));
      console.log(`📦 Cached feature access: ${userId}:${feature} = ${hasAccess}`);
    } catch (error) {
      console.error('Failed to cache feature access:', error);
    }
  }

  /**
   * Get cached feature access result
   */
  static async getCachedFeatureAccess(userId: string, feature: string): Promise<boolean | null> {
    if (!this.isCacheAvailable()) return null;

    try {
      const client = RedisClient.getInstance();
      const key = this.generateKey(this.FEATURE_ACCESS_PREFIX, `${userId}:${feature}`);
      const cached = await client.get(key);

      if (cached) {
        const data = JSON.parse(cached);
        console.log(`🎯 Cache hit for feature access: ${userId}:${feature} = ${data.hasAccess}`);
        return data.hasAccess;
      }

      console.log(`❌ Cache miss for feature access: ${userId}:${feature}`);
      return null;
    } catch (error) {
      console.error('Failed to get cached feature access:', error);
      return null;
    }
  }

  /**
   * Invalidate subscription cache
   */
  static async invalidateSubscription(subscriptionId: string, userId?: string): Promise<void> {
    if (!this.isCacheAvailable()) return;

    try {
      const client = RedisClient.getInstance();
      const keys = [this.generateKey(this.CACHE_PREFIX, subscriptionId)];

      if (userId) {
        keys.push(this.generateKey(this.USER_SUBSCRIPTION_PREFIX, userId));

        // Also invalidate feature access cache for this user
        await this.invalidateUserFeatureAccess(userId);
      }

      await client.del(...keys);
      console.log(`🗑️ Invalidated subscription cache: ${subscriptionId}`);
    } catch (error) {
      console.error('Failed to invalidate subscription cache:', error);
    }
  }

  /**
   * Invalidate plan cache
   */
  static async invalidatePlan(planId: string): Promise<void> {
    if (!this.isCacheAvailable()) return;

    try {
      const client = RedisClient.getInstance();
      const key = this.generateKey(this.PLAN_PREFIX, planId);

      await client.del(key);
      console.log(`🗑️ Invalidated plan cache: ${planId}`);
    } catch (error) {
      console.error('Failed to invalidate plan cache:', error);
    }
  }

  /**
   * Invalidate all feature access cache for a user
   */
  static async invalidateUserFeatureAccess(userId: string): Promise<void> {
    if (!this.isCacheAvailable()) return;

    try {
      const client = RedisClient.getInstance();
      const pattern = this.generateKey(this.FEATURE_ACCESS_PREFIX, `${userId}:*`);

      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(...keys);
        console.log(`🗑️ Invalidated feature access cache for user: ${userId} (${keys.length} keys)`);
      }
    } catch (error) {
      console.error('Failed to invalidate user feature access cache:', error);
    }
  }

  /**
   * Cache multiple subscriptions
   */
  static async cacheMultipleSubscriptions(subscriptions: any[]): Promise<void> {
    if (!this.isCacheAvailable() || subscriptions.length === 0) return;

    try {
      const client = RedisClient.getInstance();
      const pipeline = client.pipeline();

      for (const subscription of subscriptions) {
        const key = this.generateKey(this.CACHE_PREFIX, subscription._id.toString());
        const userKey = this.generateKey(this.USER_SUBSCRIPTION_PREFIX, subscription.userId.toString());

        pipeline.setex(key, this.SUBSCRIPTION_TTL, JSON.stringify(subscription));
        pipeline.setex(userKey, this.SUBSCRIPTION_TTL, subscription._id.toString());
      }

      await pipeline.exec();
      console.log(`📦 Cached ${subscriptions.length} subscriptions`);
    } catch (error) {
      console.error('Failed to cache multiple subscriptions:', error);
    }
  }

  /**
   * Cache multiple plans
   */
  static async cacheMultiplePlans(plans: any[]): Promise<void> {
    if (!this.isCacheAvailable() || plans.length === 0) return;

    try {
      const client = RedisClient.getInstance();
      const pipeline = client.pipeline();

      for (const plan of plans) {
        const key = this.generateKey(this.PLAN_PREFIX, plan._id.toString());
        pipeline.setex(key, this.PLAN_TTL, JSON.stringify(plan));
      }

      await pipeline.exec();
      console.log(`📦 Cached ${plans.length} plans`);
    } catch (error) {
      console.error('Failed to cache multiple plans:', error);
    }
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats(): Promise<any> {
    if (!this.isCacheAvailable()) return null;

    try {
      const client = RedisClient.getInstance();

      const [subscriptionKeys, planKeys, userSubKeys, featureKeys] = await Promise.all([
        client.keys(this.generateKey(this.CACHE_PREFIX, '*')),
        client.keys(this.generateKey(this.PLAN_PREFIX, '*')),
        client.keys(this.generateKey(this.USER_SUBSCRIPTION_PREFIX, '*')),
        client.keys(this.generateKey(this.FEATURE_ACCESS_PREFIX, '*'))
      ]);

      return {
        subscriptions: subscriptionKeys.length,
        plans: planKeys.length,
        userSubscriptions: userSubKeys.length,
        featureAccess: featureKeys.length,
        total: subscriptionKeys.length + planKeys.length + userSubKeys.length + featureKeys.length
      };
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return null;
    }
  }

  /**
   * Warm up cache with frequently accessed data
   */
  static async warmUpCache(): Promise<void> {
    if (!this.isCacheAvailable()) return;

    try {
      console.log('🔥 Warming up subscription cache...');

      // Import models dynamically to avoid circular dependencies
      const { Subscription, Plan } = await import('../database/models');

      // Cache active subscriptions
      const activeSubscriptions = await Subscription.find({
        isActive: true,
        status: 'active'
      })
      .populate('planId')
      .limit(100) // Limit to most recent 100
      .sort({ updatedAt: -1 });

      await this.cacheMultipleSubscriptions(activeSubscriptions);

      // Cache active plans
      const activePlans = await Plan.find({ isActive: true });
      await this.cacheMultiplePlans(activePlans);

      console.log(`🔥 Cache warmed up: ${activeSubscriptions.length} subscriptions, ${activePlans.length} plans`);
    } catch (error) {
      console.error('Failed to warm up cache:', error);
    }
  }

  /**
   * Clear all subscription-related cache
   */
  static async clearAllCache(): Promise<void> {
    if (!this.isCacheAvailable()) return;

    try {
      const client = RedisClient.getInstance();

      const patterns = [
        this.generateKey(this.CACHE_PREFIX, '*'),
        this.generateKey(this.PLAN_PREFIX, '*'),
        this.generateKey(this.USER_SUBSCRIPTION_PREFIX, '*'),
        this.generateKey(this.FEATURE_ACCESS_PREFIX, '*')
      ];

      for (const pattern of patterns) {
        const keys = await client.keys(pattern);
        if (keys.length > 0) {
          await client.del(...keys);
        }
      }

      console.log('🗑️ Cleared all subscription cache');
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  /**
   * Set cache with custom TTL
   */
  static async setCustomCache(key: string, value: any, ttl: number): Promise<void> {
    if (!this.isCacheAvailable()) return;

    try {
      const client = RedisClient.getInstance();
      await client.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error('Failed to set custom cache:', error);
    }
  }

  /**
   * Get custom cache
   */
  static async getCustomCache(key: string): Promise<any | null> {
    if (!this.isCacheAvailable()) return null;

    try {
      const client = RedisClient.getInstance();
      const cached = await client.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Failed to get custom cache:', error);
      return null;
    }
  }
}