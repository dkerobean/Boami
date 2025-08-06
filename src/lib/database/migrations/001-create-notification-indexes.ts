import mongoose from 'mongoose';
import { connectToDatabase } from '../mongoose-connection';

export async function up(): Promise<void> {
  await connectToDatabase();

  const db = mongoose.connection.db;
  
  if (!db) {
    throw new Error('Database connection not established');
  }

  console.log('Creating notification system indexes...');

  // NotificationEvent indexes
  await db.collection('notificationevents').createIndexes([
    { key: { type: 1, processed: 1 }, name: 'type_processed_idx' },
    { key: { userId: 1, processed: 1 }, name: 'userId_processed_idx' },
    { key: { scheduledFor: 1, processed: 1 }, name: 'scheduledFor_processed_idx' },
    { key: { priority: 1, processed: 1 }, name: 'priority_processed_idx' },
    { key: { createdAt: -1 }, name: 'createdAt_desc_idx' },
    { key: { processed: 1 }, name: 'processed_idx' }
  ]);

  // QueuedNotification indexes
  await db.collection('queuednotifications').createIndexes([
    { key: { status: 1, scheduledFor: 1 }, name: 'status_scheduledFor_idx' },
    { key: { priority: -1, createdAt: 1 }, name: 'priority_createdAt_idx' },
    { key: { userId: 1, status: 1 }, name: 'userId_status_idx' },
    { key: { attempts: 1, maxAttempts: 1 }, name: 'attempts_maxAttempts_idx' },
    { key: { eventId: 1 }, name: 'eventId_idx' },
    { key: { status: 1 }, name: 'status_idx' },
    { key: { scheduledFor: 1 }, name: 'scheduledFor_idx' }
  ]);

  // EmailTemplate indexes
  await db.collection('emailtemplates').createIndexes([
    { key: { type: 1, isActive: 1 }, name: 'type_isActive_idx' },
    { key: { name: 1 }, name: 'name_idx', unique: true },
    { key: { isActive: 1 }, name: 'isActive_idx' }
  ]);

  // NotificationLog indexes
  await db.collection('notificationlogs').createIndexes([
    { key: { userId: 1, sentAt: -1 }, name: 'userId_sentAt_idx' },
    { key: { type: 1, sentAt: -1 }, name: 'type_sentAt_idx' },
    { key: { status: 1, sentAt: -1 }, name: 'status_sentAt_idx' },
    { key: { sentAt: -1 }, name: 'sentAt_desc_idx' },
    { key: { notificationId: 1 }, name: 'notificationId_idx' }
  ]);

  // EmailPreferences indexes
  await db.collection('emailpreferences').createIndexes([
    { key: { userId: 1 }, name: 'userId_idx', unique: true },
    { key: { unsubscribeToken: 1 }, name: 'unsubscribeToken_idx', unique: true, sparse: true }
  ]);

  console.log('Notification system indexes created successfully');
}

export async function down(): Promise<void> {
  await connectToDatabase();

  const db = mongoose.connection.db;
  
  if (!db) {
    throw new Error('Database connection not established');
  }

  console.log('Dropping notification system indexes...');

  // Drop all custom indexes (keep _id indexes)
  const collections = [
    'notificationevents',
    'queuednotifications',
    'emailtemplates',
    'notificationlogs',
    'emailpreferences'
  ];

  for (const collectionName of collections) {
    try {
      const collection = db.collection(collectionName);
      const indexes = await collection.indexes();

      for (const index of indexes) {
        if (index.name && index.name !== '_id_') {
          await collection.dropIndex(index.name);
        }
      }
    } catch (error) {
      console.warn(`Failed to drop indexes for ${collectionName}:`, error);
    }
  }

  console.log('Notification system indexes dropped successfully');
}