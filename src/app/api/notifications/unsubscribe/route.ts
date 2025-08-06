import { NextRequest, NextResponse } from 'next/server';
import { preferenceManager } from '@/lib/notifications/preference-manager';
import { connectToDatabase } from '@/lib/database/connection';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const type = searchParams.get('type');

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const result = await preferenceManager.handleUnsubscribe(token, type || undefined);

    if (result.success) {
      // Return a simple HTML page for user-friendly unsubscribe confirmation
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Unsubscribed - Boami</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
            .success { color: #28a745; }
            .container { text-align: center; }
            .button { background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="success">✓ Successfully Unsubscribed</h1>
            <p>${result.message}</p>
            <p>You can update your notification preferences anytime in your account settings.</p>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings" class="button">Go to Settings</a>
          </div>
        </body>
        </html>
      `;

      return new NextResponse(html, {
        headers: { 'Content-Type': 'text/html' }
      });
    } else {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Unsubscribe Error - Boami</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
            .error { color: #dc3545; }
            .container { text-align: center; }
            .button { background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="error">❌ Unsubscribe Failed</h1>
            <p>${result.message}</p>
            <p>Please contact support if you continue to have issues.</p>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/contact" class="button">Contact Support</a>
          </div>
        </body>
        </html>
      `;

      return new NextResponse(html, {
        headers: { 'Content-Type': 'text/html' }
      });
    }
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return NextResponse.json(
      { error: 'Failed to process unsubscribe request' },
      { status: 500 }
    );
  }
}