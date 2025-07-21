import { Types } from 'mongoose';
import { Plan, Subscription, User } from '../database/models';
import { connectDB } from '../database/mongoose-connection';
import { IFeatureConfig } from '../database/models/Plan';

/**
 * Feature usage tracking interface
 */
export interface FeatureUsage {
  userId: string;
  feature: string;
  currentUsage: number;
  limit: number | null;
  resetDate?: Date;
}

/**
 * Feature access result interface
 */
export interface FeatureAccessResult {
  hasAccess: boolean;
  reason?: string;
  limit?: number | null;
  currentUsage?: number;
  upgradeRequired?: boolean;
  suggestedPlan?: string;
}

/**
 * Feature control service
 * Manages feature access control and usage tracking for subscription plans
 */
export class FeatureControlService {
  private featureUsageCache: Map<string, FeatureUsage> = new Map();

  /**
   * Check if user has access to a specific feature
   * @param userId - User ID
   * @param feature - Feature name
   * @returns Promise<FeatureAccessResult> - Access result
   */
  async checkAccess(userId: string, feature: string): Promise<FeatureAccessResult> {
    await connectDB();

    try {
      // Get user's subscription
      const subscription = await Subscription.findByUserId(new Types.ObjectId(userId));

      if (!subscription || !subscription.isActive()) {
        return {
          hasAccess: false,
          reason: 'No active subscription',
          upgradeRequired: true,
          suggestedPlan: await this.getSuggestedPlanForFeature(feature)
        };
      }

      // Get plan details
      const plan = await Plan.findById(subscription.planId);
      if (!plan) {
        return {
          hasAccess: false,
          reason: 'Plan not found'
        };
      }

      // Check if feature exists in plan
      const featureConfig = plan.features[feature];
      if (!featureConfig) {
        return {
          hasAccess: false,
          reason: 'Feature not available in any plan',
          upgradeRequired: true
        };
      }

      // Check if feature is enabled
      if (!featureConfig.enabled) {
        return {
          hasAccess: false,
          reason: 'Feature not included in current plan',
          upgradeRequired: true,
          suggestedPlan: await this.getSuggestedPlanForFeature(feature)
        };
      }

      // If no limit, user has unlimited access
      if (!featureConfig.limit) {
        return {
          hasAccess: true,
          limit: null
        };
      }

      // Check usage against limit
      const currentUsage = await this.getCurrentUsage(userId, feature);

      if (currentUsage >= featureConfig.limit) {
        return {
          hasAccess: false,
          reason: 'Feature usage limit exceeded',
          limit: featureConfig.limit,
          currentUsage,
          upgradeRequired: true,
          suggestedPlan: await this.getSuggestedPlanForFeature(feature, featureConfig.limit)
        };
      }

      return {
        hasAccess: true,
        limit: featureConfig.limit,
        currentUsage
      };

    } catch (error: any) {
      console.error('Feature access check error:', error);
      return {
        hasAccess: false,
        reason: 'Error checking feature access'
      };
    }
  }

  /**
   * Get all available features for a user's current plan
   * @param userId - User ID
   * @returns Promise<IFeatureConfig> - Available features
   */
  async getAvailableFeatures(userId: string): Promise<IFeatureConfig> {
    await connectDB();

    try {
      const subscription = await Subscription.findByUserId(new Types.ObjectId(userId));

      if (!subscription || !subscription.isActive()) {
        return {};
      }

      const plan = await Plan.findById(subscription.planId);
      if (!plan) {
        return {};
      }

      // Filter only enabled features
      const availableFeatures: IFeatureConfig = {};

      Object.keys(plan.features).forEach(featureName      const feature = plan.features[featureName];
        if (feature.enabled) {
          availableFeatures[featureName] = feature;
        }
      });

      return availableFeatures;

    } catch (error: any) {
      console.error('Get available features error:', error);
      return {};
    }
  }

  /**
   * Update feature configuration for a plan
   * @param planId - Plan ID
   * @param features - Feature configuration
   * @returns Promise<void>
   */
  async updateFeatureConfig(planId: string, features: IFeatureConfig): Promise<void> {
    await connectDB();

    try {
      const plan = await Plan.findById(planId);
      if (!plan) {
        throw new Error('Plan not found');
      }

      plan.features = { ...plan.features, ...features };
      await plan.save();

      // Clear cache for affected users
      this.clearFeatureUsageCache();

    } catch (error: any) {
      console.error('Update feature config error:', error);
      throw new Error(`Failed to update feature config: ${error.message}`);
    }
  }

  /**
   * Track feature usage
   * @param userId - User ID
   * @param feature - Feature name
   * @param increment - Usage increment (default: 1)
   * @returns Promise<FeatureUsage> - Updated usage
   */
  async trackUsage(userId: string, feature: string, increment: number = 1): Promise<FeatureUsage> {
    await connectDB();

    try {
      const cacheKey = `${userId}:${feature}`;
      let usage = this.featureUsageCache.get(cacheKey);

      if (!usage) {
        // Initialize usage tracking
        const subscription = await Subscription.findByUserId(new Types.ObjectId(userId));
        const plan = subscription ? await Plan.findById(subscription.planId) : null;
        const featureConfig = plan?.features[feature];

        usage = {
          userId,
          feature,
          currentUsage: 0,
          limit: featureConfig?.limit || null,
          resetDate: this.getUsageResetDate()
        };
      }

      // Check if usage should be reset (monthly reset)
      if (usage.resetDate && new Date() > usage.resetDate) {
        usage.currentUsage = 0;
        usage.resetDate = this.getUsageResetDate();
      }

      // Increment usage
      usage.currentUsage += increment;

      // Update cache
      this.featureUsageCache.set(cacheKey, usage);

      // Persist to database (you might want to implement this)
      // await this.persistUsageToDatabase(usage);

      return usage;

    } catch (error: any) {
      console.error('Track usage error:', error);
      throw new Error(`Failed to track usage: ${error.message}`);
    }
  }

  /**
   * Get current usage for a feature
   * @param userId - User ID
   * @param feature - Feature name
   * @returns Promise<number> - Current usage
   */
  async getCurrentUsage(userId: string, feature: string): Promise<number> {
    const cacheKey = `${userId}:${feature}`;
    const usage = this.featureUsageCache.get(cacheKey);

    if (!usage) {
      return 0;
    }

    // Check if usage should be reset
    if (usage.resetDate && new Date() > usage.resetDate) {
      return 0;
    }

    return usage.currentUsage;
  }

  /**
   * Get usage statistics for a user
   * @param userId - User ID
   * @returns Promise<Record<string, FeatureUsage>> - Usage statistics
   */
  async getUserUsageStats(userId: string): Promise<Record<string, FeatureUsage>> {
    await connectDB();

    try {
      const availableFeatures = await this.getAvailableFeatures(userId);
      const usageStats: Record<string, FeatureUsage> = {};

      for (const featureName of Object.keys(availableFeatures)) {
        const feature = availableFeatures[featureName];
        const currentUsage = await this.getCurrentUsage(userId, featureName);

        usageStats[featureName] = {
          userId,
          feature: featureName,
          currentUsage,
          limit: feature.limit || null,
          resetDate: this.getUsageResetDate()
        };
      }

      return usageStats;

    } catch (error: any) {
      console.error('Get user usage stats error:', error);
      return {};
    }
  }

  /**
   * Reset usage for a user (admin function)
   * @param userId - User ID
   * @param feature - Feature name (optional, resets all if not provided)
   * @returns Promise<void>
   */
  async resetUsage(userId: string, feature?: string): Promise<void> {
    try {
      if (feature) {
        const cacheKey = `${userId}:${feature}`;
        const usage = this.featureUsageCache.get(cacheKey);
        if (usage) {
          usage.currentUsage = 0;
          usage.resetDate = this.getUsageResetDate();
          this.featureUsageCache.set(cacheKey, usage);
        }
      } else {
        // Reset all features for user
        for (const [key, usage] of this.featureUsageCache.entries()) {
          if (usage.userId === userId) {
            usage.currentUsage = 0;
            usage.resetDate = this.getUsageResetDate();
            this.featureUsageCache.set(key, usage);
          }
        }
      }

    } catch (error: any) {
      console.error('Reset usage error:', error);
      throw new Error(`Failed to reset usage: ${error.message}`);
    }
  }

  /**
   * Get suggested plan for a feature
   * @param feature - Feature name
   * @param requiredLimit - Required limit (optional)
   * @returns Promise<string | undefined> - Suggested plan name
   */
  private async getSuggestedPlanForFeature(feature: string, requiredLimit?: number): Promise<string | undefined> {
    try {
      const plans = await Plan.findActivePlans();

      for (const plan of plans) {
        const featureConfig = plan.features[feature];
        if (featureConfig && featureConfig.enabled) {
          if (!requiredLimit || !featureConfig.limit || featureConfig.limit > requiredLimit) {
            return plan.name;
          }
        }
      }

      return undefined;

    } catch (error) {
      console.error('Get suggested plan error:', error);
      return undefined;
    }
  }

  /**
   * Get usage reset date (next month)
   * @returns Date - Reset date
   */
  private getUsageResetDate(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }

  /**
   * Clear feature usage cache
   */
  private clearFeatureUsageCache(): void {
    this.featureUsageCache.clear();
  }

  /**
   * Get feature comparison between plans
   * @returns Promise<any> - Feature comparison
   */
  async getFeatureComparison(): Promise<any> {
    await connectDB();

    try {
      const plans = await Plan.findActivePlans();
      const featureComparison: any = {};

      // Get all unique features
      const allFeatures = new Set<string>();
      plans.forEach(plan => {
        Object.keys(plan.features).forEach(feature => allFeatures.add(feature));
      });

      // Build comparison matrix
      Array.from(allFeatures).forEach(feature => {
        featureComparison[feature] = {};

        plans.forEach(plan => {
          const featureConfig = plan.features[feature];
          featureComparison[feature][plan.name] = {
            enabled: featureConfig?.enabled || false,
            limit: featureConfig?.limit || null,
            description: featureConfig?.description || ''
          };
        });
      });

      return {
        plans: plans.map(plan => ({
          id: plan._id,
          name: plan.name,
          description: plan.description,
          price: plan.price
        })),
        features: featureComparison
      };

    } catch (error: any) {
      console.error('Get feature comparison error:', error);
      throw new Error(`Failed to get feature comparison: ${error.message}`);
    }
  }

  /**
   * Validate feature access with middleware-friendly response
   * @param userId - User ID
   * @param feature - Feature name
   * @returns Promise<{ allowed: boolean, error?: string, statusCode?: number }> - Validation result
   */
  async validateFeatureAccess(userId: string, feature: string): Promise<{ allowed: boolean, error?: string, statusCode?: number }> {
    try {
      const accessResult = await this.checkAccess(userId, feature);

      if (!accessResult.hasAccess) {
        return {
          allowed: false,
          error: accessResult.reason || 'Access denied',
          statusCode: accessResult.upgradeRequired ? 402 : 403 // 402 Payment Required or 403 Forbidden
        };
      }

      return { allowed: true };

    } catch (error: any) {
      console.error('Validate feature access error:', error);
      return {
        allowed: false,
        error: 'Internal server error',
        statusCode: 500
      };
    }
  }

  /**
   * Get feature usage analytics for admin
   * @returns Promise<any> - Usage analytics
   */
  async getFeatureUsageAnalytics(): Promise<any> {
    try {
      const usageStats: Record<string, { totalUsers: number, averageUsage: number, topUsers: any[] }> = {};

      // Analyze cached usage data
      for (const [key, usage] of this.featureUsageCache.entries()) {
        const feature = usage.feature;

        if (!usageStats[feature]) {
          usageStats[feature] = {
            totalUsers: 0,
            averageUsage: 0,
            topUsers: []
          };
        }

        usageStats[feature].totalUsers++;
        usageStats[feature].averageUsage += usage.currentUsage;
        usageStats[feature].topUsers.push({
          userId: usage.userId,
          usage: usage.currentUsage,
          limit: usage.limit
        });
      }

      // Calculate averages and sort top users
      Object.keys(usageStats).forEach(feature => {
        const stats = usageStats[feature];
        stats.averageUsage = stats.totalUsers > 0 ? stats.averageUsage / stats.totalUsers : 0;
        stats.topUsers = stats.topUsers
          .sort((a, b) => b.usage - a.usage)
          .slice(0, 10); // Top 10 users
      });

      return usageStats;

    } catch (error: any) {
      console.error('Get feature usage analytics error:', error);
      throw new Error(`Failed to get feature usage analytics: ${error.message}`);
    }
  }
}

// Export singleton instance
export const featureControlService = new FeatureControlService();
export default FeatureControlService;