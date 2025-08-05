import { NextRequest, NextResponse } from 'next/server';

/**
 * Test endpoint to check if models can be imported without errors
 */
export async function GET(request: NextRequest) {
  try {
    console.log('Testing model imports...');

    // Test database connection import
    const { connectDB } = await import('@/lib/database/mongoose-connection');
    console.log('✅ Database connection import successful');

    // Test User model import
    const { User } = await import('@/lib/database/models');
    console.log('✅ User model import successful');

    // Test bcrypt import
    const bcrypt = await import('bcryptjs');
    console.log('✅ bcrypt import successful');

    // Test database connection
    await connectDB();
    console.log('✅ Database connection successful');

    // Test User model usage
    const userCount = await User.countDocuments();
    console.log('✅ User model query successful, count:', userCount);

    return NextResponse.json({
      success: true,
      message: 'All model imports and database operations successful',
      userCount
    });
  } catch (error: any) {
    console.error('❌ Model test error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');

    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error instanceof Error ? error.stack : 'No stack trace',
      message: 'Model import or database operation failed'
    }, { status: 500 });
  }
}