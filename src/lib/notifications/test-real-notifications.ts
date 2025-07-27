/**
 * Test script for real notifications
 * Run this to test the real notification system
 */

import { RealNotificationsService } from '../services/real-notifications';

export async function testRealNotifications() {
  try {
    console.log('🔔 Testing Real Notifications System...\n');

    // Test getting real notifications
    console.log('📋 Fetching real notifications...');
    const notifications = await RealNotificationsService.getRealNotifications(undefined, 10);

    console.log(`✅ Found ${notifications.length} notifications:\n`);

    notifications.forEach((notification, index) => {
      console.log(`${index + 1}. ${notification.title}`);
      console.log(`   ${notification.subtitle}`);
      console.log(`   Type: ${notification.type}`);
      console.log(`   Time: ${notification.timestamp.toLocaleString()}`);
      console.log('');
    });

    // Test notification count
    const count = await RealNotificationsService.getNotificationCount();
    console.log(`📊 Total unread notifications: ${count}\n`);

    // Test formatted notifications (for header)
    console.log('🎨 Testing formatted notifications for header...');
    const formatted = await RealNotificationsService.getFormattedNotifications(undefined, 5);

    console.log(`✅ Formatted ${formatted.length} notifications for header component\n`);

    formatted.forEach((notification, index) => {
      console.log(`${index + 1}. ${notification.title} - ${notification.subtitle}`);
    });

    console.log('\n🎉 Real notifications test completed successfully!');

    return {
      success: true,
      notificationCount: notifications.length,
      unreadCount: count,
      formattedCount: formatted.length
    };

  } catch (error) {
    console.error('❌ Real notifications test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testRealNotifications().then(result => {
    console.log('\n📊 Test Result:', result);
    process.exit(result.success ? 0 : 1);
  });
}