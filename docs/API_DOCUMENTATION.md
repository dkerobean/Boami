# Subscription Payment System - API Documentation

This document provides comprehensive API documentation for the Subscription Payment System, including all endpoints, request/response formats, and integration examples.

## Table of Contents

1. [Authentication](#authentication)
2. [Subscription Plans](#subscription-plans)
3. [Subscriptions](#subscriptions)
4. [Payments](#payments)
5. [Webhooks](#webhooks)
6. [Admin APIs](#admin-apis)
7. [Error Handling](#error-handling)
8. [Rate Limiting](#rate-limiting)
9. [Examples](#examples)

## Authentication

All API requests require authentication using JWT tokens or session-based authentication.

### Headers

```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Authentication Endpoints

#### Login
```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "role": "user"
    },
    "token": "jwt_token_here"
  }
}
```

## Subscription Plans

### List Plans
```http
GET /api/subscriptions/plans
```

**Response:**
```json
{
  "success": true,
  "data": {
    "plans": [
      {
        "id": "plan_id",
        "name": "Basic",
        "description": "Perfect for individuals",
        "price": {
          "monthly": 9.99,
          "annual": 99.99,
          "currency": "USD"
        },
        "features": [
          "Up to 5 projects",
          "Basic analytics",
          "Email support"
        ],
        "limits": {
          "projects": 5,
          "storage": 1024,
          "apiCalls": 1000
        },
        "active": true,
        "trialDays": 14
      }
    ]
  }
}
```

### Get Plan Details
```http
GET /api/subscriptions/plans/{planId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "plan": {
      "id": "plan_id",
      "name": "Professional",
      "description": "Best for growing businesses",
      "price": {
        "monthly": 29.99,
        "annual": 299.99,
        "currency": "USD"
      },
      "features": [
        "Up to 25 projects",
        "Advanced analytics",
        "Priority support"
      ],
      "limits": {
        "projects": 25,
        "storage": 10240,
        "apiCalls": 10000
      },
      "active": true,
      "trialDays": 14
    }
  }
}
```

## Subscriptions

### Create Subscription
```http
POST /api/subscriptions
```

**Request Body:**
```json
{
  "planId": "plan_id",
  "billingPeriod": "monthly",
  "paymentMethod": "flutterwave",
  "customerInfo": {
    "email": "customer@example.com",
    "name": "John Doe",
    "phone": "+1234567890"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "subscription": {
      "id": "sub_id",
      "userId": "user_id",
      "planId": "plan_id",
      "status": "pending",
      "billingPeriod": "monthly",
      "currentPeriodStart": "2024-01-01T00:00:00Z",
      "currentPeriodEnd": "2024-02-01T00:00:00Z",
      "trialEnd": "2024-01-15T00:00:00Z"
    },
    "paymentLink": "https://checkout.flutterwave.com/v3/hosted/pay/xxx"
  }
}
```

### Get User Subscription
```http
GET /api/subscriptions/current
```

**Response:**
```json
{
  "success": true,
  "data": {
    "subscription": {
      "id": "sub_id",
      "status": "active",
      "plan": {
        "name": "Professional",
        "features": ["Feature 1", "Feature 2"]
      },
      "currentPeriodStart": "2024-01-01T00:00:00Z",
      "currentPeriodEnd": "2024-02-01T00:00:00Z",
      "cancelAtPeriodEnd": false
    }
  }
}
```

### Update Subscription
```http
PUT /api/subscriptions/{subscriptionId}
```

**Request Body:**
```json
{
  "planId": "new_plan_id",
  "billingPeriod": "annual"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "subscription": {
      "id": "sub_id",
      "planId": "new_plan_id",
      "status": "active",
      "billingPeriod": "annual",
      "prorationAmount": 150.00,
      "nextBillingDate": "2024-12-01T00:00:00Z"
    }
  }
}
```

### Cancel Subscription
```http
DELETE /api/subscriptions/{subscriptionId}
```

**Request Body:**
```json
{
  "cancelAtPeriodEnd": true,
  "cancelReason": "user_requested"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "subscription": {
      "id": "sub_id",
      "status": "active",
      "cancelAtPeriodEnd": true,
      "cancelledAt": "2024-01-15T00:00:00Z",
      "cancelReason": "user_requested"
    }
  }
}
```

### Reactivate Subscription
```http
POST /api/subscriptions/{subscriptionId}/reactivate
```

**Response:**
```json
{
  "success": true,
  "data": {
    "subscription": {
      "id": "sub_id",
      "status": "active",
      "cancelAtPeriodEnd": false,
      "reactivatedAt": "2024-01-16T00:00:00Z"
    }
  }
}
```

## Payments

### Get Billing History
```http
GET /api/subscriptions/billing-history
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `status` (optional): Filter by payment status

**Response:**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "txn_id",
        "amount": 29.99,
        "currency": "USD",
        "status": "completed",
        "description": "Professional Plan - Monthly",
        "createdAt": "2024-01-01T00:00:00Z",
        "flutterwaveReference": "FLW-MOCK-xxx"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "pages": 3
    }
  }
}
```

### Get Invoice
```http
GET /api/subscriptions/invoices/{invoiceId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "invoice": {
      "id": "inv_id",
      "number": "INV-2024-001",
      "amount": 29.99,
      "currency": "USD",
      "status": "paid",
      "dueDate": "2024-01-01T00:00:00Z",
      "paidAt": "2024-01-01T10:30:00Z",
      "items": [
        {
          "description": "Professional Plan - Monthly",
          "amount": 29.99,
          "quantity": 1
        }
      ]
    }
  }
}
```

## Webhooks

### Flutterwave Webhook
```http
POST /api/webhooks/flutterwave
```

**Headers:**
```http
verif-hash: webhook_secret_hash
Content-Type: application/json
```

**Request Body:**
```json
{
  "event": "charge.completed",
  "data": {
    "id": 12345,
    "tx_ref": "subscription_payment_ref",
    "flw_ref": "FLW-MOCK-xxx",
    "amount": 29.99,
    "currency": "USD",
    "status": "successful",
    "customer": {
      "email": "customer@example.com",
      "name": "John Doe"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Webhook processed successfully"
}
```

### Supported Webhook Events

- `charge.completed` - Payment completed successfully
- `charge.failed` - Payment failed
- `subscription.cancelled` - Subscription cancelled
- `subscription.reactivated` - Subscription reactivated

## Admin APIs

### List All Subscriptions
```http
GET /api/admin/subscriptions
```

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `status` (optional): Filter by status
- `planId` (optional): Filter by plan
- `search` (optional): Search by user email/name

**Response:**
```json
{
  "success": true,
  "data": {
    "subscriptions": [
      {
        "id": "sub_id",
        "user": {
          "email": "user@example.com",
          "name": "John Doe"
        },
        "plan": {
          "name": "Professional"
        },
        "status": "active",
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "pages": 10
    }
  }
}
```

### Get Subscription Analytics
```http
GET /api/admin/analytics/subscription-metrics
```

**Query Parameters:**
- `dateRange` (optional): Number of days (default: 30)
- `includeChurn` (optional): Include churn analysis
- `includeTrends` (optional): Include trend data

**Response:**
```json
{
  "success": true,
  "data": {
    "metrics": {
      "activeSubscriptions": 150,
      "monthlyRecurringRevenue": 4500.00,
      "churnRate": 5.2,
      "conversionRate": 12.5,
      "averageRevenuePerUser": 30.00
    },
    "trends": [
      {
        "date": "2024-01-01",
        "newSubscriptions": 5,
        "cancelledSubscriptions": 1,
        "revenue": 150.00
      }
    ]
  }
}
```

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "validation error details"
  }
}
```

### Common Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `AUTHENTICATION_REQUIRED` | Authentication token missing or invalid | 401 |
| `INSUFFICIENT_PERMISSIONS` | User lacks required permissions | 403 |
| `RESOURCE_NOT_FOUND` | Requested resource not found | 404 |
| `VALIDATION_ERROR` | Request validation failed | 400 |
| `SUBSCRIPTION_NOT_FOUND` | Subscription not found | 404 |
| `PLAN_NOT_FOUND` | Subscription plan not found | 404 |
| `PAYMENT_FAILED` | Payment processing failed | 400 |
| `WEBHOOK_VERIFICATION_FAILED` | Webhook signature verification failed | 400 |
| `RATE_LIMIT_EXCEEDED` | Too many requests | 429 |
| `INTERNAL_SERVER_ERROR` | Server error | 500 |

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

- **General API**: 100 requests per 15 minutes per IP
- **Payment endpoints**: 10 requests per minute per user
- **Webhook endpoints**: 50 requests per minute per IP

Rate limit headers are included in responses:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Examples

### Complete Subscription Flow

1. **Get Available Plans**
```javascript
const response = await fetch('/api/subscriptions/plans');
const { data } = await response.json();
const plans = data.plans;
```

2. **Create Subscription**
```javascript
const subscription = await fetch('/api/subscriptions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    planId: 'plan_professional',
    billingPeriod: 'monthly',
    customerInfo: {
      email: 'customer@example.com',
      name: 'John Doe'
    }
  })
});
```

3. **Handle Payment Redirect**
```javascript
// Redirect user to payment link
window.location.href = subscription.data.paymentLink;
```

4. **Check Subscription Status**
```javascript
const current = await fetch('/api/subscriptions/current', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const subscription = await current.json();
```

### Webhook Integration

```javascript
// Express.js webhook handler
app.post('/api/webhooks/flutterwave', (req, res) => {
  const hash = req.headers['verif-hash'];
  const payload = req.body;

  // Verify webhook signature
  const expectedHash = crypto
    .createHmac('sha256', process.env.FLUTTERWAVE_WEBHOOK_SECRET)
    .update(JSON.stringify(payload))
    .digest('hex');

  if (hash !== expectedHash) {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  // Process webhook
  if (payload.event === 'charge.completed') {
    // Update subscription status
    updateSubscriptionStatus(payload.data.tx_ref, 'active');
  }

  res.json({ success: true });
});
```

### Feature Access Control

```javascript
// Check if user has access to a feature
const hasAccess = await fetch('/api/subscriptions/feature-access', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    feature: 'advanced_analytics'
  })
});

const { data } = await hasAccess.json();
if (data.hasAccess) {
  // Show feature
} else {
  // Show upgrade prompt
}
```

## SDK Integration

### JavaScript/TypeScript SDK

```typescript
import { SubscriptionClient } from '@your-org/subscription-sdk';

const client = new SubscriptionClient({
  apiUrl: 'https://your-domain.com/api',
  apiKey: 'your-api-key'
});

// Get plans
const plans = await client.plans.list();

// Create subscription
const subscription = await client.subscriptions.create({
  planId: 'plan_id',
  billingPeriod: 'monthly'
});

// Get current subscription
const current = await client.subscriptions.getCurrent();
```

### React Hooks

```typescript
import { useSubscription, useFeatureAccess } from '@your-org/subscription-hooks';

function MyComponent() {
  const { subscription, loading, error } = useSubscription();
  const hasAdvancedFeatures = useFeatureAccess('advanced_features');

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>Current Plan: {subscription?.plan?.name}</h1>
      {hasAdvancedFeatures && (
        <AdvancedFeaturesComponent />
      )}
    </div>
  );
}
```

## Testing

### Test Environment

Use the sandbox environment for testing:

- **API Base URL**: `https://your-domain.com/api`
- **Flutterwave**: Use test keys and sandbox mode
- **Webhooks**: Use ngrok or similar for local testing

### Test Cards

For testing payments with Flutterwave:

| Card Number | Description |
|-------------|-------------|
| 4187427415564246 | Successful payment |
| 4000000000000002 | Declined payment |
| 4000000000000119 | Processing error |

### Example Test

```javascript
describe('Subscription API', () => {
  test('should create subscription', async () => {
    const response = await request(app)
      .post('/api/subscriptions')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        planId: 'test_plan',
        billingPeriod: 'monthly'
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.subscription).toBeDefined();
  });
});
```

## Support

For API support and questions:

- **Documentation**: [https://your-domain.com/docs](https://your-domain.com/docs)
- **Support Email**: support@your-domain.com
- **Status Page**: [https://status.your-domain.com](https://status.your-domain.com)

## Changelog

### v1.0.0 (2024-01-01)
- Initial API release
- Basic subscription management
- Flutterwave integration
- Webhook support

### v1.1.0 (2024-02-01)
- Added analytics endpoints
- Improved error handling
- Enhanced webhook security