import { NextRequest, NextResponse } from 'next/server';
import { exportService } from '@/lib/services/exportService';


/**
 * GET /api/bulk-export/download/[id]
 * Downloads an exported file by job ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    console.log('Download request for job ID:', id);
    
    if (!id) {
      console.error('Download request missing job ID');
      return NextResponse.json({
        success: false,
        error: 'Export job ID is required',
      }, { status: 400 });
    }
    
    // Get the export job first to debug
    const job = exportService.getExportJob(id);
    console.log('Export job found:', {
      exists: !!job,
      status: job?.status,
      fileName: job?.fileName,
      filePath: job?.filePath,
      downloadUrl: job?.downloadUrl
    });
    
    // Get the export file from the service
    const fileData = await exportService.getFileStream(id);
    
    console.log('File data result:', {
      exists: !!fileData,
      fileName: fileData?.fileName,
      streamLength: fileData?.stream?.length
    });
    
    if (!fileData) {
      console.error('File data not found for job:', id);
      return NextResponse.json({
        success: false,
        error: 'Export file not found or has expired',
      }, { status: 404 });
    }
    
    // Return file content with appropriate headers
    const response = new NextResponse(fileData.stream, {
      status: 200,
      headers: {
        'Content-Type': fileData.contentType,
        'Content-Disposition': `attachment; filename="${fileData.fileName}"`,
        'Content-Length': fileData.stream.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
    
    return response;
    
  } catch (error) {
    console.error('Error downloading export file:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to download export file',
    }, { status: 500 });
  }
}

/**
 * HEAD /api/bulk-export/download/[id]
 * Gets file metadata without downloading
 */
export async function HEAD(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    if (!id) {
      return new NextResponse(null, { status: 400 });
    }
    
    const job = exportService.getExportJob(id);
    
    if (!job) {
      return new NextResponse(null, { status: 404 });
    }
    
    if (job.status !== 'completed') {
      return new NextResponse(null, { status: 404 });
    }
    
    const contentType = job.format === 'excel' 
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : job.format === 'csv'
      ? 'text/csv'
      : 'application/json';
    
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': job.fileSize.toString(),
        'Last-Modified': (job.completedAt || job.createdAt).toUTCString(),
      },
    });
    
  } catch (error) {
    console.error('Error getting export file metadata:', error);
    return new NextResponse(null, { status: 500 });
  }
}