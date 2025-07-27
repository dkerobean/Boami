# Subscription System Test Suite

This directory contains comprehensive tests for the subscription payment system, covering all aspects from unit tests to end-to-end integration tests.

## Test Structure

```
src/__tests__/
├── services/                 # Unit tests for services
│   ├── subscription-service.test.ts
│   ├── payment-service.test.ts
│   └── subscription-email-service.test.ts
├── integration/             # Integration tests
│   └── flutterwave-payment-flow.test.ts
├── e2e/                     # End-to-end tests
│   └── subscription-lifecycle.test.ts
├── webhooks/                # Webhook tests
│   └── flutterwave-webhook.test.ts
├── performance/             # Performance tests
│   └── subscription-performance.test.ts
├── setup/                   # Test setup and utilities
│   └── subscription-test-setup.ts
└── README.md               # This file
```

## Test Types

### 1. Unit Tests (`services/`)

Tests individual service methods in isolation with mocked dependencies.

**Coverage:**
- SubscriptionService: Create, update, cancel, retrieve subscriptions
- PaymentService: Initialize payments, verify transactions, process refunds
- SubscriptionEmailService: Send various subscription-related emails

**Run:** `npm run test:subscription unit`

### 2. Integration Tests (`integration/`)

Tests the complete payment flow with Flutterwave integration using sandbox environment.

**Coverage:**
- Full payment initialization and verification flow
- Webhook processing with real payloads
- Database state consistency
- Error handling and recovery

**Run:** `npm run test:subscription integration`

### 3. End-to-End Tests (`e2e/`)

Tests complete subscription lifecycle from user signup to cancellation.

**Coverage:**
- Complete subscription journey
- Plan upgrades and downgrades
- Renewal cycles
- Failed payment handling
- Grace periods and expiration

**Run:** `npm run test:subscription e2e`

### 4. Webhook Tests (`webhooks/`)

Tests webhook handlers with mock Flutterwave payloads.

**Coverage:**
- Webhook authentication and signature verification
- Different event types (charge.completed, subscription.cancelled, etc.)
- Duplicate event handling
- Error scenarios and malformed payloads

**Run:** `npm run test:subscription webhooks`

### 5. Performance Tests (`performance/`)

Tests system performance under various load conditions.

**Coverage:**
- Subscription status checking performance
- Feature access control performance
- Database query optimization
- Concurrent access handling
- Memory usage and resource management

**Run:** `npm run test:subscription performance`

## Running Tests

### Prerequisites

1. Install dependencies:
```bash
npm install
```

2. Set up test environment variables (automatically handled by test setup):
```bash
NODE_ENV=test
JWT_SECRET=test-jwt-secret
FLUTTERWAVE_SECRET_KEY=test-key
FLUTTERWAVE_SECRET_HASH=test-hash
```

### Running All Tests

```bash
# Run all subscription tests
npm run test:subscription all

# Or use the test runner directly
node src/__tests__/run-subscription-tests.ts all
```

### Running Specific Test Types

```bash
# Unit tests only
npm run test:subscription unit

# Integration tests only
npm run test:subscription integration

# E2E tests only
npm run test:subscription e2e

# Webhook tests only
npm run test:subscription webhooks

# Performance tests only
npm run test:subscription performance
```

### Running Individual Test Files

```bash
# Run specific test file
npx jest src/__tests__/services/subscription-service.test.ts

# Run with coverage
npx jest src/__tests__/services/subscription-service.test.ts --coverage

# Run in watch mode
npx jest src/__tests__/services/subscription-service.test.ts --watch
```

## Test Configuration

### Jest Configuration

The Jest configuration is set up with different projects for different test types:

- **Unit tests**: Use jsdom environment for React components
- **Integration/E2E tests**: Use node environment with MongoDB Memory Server
- **Performance tests**: Extended timeout (2 minutes) for load testing

### Test Database

Tests use MongoDB Memory Server for isolated, fast testing:

- Each test suite gets a fresh database instance
- No external database dependencies
- Automatic cleanup after tests

### Mocking Strategy

- **External APIs**: Flutterwave API calls are mocked
- **Email services**: Email sending is mocked to prevent actual emails
- **Database**: Real database operations with in-memory MongoDB
- **Time-sensitive operations**: Can be mocked for consistent testing

## Test Data Management

### Test Helpers

The test setup provides helpers for creating test data:

```typescript
import {
  createTestUser,
  createTestPlan,
  createTestSubscription,
  createTestTransaction
} from './setup/subscription-test-setup';

// Create test user
const user = await createTestUser({ email: 'test@example.com' });

// Create test plan
const plan = await createTestPlan({ name: 'Test Plan', price: { monthly: 29.99 } });

// Create test subscription
const subscription = await createTestSubscription(user._id, plan._id);
```

### Data Cleanup

Tests automatically clean up data between runs:

- Database collections are cleared between tests
- In-memory database is destroyed after test suites
- No persistent test data

## Coverage Requirements

The test suite maintains high coverage standards:

- **Global minimum**: 70% coverage (branches, functions, lines, statements)
- **Subscription services**: 80% coverage
- **Payment services**: 80% coverage
- **Email services**: 75% coverage

### Viewing Coverage

```bash
# Generate coverage report
npm run test:subscription all

# Open HTML coverage report
open coverage/lcov-report/index.html
```

## Debugging Tests

### Debug Mode

```bash
# Run tests with debug output
DEBUG=* npm run test:subscription unit

# Run specific test with debugging
npx jest --runInBand --detectOpenHandles src/__tests__/services/subscription-service.test.ts
```

### Common Issues

1. **Database connection issues**: Ensure MongoDB Memory Server is properly set up
2. **Timeout errors**: Increase timeout for slow operations
3. **Mock issues**: Verify mocks are properly reset between tests
4. **Memory leaks**: Use `--detectOpenHandles` to find unclosed resources

## Continuous Integration

### GitHub Actions

The test suite is designed to run in CI environments:

```yaml
- name: Run Subscription Tests
  run: |
    npm run test:subscription all

- name: Upload Coverage
  uses: codecov/codecov-action@v1
  with:
    file: ./coverage/lcov.info
```

### Test Parallelization

Tests can be run in parallel for faster CI execution:

```bash
# Run tests in parallel
npx jest --maxWorkers=4 src/__tests__/
```

## Best Practices

### Writing Tests

1. **Descriptive test names**: Use clear, descriptive test names
2. **Arrange-Act-Assert**: Follow AAA pattern for test structure
3. **Single responsibility**: Each test should test one specific behavior
4. **Mock external dependencies**: Don't rely on external services
5. **Clean up**: Ensure tests clean up after themselves

### Test Organization

1. **Group related tests**: Use `describe` blocks to group related tests
2. **Setup and teardown**: Use `beforeEach`/`afterEach` for common setup
3. **Test data**: Use factories for creating consistent test data
4. **Error scenarios**: Test both success and failure cases

### Performance Testing

1. **Realistic data volumes**: Use realistic amounts of test data
2. **Measure consistently**: Use consistent measurement approaches
3. **Set reasonable thresholds**: Performance thresholds should be achievable
4. **Monitor trends**: Track performance over time

## Troubleshooting

### Common Test Failures

1. **Timeout errors**: Increase test timeout or optimize slow operations
2. **Database connection errors**: Check MongoDB Memory Server setup
3. **Mock assertion errors**: Verify mock expectations match actual calls
4. **Race conditions**: Use proper async/await patterns

### Getting Help

1. Check test logs for detailed error messages
2. Run tests individually to isolate issues
3. Use debugging tools and breakpoints
4. Review test setup and configuration

## Contributing

When adding new features to the subscription system:

1. **Add corresponding tests**: Every new feature should have tests
2. **Maintain coverage**: Ensure coverage thresholds are met
3. **Update documentation**: Update this README if needed
4. **Run full test suite**: Ensure all tests pass before submitting

### Test Checklist

- [ ] Unit tests for new service methods
- [ ] Integration tests for new API endpoints
- [ ] E2E tests for new user workflows
- [ ] Webhook tests for new event types
- [ ] Performance tests for new database queries
- [ ] Error handling tests for failure scenarios
- [ ] Documentation updates