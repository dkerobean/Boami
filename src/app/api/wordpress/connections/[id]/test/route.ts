import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/database/connection';
import WordPressConnection from '@/lib/database/models/WordPressConnection';
import { WordPressAPI } from '@/lib/utils/wordpress-api';

interface RouteParams {
  params: { id: string }
}

/**
 * POST /api/wordpress/connections/[id]/test - Test a WordPress connection
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await connectToDatabase();

    const { id } = params;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Connection ID is required'
      }, { status: 400 });
    }

    // Find the connection with credentials
    const connection = await WordPressConnection.findById(id)
      .select('+consumerKey +consumerSecret');

    if (!connection) {
      return NextResponse.json({
        success: false,
        error: 'WordPress connection not found'
      }, { status: 404 });
    }

    // Create WordPress API instance
    const wpApi = new WordPressAPI({
      siteUrl: connection.siteUrl,
      consumerKey: connection.consumerKey,
      consumerSecret: connection.consumerSecret,
      version: connection.version,
      isWooCommerce: connection.isWooCommerce
    }, {
      timeout: 15000, // 15 second timeout for testing
      retries: 1 // Only retry once for testing
    });

    let testResult;
    let additionalInfo: any = {};

    try {
      // Test the basic connection
      testResult = await wpApi.testConnection();

      // If connection is successful, gather additional information
      if (testResult.success) {
        try {
          // Get basic product count
          const productCount = await wpApi.getProductCount();
          additionalInfo.productCount = productCount;

          // Check WooCommerce status
          if (connection.isWooCommerce) {
            const wooStatus = await wpApi.checkWooCommerceStatus();
            additionalInfo.wooCommerceStatus = wooStatus;
          }

          // Get store info if available
          try {
            const storeInfo = await wpApi.getStoreInfo();
            additionalInfo.storeInfo = {
              version: storeInfo.version || 'Unknown',
              environment: storeInfo.environment?.environment || 'Unknown'
            };
          } catch (storeInfoError) {
            // Store info might not be available, that's okay
            additionalInfo.storeInfo = { available: false };
          }

          // Update test result with additional success message
          testResult.message = `Connection successful. Found ${productCount} products.`;

        } catch (infoError) {
          // Don't fail the test if we can't get additional info
          console.warn('Failed to gather additional connection info:', infoError);
          additionalInfo.warningMessage = 'Connection successful but could not gather additional information';
        }
      }

    } catch (testError) {
      console.error('WordPress connection test failed:', testError);
      
      testResult = {
        success: false,
        message: testError instanceof Error ? testError.message : 'Unknown connection error',
        responseTime: 0
      };
    }

    // Update the connection with test results
    await connection.updateTestResult({
      success: testResult.success,
      message: testResult.message,
      responseTime: testResult.responseTime
    });

    return NextResponse.json({
      success: true,
      message: 'Connection test completed',
      data: {
        testResult,
        additionalInfo,
        connection: {
          id: connection._id,
          name: connection.name,
          siteUrl: connection.siteUrl,
          version: connection.version,
          isWooCommerce: connection.isWooCommerce,
          lastTestDate: connection.lastTestDate
        }
      }
    });

  } catch (error) {
    console.error('WordPress connection test API error:', error);

    // Handle invalid ObjectId
    if (error && typeof error === 'object' && 'name' in error && error.name === 'CastError') {
      return NextResponse.json({
        success: false,
        error: 'Invalid connection ID'
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to test WordPress connection',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : error) : undefined
    }, { status: 500 });
  }
}