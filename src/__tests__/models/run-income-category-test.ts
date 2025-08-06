/**
 * Test runner for IncomeCategory model
 * Simple test runner to validate the model functionality
 */

import { connectDB, disconnectDB } from '@/lib/database/connection';
import IncomeCategory from '@/lib/database/models/IncomeCategory';

async function runIncomeCategoryTests() {
  console.log('🚀 Starting IncomeCategory Model Tests\n');
  console.log('=' .repeat(50));

  let passed = 0;
  let failed = 0;

  const testUserId = 'test-user-123';
  const testUserId2 = 'test-user-456';

  try {
    // Connect to database
    await connectDB();
    console.log('✅ Connected to database');

    // Clean up test data
    await IncomeCategory.deleteMany({
      userId: { $in: [testUserId, testUserId2] }
    });
    console.log('✅ Cleaned up test data');

    // Test 1: Create a valid income category
    console.log('\n📋 Test 1: Create valid income category');
    try {
      const categoryData = {
        name: 'Test Category',
        description: 'Test description',
        userId: testUserId
      };

      const category = new IncomeCategory(categoryData);
      const savedCategory = await category.save();

      if (savedCategory.name === categoryData.name &&
          savedCategory.userId === categoryData.userId &&
          savedCategory.isDefault === false) {
        console.log('✅ Test 1 PASSED');
        passed++;
      } else {
        console.log('❌ Test 1 FAILED: Category data mismatch');
        failed++;
      }
    } catch (error) {
      console.log('❌ Test 1 FAILED:', error);
      failed++;
    }

    // Test 2: Test uniqueness constraint
    console.log('\n📋 Test 2: Test uniqueness constraint');
    try {
      const categoryData = {
        name: 'Duplicate Category',
        userId: testUserId
      };

      // Create first category
      const category1 = new IncomeCategory(categoryData);
      await category1.save();

      // Try to create duplicate
      const category2 = new IncomeCategory(categoryData);

      try {
        await category2.save();
        console.log('❌ Test 2 FAILED: Should have thrown uniqueness error');
        failed++;
      } catch (duplicateError) {
        console.log('✅ Test 2 PASSED: Uniqueness constraint working');
        passed++;
      }
    } catch (error) {
      console.log('❌ Test 2 FAILED:', error);
      failed++;
    }

    // Test 3: Test ownership method
    console.log('\n📋 Test 3: Test ownership method');
    try {
      const category = new IncomeCategory({
        name: 'Ownership Test Category',
        userId: testUserId
      });

      await category.save();

      if (category.isOwnedBy(testUserId) && !category.isOwnedBy(testUserId2)) {
        console.log('✅ Test 3 PASSED');
        passed++;
      } else {
        console.log('❌ Test 3 FAILED: Ownership method not working correctly');
        failed++;
      }
    } catch (error) {
      console.log('❌ Test 3 FAILED:', error);
      failed++;
    }

    // Test 4: Test findByUser method
    console.log('\n📋 Test 4: Test findByUser method');
    try {
      // Create test categories
      await IncomeCategory.create([
        { name: 'User Category 1', userId: testUserId, isDefault: false },
        { name: 'User Category 2', userId: testUserId, isDefault: false },
        { name: 'Other User Category', userId: testUserId2, isDefault: false }
      ]);

      const categories = await IncomeCategory.findByUser(testUserId);

      if (categories.length >= 2 && categories.every(cat => cat.userId === testUserId)) {
        console.log('✅ Test 4 PASSED');
        passed++;
      } else {
        console.log('❌ Test 4 FAILED: findByUser not working correctly');
        failed++;
      }
    } catch (error) {
      console.log('❌ Test 4 FAILED:', error);
      failed++;
    }

    // Test 5: Test createDefaultCategories method
    console.log('\n📋 Test 5: Test createDefaultCategories method');
    try {
      const categories = await IncomeCategory.createDefaultCategories(testUserId2);

      if (categories.length > 0 && categories.every(cat => cat.userId === testUserId2)) {
        console.log('✅ Test 5 PASSED');
        passed++;
      } else {
        console.log('❌ Test 5 FAILED: createDefaultCategories not working correctly');
        failed++;
      }
    } catch (error) {
      console.log('❌ Test 5 FAILED:', error);
      failed++;
    }

  } catch (error) {
    console.error('❌ Test execution failed:', error);
    failed++;
  } finally {
    // Clean up and disconnect
    await IncomeCategory.deleteMany({
      userId: { $in: [testUserId, testUserId2] }
    });
    await disconnectDB();
    console.log('✅ Cleaned up and disconnected from database');
  }

  // Final Results
  console.log('\n' + '='.repeat(50));
  console.log('🏁 INCOME CATEGORY MODEL TEST RESULTS');
  console.log('='.repeat(50));
  console.log(`✅ Tests Passed: ${passed}`);
  console.log(`❌ Tests Failed: ${failed}`);
  console.log(`📊 Success Rate: ${passed > 0 ? Math.round((passed / (passed + failed)) * 100) : 0}%`);

  if (failed === 0) {
    console.log('\n🎉 All IncomeCategory model tests passed!');
  } else {
    console.log('\n⚠️ Some tests failed. Please review the errors above.');
  }

  return failed === 0;
}

// Run tests if this file is executed directly
if (require.main === module) {
  runIncomeCategoryTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Failed to run tests:', error);
    process.exit(1);
  });
}

export { runIncomeCategoryTests };