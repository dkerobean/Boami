import { NextRequest, NextResponse } from 'next/server';
import { Transaction } from '../../../../../lib/database/models';
import { connectDB } from '../../../../../lib/database/mongoose-connection';
import { formatCurrency } from '../../../../../lib/utils/payment-utils';
import { Types } from 'mongoose';

/**
 * GET /api/subscriptions/billing/history
 * Get user's billing history
 */
// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // TODO: Replace with proper authentication
    const userId = request.nextUrl.searchParams.get('userId');
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '10');
    const status = request.nextUrl.searchParams.get('status');
    const type = request.nextUrl.searchParams.get('type');

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'User ID is required'
        },
        { status: 401 }
      );
    }

    // Handle development mock user ID vs real ObjectId
    if (userId === 'dev-user-123' || !Types.ObjectId.isValid(userId)) {
      // For development or invalid ObjectIds, return empty history
      return NextResponse.json({
        success: true,
        data: {
          transactions: [],
          pagination: {
            currentPage: 1,
            totalPages: 0,
            totalCount: 0,
            hasNextPage: false,
            hasPreviousPage: false
          },
          summary: {
            totalTransactions: 0,
            successfulTransactions: 0,
            failedTransactions: 0,
            totalSpent: 0,
            formattedTotalSpent: formatCurrency(0, 'NGN'),
            averageTransaction: 0,
            formattedAverageTransaction: formatCurrency(0, 'NGN')
          }
        }
      });
    }

    // Build query filters
    const filters: any = { userId: new Types.ObjectId(userId) };
    if (status) filters.status = status;
    if (type) filters.type = type;

    // Get total count for pagination
    const totalCount = await Transaction.countDocuments(filters);
    const totalPages = Math.ceil(totalCount / limit);
    const skip = (page - 1) * limit;

    // Get transactions
    const transactions = await Transaction.find(filters)
      .populate('subscriptionId')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    // Transform transactions for client consumption
    const transformedTransactions = transactions.map(transaction => ({
      id: transaction._id,
      flutterwaveTransactionId: transaction.flutterwaveTransactionId,
      flutterwaveReference: transaction.flutterwaveReference,
      amount: transaction.amount,
      currency: transaction.currency,
      formattedAmount: formatCurrency(transaction.amount, transaction.currency),
      status: transaction.status,
      type: transaction.type,
      description: transaction.description,
      paymentMethod: transaction.paymentMethod,
      processedAt: transaction.processedAt,
      createdAt: transaction.createdAt,
      subscription: transaction.subscriptionId ? {
        id: (transaction.subscriptionId as any)._id,
        status: (transaction.subscriptionId as any).status
      } : null,
      metadata: transaction.metadata
    }));

    // Calculate summary statistics
    const successfulTransactions = transactions.filter(t => t.status === 'successful');
    const totalSpent = successfulTransactions.reduce((sum, t) => sum + t.amount, 0);
    const averageTransaction = successfulTransactions.length > 0
      ? totalSpent / successfulTransactions.length
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        transactions: transformedTransactions,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        },
        summary: {
          totalTransactions: transactions.length,
          successfulTransactions: successfulTransactions.length,
          failedTransactions: transactions.filter(t => t.status === 'failed').length,
          totalSpent,
          formattedTotalSpent: formatCurrency(totalSpent, transactions[0]?.currency || 'NGN'),
          averageTransaction: Math.round(averageTransaction),
          formattedAverageTransaction: formatCurrency(averageTransaction, transactions[0]?.currency || 'NGN')
        }
      }
    });

  } catch (error: any) {
    console.error('Get billing history error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch billing history'
      },
      { status: 500 }
    );
  }
}