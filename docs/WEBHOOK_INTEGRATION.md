# Webhook Integration Guide

This guide provides comprehensive information on integrating with the Subscription Payment System webhooks, including setup, security, and troubleshooting.

## Table of Contents

1. [Overview](#overview)
2. [Webhook Events](#webhook-events)
3. [Security](#security)
4. [Integration Setup](#integration-setup)
5. [Event Handling](#event-handling)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)
8. [Best Practices](#best-practices)

## Overview

Webhooks allow your application to receive real-time notifications when events occur in the subscription system. This enables you to:

- Update subscription status in your database
- Send confirmation emails to customers
- Trigger business logic based on payment events
- Maintain data synchronization

### How Webhooks Work

1. An event occurs in the subscription system (e.g., payment completed)
2. The system sends an HTTP POST request to your webhook endpoint
3. Your application processes the webhook and responds with HTTP 200
4. If the webhook fails, the system retries with exponential backoff

## Webhook Events

### Subscription Events

#### `subscription.created`
Triggered when a new subscription is created.

```json
{
  "event": "subscription.created",
  "timestamp": "2024-01-01T12:00:00Z",
  "data": {
    "subscription": {
      "id": "sub_123",
      "userId": "user_456",
      "planId": "plan_789",
      "status": "pending",
      "billingPeriod": "monthly",
      "currentPeriodStart": "2024-01-01T00:00:00Z",
      "currentPeriodEnd": "2024-02-01T00:00:00Z",
      "trialEnd": "2024-01-15T00:00:00Z",
      "createdAt": "2024-01-01T12:00:00Z"
    },
    "user": {
      "id": "user_456",
      "email": "customer@example.com",
      "name": "John Doe"
    },
    "plan": {
      "id": "plan_789",
      "name": "Professional",
      "price": {
        "monthly": 29.99,
        "currency": "USD"
      }
    }
  }
}
```

#### `subscription.activated`
Triggered when a subscription becomes active (after successful payment).

```json
{
  "event": "subscription.activated",
  "timestamp": "2024-01-01T12:30:00Z",
  "data": {
    "subscription": {
      "id": "sub_123",
      "status": "active",
      "activatedAt": "2024-01-01T12:30:00Z"
    },
    "payment": {
      "id": "pay_789",
      "amount": 29.99,
      "currency": "USD",
      "status": "completed"
    }
  }
}
```

#### `subscription.updated`
Triggered when subscription details are modified (plan change, billing period change).

```json
{
  "event": "subscription.updated",
  "timestamp": "2024-01-15T10:00:00Z",
  "data": {
    "subscription": {
      "id": "sub_123",
      "previousPlanId": "plan_basic",
      "newPlanId": "plan_professional",
      "previousBillingPeriod": "monthly",
      "newBillingPeriod": "annual",
      "prorationAmount": 250.00,
      "updatedAt": "2024-01-15T10:00:00Z"
    },
    "changes": [
      {
        "field": "planId",
        "oldValue": "plan_basic",
        "newValue": "plan_professional"
      },
      {
        "field": "billingPeriod",
        "oldValue": "monthly",
        "newValue": "annual"
      }
    ]
  }
}
```

#### `subscription.cancelled`
Triggered when a subscription is cancelled.

```json
{
  "event": "subscription.cancelled",
  "timestamp": "2024-01-20T14:00:00Z",
  "data": {
    "subscription": {
      "id": "sub_123",
      "status": "cancelled",
      "cancelledAt": "2024-01-20T14:00:00Z",
      "cancelAtPeriodEnd": true,
      "cancelReason": "user_requested",
      "effectiveEndDate": "2024-02-01T00:00:00Z"
    }
  }
}
```

#### `subscription.reactivated`
Triggered when a cancelled subscription is reactivated.

```json
{
  "event": "subscription.reactivated",
  "timestamp": "2024-01-25T09:00:00Z",
  "data": {
    "subscription": {
      "id": "sub_123",
      "status": "active",
      "reactivatedAt": "2024-01-25T09:00:00Z",
      "cancelAtPeriodEnd": false
    }
  }
}
```

#### `subscription.expired`
Triggered when a subscription expires.

```json
{
  "event": "subscription.expired",
  "timestamp": "2024-02-01T00:00:00Z",
  "data": {
    "subscription": {
      "id": "sub_123",
      "status": "expired",
      "expiredAt": "2024-02-01T00:00:00Z"
    }
  }
}
```

### Payment Events

#### `payment.completed`
Triggered when a payment is successfully processed.

```json
{
  "event": "payment.completed",
  "timestamp": "2024-01-01T12:30:00Z",
  "data": {
    "payment": {
      "id": "pay_789",
      "subscriptionId": "sub_123",
      "amount": 29.99,
      "currency": "USD",
      "status": "completed",
      "flutterwaveReference": "FLW-MOCK-123456",
      "paymentMethod": "card",
      "completedAt": "2024-01-01T12:30:00Z"
    },
    "subscription": {
      "id": "sub_123",
      "status": "active"
    }
  }
}
```

#### `payment.failed`
Triggered when a payment fails.

```json
{
  "event": "payment.failed",
  "timestamp": "2024-01-01T12:15:00Z",
  "data": {
    "payment": {
      "id": "pay_789",
      "subscriptionId": "sub_123",
      "amount": 29.99,
      "currency": "USD",
      "status": "failed",
      "failureReason": "insufficient_funds",
      "failedAt": "2024-01-01T12:15:00Z"
    },
    "subscription": {
      "id": "sub_123",
      "status": "past_due"
    }
  }
}
```

#### `payment.refunded`
Triggered when a payment is refunded.

```json
{
  "event": "payment.refunded",
  "timestamp": "2024-01-10T16:00:00Z",
  "data": {
    "payment": {
      "id": "pay_789",
      "subscriptionId": "sub_123",
      "originalAmount": 29.99,
      "refundAmount": 29.99,
      "currency": "USD",
      "status": "refunded",
      "refundReason": "customer_request",
      "refundedAt": "2024-01-10T16:00:00Z"
    }
  }
}
```

### Trial Events

#### `trial.started`
Triggered when a trial period begins.

```json
{
  "event": "trial.started",
  "timestamp": "2024-01-01T12:00:00Z",
  "data": {
    "subscription": {
      "id": "sub_123",
      "status": "trialing",
      "trialStart": "2024-01-01T12:00:00Z",
      "trialEnd": "2024-01-15T12:00:00Z"
    }
  }
}
```

#### `trial.ending`
Triggered 3 days before trial expires.

```json
{
  "event": "trial.ending",
  "timestamp": "2024-01-12T12:00:00Z",
  "data": {
    "subscription": {
      "id": "sub_123",
      "status": "trialing",
      "trialEnd": "2024-01-15T12:00:00Z",
      "daysRemaining": 3
    }
  }
}
```

#### `trial.ended`
Triggered when trial period ends.

```json
{
  "event": "trial.ended",
  "timestamp": "2024-01-15T12:00:00Z",
  "data": {
    "subscription": {
      "id": "sub_123",
      "status": "active",
      "trialEnd": "2024-01-15T12:00:00Z",
      "convertedToActive": true
    }
  }
}
```

## Security

### Webhook Signature Verification

All webhooks include a signature header for verification:

```http
X-Webhook-Signature: sha256=<signature>
```

#### Verifying Signatures

**Node.js Example:**
```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');

  const receivedSignature = signature.replace('sha256=', '');

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(receivedSignature, 'hex')
  );
}

// Usage
app.post('/webhook', express.raw({type: 'application/json'}), (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const payload = req.body;

  if (!verifyWebhookSignature(payload, signature, process.env.WEBHOOK_SECRET)) {
    return res.status(401).send('Unauthorized');
  }

  // Process webhook
  const event = JSON.parse(payload);
  handleWebhookEvent(event);

  res.status(200).send('OK');
});
```

**Python Example:**
```python
import hmac
import hashlib

def verify_webhook_signature(payload, signature, secret):
    expected_signature = hmac.new(
        secret.encode('utf-8'),
        payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

    received_signature = signature.replace('sha256=', '')

    return hmac.compare_digest(expected_signature, received_signature)

# Usage
@app.route('/webhook', methods=['POST'])
def webhook():
    signature = request.headers.get('X-Webhook-Signature')
    payload = request.get_data(as_text=True)

    if not verify_webhook_signature(payload, signature, WEBHOOK_SECRET):
        return 'Unauthorized', 401

    event = request.get_json()
    handle_webhook_event(event)

    return 'OK', 200
```

### IP Whitelisting

For additional security, you can whitelist our webhook IP addresses:

```
52.214.14.220
52.49.173.169
52.214.14.217
```

### HTTPS Requirement

All webhook endpoints must use HTTPS in production. HTTP endpoints are only allowed for development and testing.

## Integration Setup

### 1. Create Webhook Endpoint

Create an endpoint in your application to receive webhooks:

```javascript
// Express.js example
app.post('/webhooks/subscription-system', (req, res) => {
  try {
    // Verify signature
    const signature = req.headers['x-webhook-signature'];
    if (!verifySignature(req.body, signature)) {
      return res.status(401).send('Unauthorized');
    }

    // Parse event
    const event = req.body;

    // Handle event
    handleWebhookEvent(event);

    // Respond with 200
    res.status(200).send('OK');

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Internal Server Error');
  }
});
```

### 2. Configure Webhook URL

Set your webhook URL in the admin dashboard:

1. Go to **Settings** > **Webhooks**
2. Add your webhook URL: `https://your-domain.com/webhooks/subscription-system`
3. Select the events you want to receive
4. Save the configuration

### 3. Test Your Integration

Use the webhook testing tool in the admin dashboard:

1. Go to **Settings** > **Webhooks**
2. Click **Test Webhook**
3. Select an event type
4. Send test webhook
5. Verify your endpoint receives and processes the webhook

## Event Handling

### Event Processing Pattern

```javascript
function handleWebhookEvent(event) {
  console.log(`Received webhook: ${event.event}`);

  switch (event.event) {
    case 'subscription.created':
      handleSubscriptionCreated(event.data);
      break;

    case 'subscription.activated':
      handleSubscriptionActivated(event.data);
      break;

    case 'subscription.cancelled':
      handleSubscriptionCancelled(event.data);
      break;

    case 'payment.completed':
      handlePaymentCompleted(event.data);
      break;

    case 'payment.failed':
      handlePaymentFailed(event.data);
      break;

    default:
      console.log(`Unhandled event type: ${event.event}`);
  }
}
```

### Idempotency

Implement idempotency to handle duplicate webhooks:

```javascript
const processedEvents = new Set();

function handleWebhookEvent(event) {
  // Create unique identifier for this event
  const eventId = `${event.event}_${event.data.subscription.id}_${event.timestamp}`;

  // Check if already processed
  if (processedEvents.has(eventId)) {
    console.log(`Event already processed: ${eventId}`);
    return;
  }

  // Process event
  processEvent(event);

  // Mark as processed
  processedEvents.add(eventId);
}
```

### Database Updates

Example of updating subscription status in your database:

```javascript
async function handleSubscriptionActivated(data) {
  const { subscription, payment } = data;

  try {
    // Update subscription in your database
    await db.subscriptions.update(
      { id: subscription.id },
      {
        status: 'active',
        activatedAt: subscription.activatedAt,
        lastPaymentId: payment.id,
        lastPaymentAmount: payment.amount,
        lastPaymentDate: payment.completedAt
      }
    );

    // Update user's access level
    await db.users.update(
      { id: subscription.userId },
      { subscriptionStatus: 'active' }
    );

    // Send confirmation email
    await sendSubscriptionActivatedEmail(subscription.userId);

    console.log(`Subscription ${subscription.id} activated successfully`);

  } catch (error) {
    console.error(`Error handling subscription activation:`, error);
    throw error; // This will cause webhook retry
  }
}
```

## Testing

### Local Development

Use ngrok to expose your local webhook endpoint:

```bash
# Install ngrok
npm install -g ngrok

# Expose local port
ngrok http 3000

# Use the HTTPS URL for webhook configuration
# Example: https://abc123.ngrok.io/webhooks/subscription-system
```

### Test Events

Send test webhooks using curl:

```bash
# Test subscription created event
curl -X POST https://your-domain.com/webhooks/subscription-system \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: sha256=test_signature" \
  -d '{
    "event": "subscription.created",
    "timestamp": "2024-01-01T12:00:00Z",
    "data": {
      "subscription": {
        "id": "test_sub_123",
        "userId": "test_user_456",
        "status": "pending"
      }
    }
  }'
```

### Webhook Testing Tool

Use our webhook testing tool in the admin dashboard:

1. **Go to Webhooks Settings**
2. **Select Event Type** (e.g., subscription.created)
3. **Customize Test Data** (optional)
4. **Send Test Webhook**
5. **Check Response** and logs

### Unit Testing

Example unit test for webhook handler:

```javascript
const request = require('supertest');
const app = require('../app');

describe('Webhook Handler', () => {
  test('should handle subscription.created event', async () => {
    const testEvent = {
      event: 'subscription.created',
      timestamp: '2024-01-01T12:00:00Z',
      data: {
        subscription: {
          id: 'test_sub_123',
          userId: 'test_user_456',
          status: 'pending'
        }
      }
    };

    const response = await request(app)
      .post('/webhooks/subscription-system')
      .send(testEvent)
      .expect(200);

    // Verify database was updated
    const subscription = await db.subscriptions.findById('test_sub_123');
    expect(subscription.status).toBe('pending');
  });
});
```

## Troubleshooting

### Common Issues

#### Webhook Not Received

**Possible Causes:**
- Incorrect webhook URL
- Firewall blocking requests
- SSL certificate issues
- Server not responding

**Solutions:**
1. Verify webhook URL is correct and accessible
2. Check server logs for incoming requests
3. Test endpoint with curl or Postman
4. Ensure HTTPS certificate is valid
5. Check firewall and security group settings

#### Signature Verification Failing

**Possible Causes:**
- Incorrect webhook secret
- Wrong signature calculation
- Body parsing issues

**Solutions:**
1. Verify webhook secret matches configuration
2. Use raw body for signature calculation
3. Check signature header format
4. Test with known good signature

#### Duplicate Events

**Possible Causes:**
- Network timeouts causing retries
- Not responding with HTTP 200
- Processing taking too long

**Solutions:**
1. Implement idempotency checks
2. Respond quickly with HTTP 200
3. Process events asynchronously
4. Use unique event identifiers

#### Events Out of Order

**Possible Causes:**
- Network delays
- Retry mechanisms
- Multiple webhook endpoints

**Solutions:**
1. Use timestamp to order events
2. Implement state machine logic
3. Handle out-of-order gracefully
4. Use event sequence numbers

### Debugging

#### Enable Webhook Logging

```javascript
app.post('/webhooks/subscription-system', (req, res) => {
  // Log all webhook details
  console.log('Webhook received:', {
    headers: req.headers,
    body: req.body,
    timestamp: new Date().toISOString()
  });

  try {
    handleWebhookEvent(req.body);
    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).send('Error');
  }
});
```

#### Webhook Delivery Logs

Check webhook delivery logs in the admin dashboard:

1. Go to **Settings** > **Webhooks**
2. Click **Delivery Logs**
3. View recent webhook attempts
4. Check response codes and error messages

#### Retry Mechanism

Our system automatically retries failed webhooks:

- **Retry Schedule**: 1min, 5min, 30min, 2hr, 6hr, 24hr
- **Max Retries**: 6 attempts
- **Retry Conditions**: Non-2xx response codes or timeouts
- **Exponential Backoff**: Increasing delays between retries

## Best Practices

### 1. Respond Quickly

- Respond with HTTP 200 as soon as possible
- Process events asynchronously if needed
- Don't perform long-running operations in webhook handler

```javascript
app.post('/webhook', (req, res) => {
  // Respond immediately
  res.status(200).send('OK');

  // Process asynchronously
  setImmediate(() => {
    processWebhookEvent(req.body);
  });
});
```

### 2. Implement Idempotency

- Use unique identifiers to prevent duplicate processing
- Store processed event IDs
- Handle retries gracefully

```javascript
const processedEvents = new Map();

function isEventProcessed(eventId) {
  return processedEvents.has(eventId);
}

function markEventProcessed(eventId) {
  processedEvents.set(eventId, Date.now());

  // Clean up old entries periodically
  if (processedEvents.size > 10000) {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
    for (const [id, timestamp] of processedEvents) {
      if (timestamp < cutoff) {
        processedEvents.delete(id);
      }
    }
  }
}
```

### 3. Handle Failures Gracefully

- Log errors with sufficient detail
- Implement retry logic for transient failures
- Alert on persistent failures

```javascript
async function handleWebhookEvent(event) {
  try {
    await processEvent(event);
  } catch (error) {
    if (isTransientError(error)) {
      // Log and let webhook retry
      console.warn('Transient error, will retry:', error);
      throw error;
    } else {
      // Log permanent error but don't retry
      console.error('Permanent error:', error);
      await logPermanentError(event, error);
      // Don't throw - respond with 200 to stop retries
    }
  }
}
```

### 4. Validate Event Data

- Verify required fields are present
- Validate data types and formats
- Handle missing or invalid data gracefully

```javascript
function validateSubscriptionEvent(data) {
  const { subscription } = data;

  if (!subscription || !subscription.id) {
    throw new Error('Invalid subscription data: missing ID');
  }

  if (!['pending', 'active', 'cancelled', 'expired'].includes(subscription.status)) {
    throw new Error(`Invalid subscription status: ${subscription.status}`);
  }

  return true;
}
```

### 5. Monitor Webhook Health

- Track webhook success/failure rates
- Monitor processing times
- Set up alerts for webhook issues

```javascript
const webhookMetrics = {
  received: 0,
  processed: 0,
  failed: 0,
  avgProcessingTime: 0
};

function updateMetrics(processingTime, success) {
  webhookMetrics.received++;

  if (success) {
    webhookMetrics.processed++;
  } else {
    webhookMetrics.failed++;
  }

  // Update average processing time
  webhookMetrics.avgProcessingTime =
    (webhookMetrics.avgProcessingTime + processingTime) / 2;
}
```

### 6. Security Best Practices

- Always verify webhook signatures
- Use HTTPS endpoints only
- Implement rate limiting
- Log security events

```javascript
const rateLimit = require('express-rate-limit');

const webhookLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many webhook requests from this IP'
});

app.use('/webhooks', webhookLimiter);
```

## Support

For webhook integration support:

- **Documentation**: [https://docs.your-domain.com/webhooks](https://docs.your-domain.com/webhooks)
- **Support Email**: webhooks@your-domain.com
- **Developer Forum**: [https://forum.your-domain.com](https://forum.your-domain.com)
- **Status Page**: [https://status.your-domain.com](https://status.your-domain.com)

## Changelog

### v1.2.0 (2024-02-01)
- Added trial events
- Improved error handling
- Enhanced security features

### v1.1.0 (2024-01-15)
- Added payment refund events
- Improved retry mechanism
- Added webhook delivery logs

### v1.0.0 (2024-01-01)
- Initial webhook system
- Basic subscription and payment events
- Signature verification