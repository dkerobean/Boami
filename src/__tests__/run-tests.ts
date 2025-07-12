/**
 * Test runner for authentication utilities
 * Runs all authentication-related tests
 */

import { runner as passwordTests } from './auth/password.test';
import { runner as jwtTests } from './auth/jwt.test';
import { runner as verificationTests } from './auth/verification.test';

async function runAllTests() {
  console.log('🚀 Starting Authentication Test Suite\n');
  console.log('=' .repeat(50));
  
  let totalPassed = 0;
  let totalFailed = 0;
  
  try {
    // Run Password Manager Tests
    console.log('\n📋 PASSWORD MANAGER TESTS');
    console.log('-'.repeat(30));
    const passwordSuccess = await passwordTests.run();
    if (!passwordSuccess) totalFailed++;
    else totalPassed++;
    
    console.log('\n📋 JWT MANAGER TESTS');
    console.log('-'.repeat(30));
    const jwtSuccess = await jwtTests.run();
    if (!jwtSuccess) totalFailed++;
    else totalPassed++;
    
    console.log('\n📋 VERIFICATION CODE MANAGER TESTS');
    console.log('-'.repeat(30));
    const verificationSuccess = await verificationTests.run();
    if (!verificationSuccess) totalFailed++;
    else totalPassed++;
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    totalFailed++;
  }
  
  // Final Results
  console.log('\n' + '='.repeat(50));
  console.log('🏁 FINAL TEST RESULTS');
  console.log('='.repeat(50));
  console.log(`✅ Test Suites Passed: ${totalPassed}`);
  console.log(`❌ Test Suites Failed: ${totalFailed}`);
  console.log(`📊 Success Rate: ${totalPassed > 0 ? Math.round((totalPassed / (totalPassed + totalFailed)) * 100) : 0}%`);
  
  if (totalFailed === 0) {
    console.log('\n🎉 All authentication tests passed! The system is ready for production.');
  } else {
    console.log('\n⚠️ Some tests failed. Please review the errors above and fix the issues.');
  }
  
  console.log('\n📝 Test Coverage Summary:');
  console.log('   • Password validation and generation');
  console.log('   • JWT token creation and verification');
  console.log('   • Verification code generation and validation');
  console.log('   • Security measures and rate limiting');
  console.log('   • Error handling and edge cases');
  
  return totalFailed === 0;
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Failed to run tests:', error);
    process.exit(1);
  });
}

export { runAllTests };