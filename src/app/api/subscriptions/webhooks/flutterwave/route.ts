import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '../../../../../lib/services/PaymentService';
import { flutterwaveConfig } from '../../../../../lib/config/flutterwave';
import { webhookMonitor } from '../../../../../lib/utils/webhook-monitor';
import { webhookRetryQueue, webhookHealthChecker } from '../../../../../lib/utils/webhook-retry';

/**
 * Webhook handler for Flutterwave payment notifications
 * Implements secure webhook processing with signature verification and idempotency
 */

// Rate limiting for webhook endpoints
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per IP
  message: 'Too many webhook requests',
  standardHeaders: true,
  legacyHeaders: false,
});

// In-memory store for processed webhook IDs (in production, use Redis)
const processedWebhooks = new Set<string>();
const WEBHOOK_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Clean up old webhook IDs from cache
 */
function cleanupWebhookCache() {
  // In production, implement proper cleanup with Redis TTL
  if (processedWebhooks.size > 10000) {
    processedWebhooks.clear();
  }
}

/**
 * Validate webhook request
 */
function validateWebhookRequest(request: NextRequest): { isValid: boolean; error?: string } {
  // Check Content-Type
  const contentType = request.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    return { isValid: false, error: 'Invalid content type' };
  }

  // Check for required headers
  const signature = request.headers.get('flutterwave-signature');
  if (!signature) {
    return { isValid: false, error: 'Missing webhook signature' };
  }

  return { isValid: true };
}

/**
 * Extract webhook ID for idempotency
 */
function extractWebhookId(payload: any): string {
  // Use combination of event ID and timestamp for uniqueness
  return `${payload.data?.id || 'unknown'}_${payload.data?.created_at || Date.now()}`;
}

/**
 * Log webhook event for monitoring
 */
function logWebhookEvent(event: string, status: 'success' | 'error' | 'duplicate', details?: any) {
  const logData = {
    timestamp: new Date().toISOString(),
    event,
    status,
    details: details ? JSON.stringify(details) : undefined
  };

  if (status === 'error') {
    console.error('Webhook processing error:', logData);
  } else {
    console.log('Webhook processed:', logData);
  }

  // In production, send to monitoring service (e.g., DataDog, New Relic)
}

/**
 * Handle POST requests to webhook endpoint
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let webhookId: string | undefined;
  let eventType: string | undefined;

  try {
    // Validate request format
    const validation = validateWebhookRequest(request);
    if (!validation.isValid) {
      logWebhookEvent('validation_failed', 'error', { error: validation.error });
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Get request body and signature
    const body = await request.text();
    const signature = request.headers.get('flutterwave-signature')!;

    // Parse webhook payload
    let webhookPayload;
    try {
      webhookPayload = JSON.parse(body);
      eventType = webhookPayload.event;
      webhookId = extractWebhookId(webhookPayload);
    } catch (error) {
      logWebhookEvent('parse_failed', 'error', { error: 'Invalid JSON payload' });
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    // Check for duplicate webhook (idempotency)
    if (webhookId && processedWebhooks.has(webhookId)) {
      logWebhookEvent(eventType || 'unknown', 'duplicate', { webhookId });
      return NextResponse.json(
        { message: 'Webhook already processed' },
        { status: 200 }
      );
    }

    // Verify webhook signature
    const paymentService = new PaymentService();

    try {
      const result = await paymentService.processWebhook(body, signature);

      // Mark webhook as processed
      if (webhookId) {
        processedWebhooks.add(webhookId);

        // Clean up cache periodically
        if (Math.random() < 0.01) { // 1% chance
          cleanupWebhookCache();
        }
      }

      // Log successful processing
      const processingTime = Date.now() - startTime;
      logWebhookEvent(eventType || 'unknown', 'success', {
        webhookId,
        processingTime,
        result: result.success ? 'processed' : 'failed'
      });

      return NextResponse.json(
        {
          message: result.message || 'Webhook processed successfully',
          success: result.success
        },
        { status: 200 }
      );

    } catch (processingError: any) {
      // Log processing error but don't expose internal details
      logWebhookEvent(eventType || 'unknown', 'error', {
        webhookId,
        error: processingError.message,
        processingTime: Date.now() - startTime
      });

      // Return success to Flutterwave to avoid retries for our internal errors
      // Log the error for internal investigation
      console.error('Webhook processing internal error:', processingError);

      return NextResponse.json(
        { message: 'Webhook received' },
        { status: 200 }
      );
    }

  } catch (error: any) {
    // Log unexpected errors
    const processingTime = Date.now() - startTime;
    logWebhookEvent(eventType || 'unknown', 'error', {
      webhookId,
      error: error.message,
      processingTime,
      stack: error.stack
    });

    // Return 500 for unexpected errors to trigger Flutterwave retry
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Handle GET requests (for webhook URL verification)
 */
export async function GET(request: NextRequest) {
  // Some webhook services send GET requests to verify the endpoint
  return NextResponse.json(
    {
      message: 'Flutterwave webhook endpoint is active',
      timestamp: new Date().toISOString(),
      environment: flutterwaveConfig.environment
    },
    { status: 200 }
  );
}

/**
 * Handle other HTTP methods
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Allow': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, flutterwave-signature',
    },
  });
}

// Reject other methods
export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function PATCH() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}