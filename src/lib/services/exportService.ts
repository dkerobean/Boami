import * as XLSX from 'xlsx';
import { connectToDatabase } from '@/lib/database/mongoose-connection';
import Product from '@/lib/database/models/Product';
import ProductVariant from '@/lib/database/models/ProductVariant';
import Sale from '@/lib/database/models/Sale';
import Expense from '@/lib/database/models/Expense';
import Income from '@/lib/database/models/Income';
import InventoryLog from '@/lib/database/models/InventoryLog';
import fs from 'fs/promises';
import path from 'path';

/**
 * Strip HTML tags from text and decode HTML entities
 */
function stripHtmlTags(html: string): string {
  if (!html || typeof html !== 'string') return '';
  
  // Remove HTML tags
  const stripped = html.replace(/<[^>]*>/g, '');
  
  // Decode common HTML entities
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&nbsp;': ' ',
  };
  
  let decoded = stripped;
  for (const [entity, replacement] of Object.entries(entities)) {
    decoded = decoded.replace(new RegExp(entity, 'g'), replacement);
  }
  
  // Remove extra whitespace and trim
  return decoded.replace(/\s+/g, ' ').trim();
}

export interface ExportFilters {
  dateRange?: {
    start?: string;
    end?: string;
  };
  category?: string;
  status?: string;
  search?: string;
}

export interface ExportJob {
  id: string;
  type: 'products' | 'sales' | 'expenses' | 'financial-summary';
  format: 'csv' | 'excel' | 'json';
  fileName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalRecords: number;
  processedRecords: number;
  fileSize: number;
  downloadUrl: string | null;
  filePath?: string;
  filters?: ExportFilters;
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

// In-memory job storage (in production, use Redis or database)
const exportJobs: Map<string, ExportJob> = new Map();

export class ExportService {
  private static instance: ExportService;
  private uploadsDir: string;

  constructor() {
    this.uploadsDir = path.join(process.cwd(), 'public', 'exports');
    this.ensureUploadsDir();
  }

  static getInstance(): ExportService {
    if (!ExportService.instance) {
      ExportService.instance = new ExportService();
    }
    return ExportService.instance;
  }

  private async ensureUploadsDir() {
    try {
      await fs.mkdir(this.uploadsDir, { recursive: true });
    } catch (error) {
      console.error('Error creating uploads directory:', error);
    }
  }

  private generateJobId(): string {
    return `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async getProductData(filters: ExportFilters = {}) {
    await connectToDatabase();
    
    const query: any = {};
    
    // Apply filters
    if (filters.category) {
      query.category = { $in: [filters.category] };
    }
    
    if (filters.status) {
      query.status = filters.status;
    }
    
    if (filters.search) {
      query.$or = [
        { title: { $regex: filters.search, $options: 'i' } },
        { sku: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } }
      ];
    }
    
    if (filters.dateRange?.start || filters.dateRange?.end) {
      query.createdAt = {};
      if (filters.dateRange.start) {
        query.createdAt.$gte = new Date(filters.dateRange.start);
      }
      if (filters.dateRange.end) {
        query.createdAt.$lte = new Date(filters.dateRange.end);
      }
    }

    const products = await Product.find(query).lean();
    
    return products.map(product => ({
      id: product._id.toString(),
      title: stripHtmlTags(product.title || ''),
      description: stripHtmlTags(product.description || ''),
      sku: product.sku || '',
      price: product.price,
      regularPrice: product.regularPrice || product.price,
      salePrice: product.salePrice || '',
      discount: product.discount || 0,
      category: Array.isArray(product.category) ? product.category.join(', ') : product.category,
      subcategory: Array.isArray(product.subcategory) ? product.subcategory.join(', ') : product.subcategory || '',
      brand: stripHtmlTags(product.brand || ''),
      type: product.type,
      status: product.status,
      stock: product.stock ? 'Yes' : 'No',
      quantity: product.qty || 0,
      stockStatus: product.stockStatus,
      manageStock: product.manageStock ? 'Yes' : 'No',
      lowStockThreshold: product.lowStockThreshold || '',
      photo: product.photo || '',
      colors: Array.isArray(product.colors) ? product.colors.join(', ') : product.colors || '',
      tags: Array.isArray(product.tags) ? product.tags.join(', ') : product.tags || '',
      createdAt: product.createdAt ? new Date(product.createdAt).toISOString() : '',
      updatedAt: product.updatedAt ? new Date(product.updatedAt).toISOString() : '',
    }));
  }

  private async getSalesData(filters: ExportFilters = {}) {
    await connectToDatabase();
    
    const query: any = {};
    
    if (filters.dateRange?.start || filters.dateRange?.end) {
      query.date = {};
      if (filters.dateRange.start) {
        query.date.$gte = new Date(filters.dateRange.start);
      }
      if (filters.dateRange.end) {
        query.date.$lte = new Date(filters.dateRange.end);
      }
    }

    const sales = await Sale.find(query)
      .populate('productId', 'title sku category')
      .populate('userId', 'firstName lastName email')
      .lean();
    
    return sales.map(sale => ({
      id: sale._id.toString(),
      productTitle: stripHtmlTags(sale.productId?.title || 'Unknown Product'),
      productSku: sale.productId?.sku || '',
      productCategory: Array.isArray(sale.productId?.category) 
        ? sale.productId.category.join(', ') 
        : sale.productId?.category || '',
      quantity: sale.quantity,
      unitPrice: sale.unitPrice,
      totalAmount: sale.totalAmount,
      date: new Date(sale.date).toISOString(),
      notes: stripHtmlTags(sale.notes || ''),
      salesPerson: sale.userId 
        ? `${sale.userId.firstName} ${sale.userId.lastName}` 
        : 'Unknown',
      salesPersonEmail: sale.userId?.email || '',
      createdAt: new Date(sale.createdAt).toISOString(),
    }));
  }

  private async getExpensesData(filters: ExportFilters = {}) {
    await connectToDatabase();
    
    const query: any = {};
    
    if (filters.category) {
      query.category = filters.category;
    }
    
    if (filters.dateRange?.start || filters.dateRange?.end) {
      query.date = {};
      if (filters.dateRange.start) {
        query.date.$gte = new Date(filters.dateRange.start);
      }
      if (filters.dateRange.end) {
        query.date.$lte = new Date(filters.dateRange.end);
      }
    }

    const expenses = await Expense.find(query)
      .populate('userId', 'firstName lastName email')
      .lean();
    
    return expenses.map(expense => ({
      id: expense._id.toString(),
      title: stripHtmlTags(expense.title || ''),
      amount: expense.amount,
      category: stripHtmlTags(expense.category || ''),
      date: new Date(expense.date).toISOString(),
      description: stripHtmlTags(expense.description || ''),
      isRecurring: expense.isRecurring ? 'Yes' : 'No',
      recurringFrequency: expense.recurringFrequency || '',
      nextDueDate: expense.nextDueDate ? new Date(expense.nextDueDate).toISOString() : '',
      attachments: Array.isArray(expense.attachments) ? expense.attachments.join(', ') : '',
      createdBy: expense.userId 
        ? `${expense.userId.firstName} ${expense.userId.lastName}` 
        : 'Unknown',
      createdAt: new Date(expense.createdAt).toISOString(),
    }));
  }

  private async getFinancialSummaryData(filters: ExportFilters = {}) {
    await connectToDatabase();
    
    const dateQuery: any = {};
    if (filters.dateRange?.start || filters.dateRange?.end) {
      if (filters.dateRange.start) {
        dateQuery.$gte = new Date(filters.dateRange.start);
      }
      if (filters.dateRange.end) {
        dateQuery.$lte = new Date(filters.dateRange.end);
      }
    }

    // Get sales data
    const salesQuery = dateQuery ? { date: dateQuery } : {};
    const totalSales = await Sale.aggregate([
      { $match: salesQuery },
      { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
    ]);

    // Get expenses data
    const expensesQuery = dateQuery ? { date: dateQuery } : {};
    const totalExpenses = await Expense.aggregate([
      { $match: expensesQuery },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);

    // Get income data
    const incomeQuery = dateQuery ? { date: dateQuery } : {};
    const totalIncome = await Income.aggregate([
      { $match: incomeQuery },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);

    const sales = totalSales[0] || { total: 0, count: 0 };
    const expenses = totalExpenses[0] || { total: 0, count: 0 };
    const income = totalIncome[0] || { total: 0, count: 0 };

    return [
      {
        category: 'Sales Revenue',
        amount: sales.total,
        count: sales.count,
        type: 'Income',
        period: filters.dateRange ? `${filters.dateRange.start || 'Beginning'} to ${filters.dateRange.end || 'Now'}` : 'All Time',
      },
      {
        category: 'Other Income',
        amount: income.total,
        count: income.count,
        type: 'Income',
        period: filters.dateRange ? `${filters.dateRange.start || 'Beginning'} to ${filters.dateRange.end || 'Now'}` : 'All Time',
      },
      {
        category: 'Total Expenses',
        amount: expenses.total,
        count: expenses.count,
        type: 'Expense',
        period: filters.dateRange ? `${filters.dateRange.start || 'Beginning'} to ${filters.dateRange.end || 'Now'}` : 'All Time',
      },
      {
        category: 'Net Profit',
        amount: (sales.total + income.total) - expenses.total,
        count: sales.count + income.count + expenses.count,
        type: 'Summary',
        period: filters.dateRange ? `${filters.dateRange.start || 'Beginning'} to ${filters.dateRange.end || 'Now'}` : 'All Time',
      }
    ];
  }

  private async generateCSV(data: any[]): Promise<string> {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    
    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        // Escape quotes and wrap in quotes if necessary
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
  }

  private async generateExcel(data: any[]): Promise<Buffer> {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Export Data');
    
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  async createExportJob(
    type: ExportJob['type'],
    format: ExportJob['format'],
    filters: ExportFilters = {}
  ): Promise<ExportJob> {
    const jobId = this.generateJobId();
    const timestamp = new Date().toISOString().split('T')[0];
    const fileExtension = format === 'excel' ? 'xlsx' : format;
    const fileName = `${type.replace('-', '_')}_export_${timestamp}.${fileExtension}`;

    const job: ExportJob = {
      id: jobId,
      type,
      format,
      fileName,
      status: 'pending',
      totalRecords: 0,
      processedRecords: 0,
      fileSize: 0,
      downloadUrl: null,
      filters,
      createdAt: new Date(),
    };

    exportJobs.set(jobId, job);

    // Start processing asynchronously with proper error handling
    this.processExportJob(jobId).catch(error => {
      console.error(`Error processing export job ${jobId}:`, error);
      const failedJob = exportJobs.get(jobId);
      if (failedJob) {
        failedJob.status = 'failed';
        failedJob.error = error instanceof Error ? error.message : 'Unknown error occurred';
        failedJob.completedAt = new Date();
        exportJobs.set(jobId, failedJob);
      }
    });

    return job;
  }

  private async processExportJob(jobId: string): Promise<void> {
    const job = exportJobs.get(jobId);
    if (!job) {
      throw new Error(`Export job ${jobId} not found`);
    }

    try {
      job.status = 'processing';
      exportJobs.set(jobId, job);

      let data: any[] = [];
      
      // Validate job type and get data
      switch (job.type) {
        case 'products':
          data = await this.getProductData(job.filters);
          break;
        case 'sales':
          data = await this.getSalesData(job.filters);
          break;
        case 'expenses':
          data = await this.getExpensesData(job.filters);
          break;
        case 'financial-summary':
          data = await this.getFinancialSummaryData(job.filters);
          break;
        default:
          throw new Error(`Unknown export type: ${job.type}`);
      }

      if (!Array.isArray(data)) {
        throw new Error(`Invalid data returned for export type: ${job.type}`);
      }

      job.totalRecords = data.length;
      job.processedRecords = data.length;
      exportJobs.set(jobId, job);

      if (data.length === 0) {
        throw new Error('No data found matching the specified filters');
      }

      let fileContent: string | Buffer;
      let contentType: string;

      // Generate file content based on format
      switch (job.format) {
        case 'csv':
          fileContent = await this.generateCSV(data);
          contentType = 'text/csv';
          break;
        case 'excel':
          fileContent = await this.generateExcel(data);
          contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          break;
        case 'json':
          fileContent = JSON.stringify(data, null, 2);
          contentType = 'application/json';
          break;
        default:
          throw new Error(`Unsupported export format: ${job.format}`);
      }

      if (!fileContent || (typeof fileContent === 'string' && fileContent.length === 0)) {
        throw new Error('Failed to generate file content');
      }

      // Ensure uploads directory exists
      await this.ensureUploadsDir();

      // Save file to disk
      const filePath = path.join(this.uploadsDir, job.fileName);
      await fs.writeFile(filePath, fileContent);

      // Verify file was written
      const stats = await fs.stat(filePath);
      if (!stats.isFile() || stats.size === 0) {
        throw new Error('Failed to write export file');
      }

      job.fileSize = stats.size;
      job.filePath = filePath;
      job.downloadUrl = `/exports/${job.fileName}`;
      job.status = 'completed';
      job.completedAt = new Date();

      exportJobs.set(jobId, job);

      console.log(`Export job ${jobId} completed successfully. File: ${job.fileName}, Size: ${job.fileSize} bytes`);
      
    } catch (error) {
      console.error(`Export job ${jobId} failed:`, error);
      
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error occurred during export';
      job.completedAt = new Date();
      exportJobs.set(jobId, job);
      
      throw error;
    }
  }

  getExportJob(jobId: string): ExportJob | undefined {
    return exportJobs.get(jobId);
  }

  getAllExportJobs(): ExportJob[] {
    return Array.from(exportJobs.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async deleteExportJob(jobId: string): Promise<boolean> {
    const job = exportJobs.get(jobId);
    if (!job) return false;

    // Delete file if it exists
    if (job.filePath) {
      try {
        await fs.unlink(job.filePath);
      } catch (error) {
        console.error('Error deleting export file:', error);
      }
    }

    exportJobs.delete(jobId);
    return true;
  }

  async getFileStream(jobId: string): Promise<{ stream: Buffer, contentType: string, fileName: string } | null> {
    const job = exportJobs.get(jobId);
    if (!job || !job.filePath || job.status !== 'completed') {
      return null;
    }

    try {
      const fileBuffer = await fs.readFile(job.filePath);
      const contentType = job.format === 'excel' 
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : job.format === 'csv'
        ? 'text/csv'
        : 'application/json';

      return {
        stream: fileBuffer,
        contentType,
        fileName: job.fileName
      };
    } catch (error) {
      console.error('Error reading export file:', error);
      return null;
    }
  }
}

export const exportService = ExportService.getInstance();