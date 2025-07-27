import { connectToDatabase } from '../mongoose-connection';
import { User } from '../models/User';
import { Plan } from '../models/Plan';
import { Subscription } from '../models/Subscription';
import { Transaction } from '../models/Transaction';

/**
 * Migration: Set up subscription system database structure
 * This migration creates indexes and initial data for the subscription system
 */

export async function up(): Promise<void> {
  console.log('Running migration: 001_subscription_system_setup');

  await connectToDatabase();

  try {
    // Create indexes for User model (subscription-related fields)
    console.log('Creating User indexes...');
    await User.collection.createIndex({ email: 1 }, { unique: true });
    await User.collection.createIndex({ 'subscription.status': 1 });
    await User.collection.createIndex({ 'subscription.planId': 1 });
    await User.collection.createIndex({ 'subscription.currentPeriodEnd': 1 });
    await User.collection.createIndex({ createdAt: 1 });
    await User.collection.createIndex({ updatedAt: 1 });

    // Create indexes for Plan model
    console.log('Creating Plan indexes...');
    await Plan.collection.createIndex({ name: 1 }, { unique: true });
    await Plan.collection.createIndex({ active: 1 });
    await Plan.collection.createIndex({ 'price.monthly': 1 });
    await Plan.collection.createIndex({ 'price.annual': 1 });
    await Plan.collection.createIndex({ createdAt: 1 });

    // Create indexes for Subscription model
    console.log('Creating Subscription indexes...');
    await Subscription.collection.createIndex({ userId: 1 });
    await Subscription.collection.createIndex({ planId: 1 });
    await Subscription.collection.createIndex({ status: 1 });
    await Subscription.collection.createIndex({ currentPeriodEnd: 1 });
    await Subscription.collection.createIndex({ currentPeriodStart: 1 });
    await Subscription.collection.createIndex({ cancelledAt: 1 });
    await Subscription.collection.createIndex({ expiredAt: 1 });
    await Subscription.collection.createIndex({ createdAt: 1 });
    await Subscription.collection.createIndex({ updatedAt: 1 });

    // Compound indexes for common queries
    await Subscription.collection.createIndex({ userId: 1, status: 1 });
    await Subscription.collection.createIndex({ planId: 1, status: 1 });
    await Subscription.collection.createIndex({ status: 1, currentPeriodEnd: 1 });

    // Create indexes for Transaction model
    console.log('Creating Transaction indexes...');
    await Transaction.collection.createIndex({ userId: 1 });
    await Transaction.collection.createIndex({ subscriptionId: 1 });
    await Transaction.collection.createIndex({ flutterwaveTransactionId: 1 }, { unique: true, sparse: true });
    await Transaction.collection.createIndex({ status: 1 });
    await Transaction.collection.createIndex({ type: 1 });
    await Transaction.collection.createIndex({ createdAt: 1 });
    await Transaction.collection.createIndex({ updatedAt: 1 });

    // Compound indexes for analytics and reporting
    await Transaction.collection.createIndex({ status: 1, createdAt: 1 });
    await Transaction.collection.createIndex({ type: 1, status: 1 });
    await Transaction.collection.createIndex({ userId: 1, status: 1 });

    // Create default subscription plans
    console.log('Creating default subscription plans...');

    const defaultPlans = [
      {
        name: 'Basic',
        description: 'Perfect for individuals getting started',
        price: {
          monthly: 9.99,
          annual: 99.99,
          currency: 'USD'
        },
        features: [
          'Up to 5 projects',
          'Basic analytics',
          'Email support',
          '1GB storage'
        ],
        limits: {
          projects: 5,
          storage: 1024, // MB
          apiCalls: 1000
        },
        active: true,
        trialDays: 14,
        metadata: {
          popular: false,
          recommended: false
        }
      },
      {
        name: 'Professional',
        description: 'Best for growing businesses',
        price: {
          monthly: 29.99,
          annual: 299.99,
          currency: 'USD'
        },
        features: [
          'Up to 25 projects',
          'Advanced analytics',
          'Priority email support',
          '10GB storage',
          'API access',
          'Custom integrations'
        ],
        limits: {
          projects: 25,
          storage: 10240, // MB
          apiCalls: 10000
        },
        active: true,
        trialDays: 14,
        metadata: {
          popular: true,
          recommended: true
        }
      },
      {
        name: 'Enterprise',
        description: 'For large organizations with advanced needs',
        price: {
          monthly: 99.99,
          annual: 999.99,
          currency: 'USD'
        },
        features: [
          'Unlimited projects',
          'Enterprise analytics',
          'Phone & email support',
          '100GB storage',
          'Full API access',
          'Custom integrations',
          'Dedicated account manager',
          'SLA guarantee'
        ],
        limits: {
          projects: -1, // Unlimited
          storage: 102400, // MB
          apiCalls: -1 // Unlimited
        },
        active: true,
        trialDays: 30,
        metadata: {
          popular: false,
          recommended: false
        }
      }
    ];

    for (const planData of defaultPlans) {
      const existingPlan = await Plan.findOne({ name: planData.name });
      if (!existingPlan) {
        await Plan.create(planData);
        console.log(`Created plan: ${planData.name}`);
      } else {
        console.log(`Plan already exists: ${planData.name}`);
      }
    }

    // Update existing users to have default subscription status
    console.log('Updating existing users with default subscription status...');

    const usersWithoutSubscription = await User.find({
      $or: [
        { subscription: { $exists: false } },
        { 'subscription.status': { $exists: false } }
      ]
    });

    for (const user of usersWithoutSubscription) {
      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            'subscription.status': 'none',
            'subscription.planId': null,
            'subscription.currentPeriodStart': null,
            'subscription.currentPeriodEnd': null,
            'subscription.cancelAtPeriodEnd': false
          }
        }
      );
    }

    console.log(`Updated ${usersWithoutSubscription.length} users with default subscription status`);

    console.log('Migration 001_subscription_system_setup completed successfully');

  } catch (error) {
    console.error('Migration 001_subscription_system_setup failed:', error);
    throw error;
  }
}

export async function down(): Promise<void> {
  console.log('Rolling back migration: 001_subscription_system_setup');

  await connectToDatabase();

  try {
    // Remove indexes (MongoDB will automatically remove them when collections are dropped)
    // For a safer rollback, we'll just remove the default plans

    console.log('Removing default subscription plans...');
    await Plan.deleteMany({
      name: { $in: ['Basic', 'Professional', 'Enterprise'] }
    });

    // Remove subscription fields from users (optional - be careful with this)
    console.log('Removing subscription fields from users...');
    await User.updateMany(
      {},
      {
        $unset: {
          'subscription': 1
        }
      }
    );

    console.log('Migration 001_subscription_system_setup rollback completed');

  } catch (error) {
    console.error('Migration 001_subscription_system_setup rollback failed:', error);
    throw error;
  }
}