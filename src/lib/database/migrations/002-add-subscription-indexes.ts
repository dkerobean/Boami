import { connectDB } from '../mongoose-connection';
import mongoose from 'mongoose';

/**
 * Migration to add database indexes for subscription system
 * Optimizes query performance for subscription-related operations
 */
export async function up() {
  await connectDB();
  const db = mongoose.connection.db;

  try {
    // Plan collection indexes
    await db.collection('plans').createIndex({ isActive: 1, sortOrder: 1 });
    await db.collection('plans').createIndex({ name: 1 });
    await db.collection('plans').createIndex({ flutterwavePlanId: 1 }, { sparse: true });
    console.log('✅ Created Plan collection indexes');

    // Subscription collection indexes
    await db.collection('subscriptions').createIndex({ userId: 1 });
    await db.collection('subscriptions').createIndex({ planId: 1 });
    await db.collection('subscriptions').createIndex({ status: 1 });
    await db.collection('subscriptions').createIndex({ currentPeriodEnd: 1 });
    await db.collection('subscriptions').createIndex({ userId: 1, status: 1 });
    await db.collection('subscriptions').createIndex({ status: 1, currentPeriodEnd: 1 });
    await db.collection('subscriptions').createIndex({ flutterwaveSubscriptionId: 1 }, { sparse: true });

    // Unique index to ensure one active subscription per user
    await db.collection('subscriptions').createIndex(
      { userId: 1, status: 1 },
      {
        unique: true,
        partialFilterExpression: { status: 'active' }
      }
    );
    console.log('✅ Created Subscription collection indexes');

    // Transaction collection indexes
    await db.collection('transactions').createIndex({ userId: 1 });
    await db.collection('transactions').createIndex({ subscriptionId: 1 });
    await db.collection('transactions').createIndex({ flutterwaveTransactionId: 1 });
    await db.collection('transactions').createIndex({ flutterwaveReference: 1 });
    await db.collection('transactions').createIndex({ status: 1 });
    await db.collection('transactions').createIndex({ type: 1 });
    await db.collection('transactions').createIndex({ processedAt: 1 });
    await db.collection('transactions').createIndex({ userId: 1, status: 1 });
    await db.collection('transactions').createIndex({ status: 1, createdAt: -1 });
    await db.collection('transactions').createIndex({ type: 1, status: 1 });
    await db.collection('transactions').createIndex({ createdAt: -1 });
    console.log('✅ Created Transaction collection indexes');

    // User collection subscription-related indexes
    await db.collection('users').createIndex({ role: 1 });
    await db.collection('users').createIndex({ isActive: 1 });
    await db.collection('users').createIndex({ isEmailVerified: 1 });
    await db.collection('users').createIndex({ email: 1, isEmailVerified: 1 });
    console.log('✅ Updated User collection indexes');

    console.log('✅ All subscription system indexes created successfully');
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    throw error;
  }
}

/**
 * Rollback migration - removes subscription-related indexes
 */
export async function down() {
  await connectDB();
  const db = mongoose.connection.db;

  try {
    // Drop Plan collection indexes
    await db.collection('plans').dropIndex({ isActive: 1, sortOrder: 1 });
    await db.collection('plans').dropIndex({ name: 1 });
    await db.collection('plans').dropIndex({ flutterwavePlanId: 1 });

    // Drop Subscription collection indexes
    await db.collection('subscriptions').dropIndex({ userId: 1 });
    await db.collection('subscriptions').dropIndex({ planId: 1 });
    await db.collection('subscriptions').dropIndex({ status: 1 });
    await db.collection('subscriptions').dropIndex({ currentPeriodEnd: 1 });
    await db.collection('subscriptions').dropIndex({ userId: 1, status: 1 });
    await db.collection('subscriptions').dropIndex({ status: 1, currentPeriodEnd: 1 });
    await db.collection('subscriptions').dropIndex({ flutterwaveSubscriptionId: 1 });

    // Drop Transaction collection indexes
    await db.collection('transactions').dropIndex({ userId: 1 });
    await db.collection('transactions').dropIndex({ subscriptionId: 1 });
    await db.collection('transactions').dropIndex({ flutterwaveTransactionId: 1 });
    await db.collection('transactions').dropIndex({ flutterwaveReference: 1 });
    await db.collection('transactions').dropIndex({ status: 1 });
    await db.collection('transactions').dropIndex({ type: 1 });
    await db.collection('transactions').dropIndex({ processedAt: 1 });
    await db.collection('transactions').dropIndex({ userId: 1, status: 1 });
    await db.collection('transactions').dropIndex({ status: 1, createdAt: -1 });
    await db.collection('transactions').dropIndex({ type: 1, status: 1 });
    await db.collection('transactions').dropIndex({ createdAt: -1 });

    console.log('✅ Subscription system indexes migration rolled back');
  } catch (error) {
    console.error('❌ Error dropping indexes:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  up().catch(console.error);
}