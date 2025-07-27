import { NextRequest, NextResponse } from 'next/server';
import { testRealNotifications } from '@/lib/notifications/test-real-notifications';
import { connectToDatabase } from '@/lib/database/mongoose-connection';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const result = await testRealNotifications();

    return NextResponse.json({
      success: true,
      message: 'Real notifications test completed',
      result
    });

  } catch (error) {
    console.error('Test real notifications API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to test real notifications',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}