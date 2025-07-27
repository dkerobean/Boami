/**
 * Notification system initialization script
 * Run this to set up the notification system in your application
 */

import { connectToDatabase } from '../database/mongoose-connection';
import { initializeNotificationSystem } from './index';

async function main() {
  try {
    console.log('Starting notification system initialization...');

    // Connect to database
    await connectToDatabase();
    console.log('Database connected');

    // Initialize notification system
    await initializeNotificationSystem();

    console.log('Notification system initialization completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Notification system initialization failed:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}

export default main;