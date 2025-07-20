/**
 * Test script for financial seeder and migration utilities
 */

import {
  seedFinancialCategoriesForUser,
  cleanupUserFinancialData,
  validateUserFinancialData
} from '@/lib/database/seeders/financial-seeder';

import {
  initializeFinancialSystem,
  ensureFinancialCollections,
  createFinancialIndexes
} from '@/lib/database/migrations/financial-migrations';

async function testFinancialSeeder() {
  console.log('🧪 Testing Financial Seeder and Migration Utilities\n');
  console.log('=' .repeat(60));

  let passed = 0;
  let failed = 0;
  const testUserId = 'test-seeder-user-123';

  try {
    // Test 1: Initialize Financial System
    console.log('\n📋 Test 1: Initialize Financial System');
    try {
      const initResult = await initializeFinancialSystem();

      if (initResult.success) {
        console.log('✅ Test 1 PASSED: Financial system initialized');
        console.log(`   Message: ${initResult.message}`);
        passed++;
      } else {
        console.log('❌ Test 1 FAILED:', initResult.message);
        failed++;
      }
    } catch (error) {
      console.log('❌ Test 1 FAILED:', error);
      failed++;
    }

    // Test 2: Ensure Collections
    console.log('\n📋 Test 2: Ensure Financial Collections');
    try {
      const collectionsResult = await ensureFinancialCollections();

      if (collectionsResult.success) {
        console.log('✅ Test 2 PASSED: Collections ensured');
        console.log(`   Created: ${collectionsResult.data?.created?.length || 0}`);
        console.log(`   Existing: ${collectionsResult.data?.existing?.length || 0}`);
        passed++;
      } else {
        console.log('❌ Test 2 FAILED:', collectionsResult.message);
        failed++;
      }
    } catch (error) {
      console.log('❌ Test 2 FAILED:', error);
      failed++;
    }

    // Test 3: Create Indexes
    console.log('\n📋 Test 3: Create Financial Indexes');
    try {
      const indexResult = await createFinancialIndexes();

      if (indexResult.success) {
        console.log('✅ Test 3 PASSED: Indexes created');
        console.log(`   Results: ${indexResult.data?.results?.length || 0} operations`);
        passed++;
      } else {
        console.log('❌ Test 3 FAILED:', indexResult.message);
        failed++;
      }
    } catch (error) {
      console.log('❌ Test 3 FAILED:', error);
      failed++;
    }

    // Test 4: Seed Financial Categories
    console.log('\n📋 Test 4: Seed Financial Categories for User');
    try {
      const seedResult = await seedFinancialCategoriesForUser(testUserId);

      if (seedResult.success && seedResult.data?.totals?.created > 0) {
        console.log('✅ Test 4 PASSED: Categories seeded');
        console.log(`   Income categories: ${seedResult.data.income?.created || 0}`);
        console.log(`   Expense categories: ${seedResult.data.expense?.created || 0}`);
        console.log(`   Total created: ${seedResult.data.totals.created}`);
        passed++;
      } else {
        console.log('❌ Test 4 FAILED:', seedResult.message);
        failed++;
      }
    } catch (error) {
      console.log('❌ Test 4 FAILED:', error);
      failed++;
    }

    // Test 5: Validate Financial Data
    console.log('\n📋 Test 5: Validate Financial Data');
    try {
      const validateResult = await validateUserFinancialData(testUserId);

      if (validateResult.success) {
        console.log('✅ Test 5 PASSED: Data validation completed');
        console.log(`   Income categories: ${validateResult.data?.counts?.incomeCategories || 0}`);
        console.log(`   Expense categories: ${validateResult.data?.counts?.expenseCategories || 0}`);
        console.log(`   Has issues: ${validateResult.data?.validation?.hasIssues || false}`);
        passed++;
      } else {
        console.log('❌ Test 5 FAILED:', validateResult.message);
        failed++;
      }
    } catch (error) {
      console.log('❌ Test 5 FAILED:', error);
      failed++;
    }

    // Test 6: Test Duplicate Seeding (Should Skip)
    console.log('\n📋 Test 6: Test Duplicate Seeding Prevention');
    try {
      const duplicateResult = await seedFinancialCategoriesForUser(testUserId);

      if (duplicateResult.success && duplicateResult.data?.totals?.skipped > 0) {
        console.log('✅ Test 6 PASSED: Duplicate seeding prevented');
        console.log(`   Skipped: ${duplicateResult.data.totals.skipped}`);
        console.log(`   Created: ${duplicateResult.data.totals.created}`);
        passed++;
      } else {
        console.log('❌ Test 6 FAILED: Should have skipped existing categories');
        failed++;
      }
    } catch (error) {
      console.log('❌ Test 6 FAILED:', error);
      failed++;
    }

    // Test 7: Cleanup User Data
    console.log('\n📋 Test 7: Cleanup User Financial Data');
    try {
      const cleanupResult = await cleanupUserFinancialData(testUserId);

      if (cleanupResult.success && cleanupResult.data?.totalDeleted > 0) {
        console.log('✅ Test 7 PASSED: User data cleaned up');
        console.log(`   Total deleted: ${cleanupResult.data.totalDeleted}`);
        console.log(`   Income categories: ${cleanupResult.data.deletedCounts?.incomeCategories || 0}`);
        console.log(`   Expense categories: ${cleanupResult.data.deletedCounts?.expenseCategories || 0}`);
        passed++;
      } else {
        console.log('❌ Test 7 FAILED:', cleanupResult.message);
        failed++;
      }
    } catch (error) {
      console.log('❌ Test 7 FAILED:', error);
      failed++;
    }

  } catch (error) {
    console.error('❌ Test execution failed:', error);
    failed++;
  }

  // Final Results
  console.log('\n' + '='.repeat(60));
  console.log('🏁 FINANCIAL SEEDER TEST RESULTS');
  console.log('='.repeat(60));
  console.log(`✅ Tests Passed: ${passed}`);
  console.log(`❌ Tests Failed: ${failed}`);
  console.log(`📊 Success Rate: ${passed > 0 ? Math.round((passed / (passed + failed)) * 100) : 0}%`);

  if (failed === 0) {
    console.log('\n🎉 All financial seeder tests passed!');
  } else {
    console.log('\n⚠️ Some tests failed. Please review the errors above.');
  }

  console.log('\n📝 Test Coverage Summary:');
  console.log('   • Financial system initialization');
  console.log('   • Database collection creation');
  console.log('   • Index creation and management');
  console.log('   • Category seeding for users');
  console.log('   • Data validation and integrity checks');
  console.log('   • Duplicate prevention mechanisms');
  console.log('   • User data cleanup utilities');

  return failed === 0;
}

// Run tests if this file is executed directly
if (require.main === module) {
  testFinancialSeeder().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Failed to run tests:', error);
    process.exit(1);
  });
}

export { testFinancialSeeder };