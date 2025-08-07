import { NextRequest, NextResponse } from 'next/server';
import { Transaction, User } from '../../../../../../lib/database/models';
import { connectDB } from '../../../../../../lib/database/mongoose-connection';
import { formatCurrency, formatSubscriptionPeriod } from '../../../../../../lib/utils/payment-utils';

/**
 * GET /api/subscriptions/billing/invoice/[id]
 * Get specific invoice/transaction details
 */
// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    // TODO: Replace with proper authentication and authorization
    const userId = request.nextUrl.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'User ID is required'
        },
        { status: 401 }
      );
    }

    // Get transaction
    const transaction = await Transaction.findById(params.id)
      .populate('userId')
      .populate('subscriptionId');

    if (!transaction) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invoice not found'
        },
        { status: 404 }
      );
    }

    // Verify user owns this transaction
    if (transaction.userId._id.toString() !== userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied'
        },
        { status: 403 }
      );
    }

    // Get user details
    const user = transaction.userId as any;
    const subscription = transaction.subscriptionId as any;

    // Build invoice data
    const invoice = {
      id: transaction._id,
      invoiceNumber: `INV-${transaction.flutterwaveReference}`,
      flutterwaveTransactionId: transaction.flutterwaveTransactionId,
      flutterwaveReference: transaction.flutterwaveReference,

      // Transaction details
      amount: transaction.amount,
      currency: transaction.currency,
      formattedAmount: formatCurrency(transaction.amount, transaction.currency),
      status: transaction.status,
      type: transaction.type,
      description: transaction.description,
      paymentMethod: transaction.paymentMethod,

      // Dates
      issuedDate: transaction.createdAt,
      paidDate: transaction.processedAt,
      dueDate: transaction.createdAt, // Same as issued for immediate payments

      // Customer details
      customer: {
        id: user._id,
        name: user.getFullName(),
        email: user.email,
        phone: user.phone,
        address: {
          // TODO: Add address fields to user model if needed
          line1: '',
          city: '',
          state: '',
          country: 'Nigeria' // Default
        }
      },

      // Subscription details
      subscription: subscription ? {
        id: subscription._id,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        billingPeriod: formatSubscriptionPeriod(
          subscription.currentPeriodStart,
          subscription.currentPeriodEnd
        )
      } : null,

      // Line items
      lineItems: [
        {
          description: transaction.description || `${transaction.type} payment`,
          quantity: 1,
          unitPrice: transaction.amount,
          totalPrice: transaction.amount,
          currency: transaction.currency,
          formattedUnitPrice: formatCurrency(transaction.amount, transaction.currency),
          formattedTotalPrice: formatCurrency(transaction.amount, transaction.currency)
        }
      ],

      // Totals
      subtotal: transaction.amount,
      tax: 0, // TODO: Implement tax calculation if needed
      total: transaction.amount,
      formattedSubtotal: formatCurrency(transaction.amount, transaction.currency),
      formattedTax: formatCurrency(0, transaction.currency),
      formattedTotal: formatCurrency(transaction.amount, transaction.currency),

      // Company details
      company: {
        name: process.env.COMPANY_NAME || 'BOAMI',
        address: {
          line1: process.env.COMPANY_ADDRESS_LINE1 || '',
          line2: process.env.COMPANY_ADDRESS_LINE2 || '',
          city: process.env.COMPANY_CITY || '',
          state: process.env.COMPANY_STATE || '',
          country: process.env.COMPANY_COUNTRY || 'Nigeria',
          postalCode: process.env.COMPANY_POSTAL_CODE || ''
        },
        email: process.env.COMPANY_EMAIL || 'billing@boami.com',
        phone: process.env.COMPANY_PHONE || '',
        website: process.env.NEXT_PUBLIC_BASE_URL || '',
        logo: process.env.COMPANY_LOGO_URL || ''
      },

      // Payment details
      paymentDetails: {
        method: transaction.paymentMethod || 'Online Payment',
        processor: 'Flutterwave',
        reference: transaction.flutterwaveReference,
        transactionId: transaction.flutterwaveTransactionId
      },

      // Notes
      notes: [
        'Thank you for your business!',
        'This is a computer-generated invoice.',
        'For support, please contact us at support@boami.com'
      ],

      // Metadata
      metadata: transaction.metadata
    };

    return NextResponse.json({
      success: true,
      data: invoice
    });

  } catch (error: any) {
    console.error('Get invoice error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch invoice'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/subscriptions/billing/invoice/[id]
 * Generate and download invoice PDF (future implementation)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // TODO: Implement PDF generation using libraries like puppeteer or jsPDF
    // For now, return a placeholder response

    return NextResponse.json({
      success: false,
      error: 'PDF generation not implemented yet',
      message: 'Use the GET endpoint to retrieve invoice data for now'
    }, { status: 501 });

  } catch (error: any) {
    console.error('Generate invoice PDF error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate invoice PDF'
      },
      { status: 500 }
    );
  }
}