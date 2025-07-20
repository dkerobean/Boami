import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

/**
 * GET /exports/[filename]
 * Serves exported files from the public/exports directory
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const { filename } = params;
    
    if (!filename) {
      return NextResponse.json({
        success: false,
        error: 'Filename is required',
      }, { status: 400 });
    }

    // Security: prevent directory traversal attacks
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json({
        success: false,
        error: 'Invalid filename',
      }, { status: 400 });
    }

    const filePath = path.join(process.cwd(), 'public', 'exports', filename);
    
    try {
      // Check if file exists and get stats
      const stats = await fs.stat(filePath);
      
      if (!stats.isFile()) {
        return NextResponse.json({
          success: false,
          error: 'File not found',
        }, { status: 404 });
      }

      // Read the file
      const fileBuffer = await fs.readFile(filePath);
      
      // Determine content type based on file extension
      let contentType = 'application/octet-stream';
      const extension = path.extname(filename).toLowerCase();
      
      switch (extension) {
        case '.csv':
          contentType = 'text/csv';
          break;
        case '.xlsx':
          contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          break;
        case '.json':
          contentType = 'application/json';
          break;
      }

      // Return the file with appropriate headers
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': fileBuffer.length.toString(),
          'Cache-Control': 'private, max-age=0',
          'Last-Modified': stats.mtime.toUTCString(),
        },
      });

    } catch (fileError) {
      return NextResponse.json({
        success: false,
        error: 'File not found',
      }, { status: 404 });
    }
    
  } catch (error) {
    console.error('Error serving export file:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to serve export file',
    }, { status: 500 });
  }
}