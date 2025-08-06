import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database/connection';
import { User } from '@/lib/database/models';

/**
 * Test endpoint to check database connection
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Try to count users to test the connection
    const userCount = await User.countDocuments();

    return NextResponse.json({
      success: true,
      message: 'Database connection is working',
      userCount
    });
  } catch (error: any) {
    console.error('Database test error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      message: 'Database connection error'
    }, { status: 500 });
  }
}