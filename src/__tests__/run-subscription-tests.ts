#!/usr/bin/env node

/**
 * Test runner for subscription system tests
 * Usage: npm run test:subscription [test-type]
 * Test types: unit, integration, e2e, webhooks, performance, all
 */

import { execSync } from 'child_process';
import path from 'path';

const testTypes = {
  unit: 'src/__tests__/services/**/*.test.ts',
  integration: 'src/__tests__/integration/**/*.test.ts',
  e2e: 'src/__tests__/e2e/**/*.test.ts',
  webhooks: 'src/__tests__/webhooks/**/*.test.ts',
  performance: 'src/__tests__/performance/**/*.test.ts'
};

const testType = process.argv[2] || 'all';

console.log('🧪 Running Subscription System Tests');
console.log('=====================================');

if (testType === 'all') {
  console.log('Running all subscription tests...\n');

  for (const [type, pattern] of Object.entries(testTypes)) {
    console.log(`\n📋 Running ${type} tests...`);
    console.log('-'.repeat(40));

    try {
      execSync(`npx jest ${pattern} --verbose --coverage`, {
        stdio: 'inherit',
        cwd: process.cwd()
      });
      console.log(`✅ ${type} tests completed successfully`);
    } catch (error) {
      console.error(`❌ ${type} tests failed`);
      process.exit(1);
    }
  }
} else if (testTypes[testType as keyof typeof testTypes]) {
  const pattern = testTypes[testType as keyof typeof testTypes];
  console.log(`Running ${testType} tests...`);
  console.log(`Pattern: ${pattern}\n`);

  try {
    execSync(`npx jest ${pattern} --verbose --coverage`, {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    console.log(`✅ ${testType} tests completed successfully`);
  } catch (error) {
    console.error(`❌ ${testType} tests failed`);
    process.exit(1);
  }
} else {
  console.error(`❌ Unknown test type: ${testType}`);
  console.log('Available test types:', Object.keys(testTypes).join(', '), 'all');
  process.exit(1);
}

console.log('\n🎉 All subscription tests completed!');
console.log('=====================================');