import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import Income from '@/lib/database/models/Income';
import Expense from '@/lib/database/models/Expense';
import IncomeCategory from '@/lib/database/models/IncomeCategory';
import ExpenseCategory from '@/lib/database/models/ExpenseCategory';
import Vendor from '@/lib/database/models/Vendor';

export interface ParsedFinanceData {
  headers: string[];
  data: any[];
  totalRows: number;
  previewData: any[];
  detectedColumns: {
    date?: string;
    description?: string;
    amount?: string;
    category?: string;
    vendor?: string;
    recurring?: string;
  };
}

export interface ImportValidationResult {
  isValid: boolean;
  errors: Array<{
    row: number;
    field: string;
    message: string;
    value?: any;
  }>;
  warnings: Array<{
    row: number;
    field: string;
    message: string;
    value?: any;
  }>;
}

export interface ImportJobResult {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalRows: number;
  processedRows: number;
  successfulRows: number;
  failedRows: number;
  results: {
    created: number;
    updated: number;
    skipped: number;
    failed: number;
  };
  errors: Array<{
    row: number;
    field: string;
    message: string;
  }>;
  warnings: Array<{
    row: number;
    field: string;
    message: string;
  }>;
  createdAt: Date;
  completedAt?: Date;
  userId: string;
}

interface FieldMapping {
  [csvColumn: string]: string; // Maps CSV column to system field
}

interface ImportOptions {
  updateExisting?: boolean;
  createCategories?: boolean;
  createVendors?: boolean;
  skipInvalidRows?: boolean;
  dateFormat?: string;
}

// In-memory store for import jobs (in production, use Redis or database)
const importJobs = new Map<string, ImportJobResult>();

export class FinanceImportService {
  /**
   * Parse uploaded file (CSV or Excel) and detect columns
   */
  static async parseFile(file: File): Promise<ParsedFinanceData> {
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.csv')) {
      return this.parseCSVFile(file);
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      return this.parseExcelFile(file);
    } else {
      throw new Error('Unsupported file format. Please use CSV or Excel files.');
    }
  }

  /**
   * Parse CSV file using Papa Parse
   */
  private static parseCSVFile(file: File): Promise<ParsedFinanceData> {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
        transform: (value) => value.trim(),
        complete: (results) => {
          try {
            if (results.errors.length > 0) {
              const criticalErrors = results.errors.filter(error =>
                error.type === 'Delimiter' || error.type === 'Quotes'
              );

              if (criticalErrors.length > 0) {
                throw new Error(`CSV parsing error: ${criticalErrors[0].message}`);
              }
            }

            const data = results.data as any[];
            const headers = results.meta.fields || [];

            if (headers.length === 0) {
              throw new Error('No headers found in CSV file');
            }

            if (data.length === 0) {
              throw new Error('No data rows found in CSV file');
            }

            const detectedColumns = this.detectColumns(headers);
            const previewData = data.slice(0, 5);

            resolve({
              headers,
              data,
              totalRows: data.length,
              previewData,
              detectedColumns
            });
          } catch (error) {
            reject(error);
          }
        },
        error: (error) => {
          reject(new Error(`Failed to parse CSV: ${error.message}`));
        }
      });
    });
  }

  /**
   * Parse Excel file using XLSX
   */
  private static parseExcelFile(file: File): Promise<ParsedFinanceData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });

          const sheetName = workbook.SheetNames[0];
          if (!sheetName) {
            throw new Error('No worksheets found in Excel file');
          }

          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: '',
            blankrows: false
          }) as any[][];

          if (jsonData.length === 0) {
            throw new Error('No data found in Excel file');
          }

          const headers = jsonData[0].map((header: any) => String(header).trim()).filter(Boolean);

          if (headers.length === 0) {
            throw new Error('No headers found in Excel file');
          }

          const dataRows = jsonData.slice(1).map(row => {
            const obj: any = {};
            headers.forEach((header, index) => {
              obj[header] = row[index] ? String(row[index]).trim() : '';
            });
            return obj;
          }).filter(row => Object.values(row).some(val => val !== ''));

          if (dataRows.length === 0) {
            throw new Error('No data rows found in Excel file');
          }

          const detectedColumns = this.detectColumns(headers);
          const previewData = dataRows.slice(0, 5);

          resolve({
            headers,
            data: dataRows,
            totalRows: dataRows.length,
            previewData,
            detectedColumns
          });
        } catch (error) {
          reject(new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read Excel file'));
      };

      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Automatically detect columns based on header names
   */
  private static detectColumns(headers: string[]): ParsedFinanceData['detectedColumns'] {
    const detected: ParsedFinanceData['detectedColumns'] = {};

    const lowercaseHeaders = headers.map(h => h.toLowerCase());

    // Detect date column
    const datePatterns = ['date', 'transaction date', 'transaction_date', 'created_at', 'datetime'];
    detected.date = this.findMatchingHeader(headers, lowercaseHeaders, datePatterns);

    // Detect description column
    const descriptionPatterns = ['description', 'memo', 'details', 'note', 'transaction description'];
    detected.description = this.findMatchingHeader(headers, lowercaseHeaders, descriptionPatterns);

    // Detect amount column
    const amountPatterns = ['amount', 'value', 'price', 'total', 'sum', 'cost'];
    detected.amount = this.findMatchingHeader(headers, lowercaseHeaders, amountPatterns);

    // Detect category column
    const categoryPatterns = ['category', 'type', 'classification', 'category_name'];
    detected.category = this.findMatchingHeader(headers, lowercaseHeaders, categoryPatterns);

    // Detect vendor column (for expenses)
    const vendorPatterns = ['vendor', 'supplier', 'merchant', 'payee', 'company'];
    detected.vendor = this.findMatchingHeader(headers, lowercaseHeaders, vendorPatterns);

    // Detect recurring column
    const recurringPatterns = ['recurring', 'repeat', 'is_recurring', 'recurring_payment'];
    detected.recurring = this.findMatchingHeader(headers, lowercaseHeaders, recurringPatterns);

    return detected;
  }

  /**
   * Find matching header from patterns
   */
  private static findMatchingHeader(headers: string[], lowercaseHeaders: string[], patterns: string[]): string | undefined {
    for (const pattern of patterns) {
      const index = lowercaseHeaders.findIndex(header => header.includes(pattern));
      if (index !== -1) {
        return headers[index];
      }
    }
    return undefined;
  }

  /**
   * Validate imported data
   */
  static validateData(
    data: any[],
    mapping: FieldMapping,
    type: 'income' | 'expense'
  ): ImportValidationResult {
    const errors: ImportValidationResult['errors'] = [];
    const warnings: ImportValidationResult['warnings'] = [];

    // Required fields
    const requiredFields = ['amount', 'description'];
    if (type === 'income') {
      requiredFields.push('date'); // Income requires category through API validation
    }

    // Filter out completely empty rows before validation
    const filteredData = data.filter((row, index) => {
      // Check if all mapped fields are empty
      const mappedValues = Object.keys(mapping).map(csvColumn => {
        const value = row[csvColumn];
        return value && value.toString().trim() !== '';
      });
      
      // Keep row if at least one mapped field has a value
      return mappedValues.some(hasValue => hasValue);
    });

    filteredData.forEach((row, filteredIndex) => {
      // Find original row number by searching for this row in the original data
      const originalIndex = data.findIndex(originalRow => originalRow === row);
      const rowNumber = originalIndex + 2; // +2 because index starts at 0 and first row is header

      // Check required fields
      requiredFields.forEach(field => {
        const csvColumn = Object.keys(mapping).find(key => mapping[key] === field);
        if (!csvColumn || !row[csvColumn] || row[csvColumn].toString().trim() === '') {
          errors.push({
            row: rowNumber,
            field,
            message: `${field} is required`,
            value: row[csvColumn]
          });
        }
      });

      // Validate amount
      const amountColumn = Object.keys(mapping).find(key => mapping[key] === 'amount');
      if (amountColumn && row[amountColumn]) {
        const amount = this.parseAmount(row[amountColumn]);
        if (isNaN(amount) || amount <= 0) {
          errors.push({
            row: rowNumber,
            field: 'amount',
            message: 'Amount must be a positive number',
            value: row[amountColumn]
          });
        }
      }

      // Validate date
      const dateColumn = Object.keys(mapping).find(key => mapping[key] === 'date');
      if (dateColumn && row[dateColumn]) {
        const date = this.parseDate(row[dateColumn]);
        if (!date || isNaN(date.getTime())) {
          errors.push({
            row: rowNumber,
            field: 'date',
            message: 'Invalid date format',
            value: row[dateColumn]
          });
        } else if (date > new Date()) {
          warnings.push({
            row: rowNumber,
            field: 'date',
            message: 'Date is in the future',
            value: row[dateColumn]
          });
        }
      }

      // Check for missing category/vendor (warnings)
      if (type === 'expense') {
        const categoryColumn = Object.keys(mapping).find(key => mapping[key] === 'category');
        const vendorColumn = Object.keys(mapping).find(key => mapping[key] === 'vendor');

        if ((!categoryColumn || !row[categoryColumn]) && (!vendorColumn || !row[vendorColumn])) {
          warnings.push({
            row: rowNumber,
            field: 'category',
            message: 'Either category or vendor should be specified for expenses',
            value: ''
          });
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Parse amount from string
   */
  private static parseAmount(value: any): number {
    if (typeof value === 'number') return value;

    const str = value.toString().replace(/[$,\s]/g, '');
    return parseFloat(str);
  }

  /**
   * Parse date from string
   */
  private static parseDate(value: any): Date | null {
    if (value instanceof Date) return value;

    const str = value.toString().trim();
    if (!str) return null;

    // First try native Date parsing
    let date = new Date(str);
    if (!isNaN(date.getTime())) {
      return date;
    }

    // Try specific formats manually
    // DD/MM/YYYY format (European)
    const ddmmyyyy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (ddmmyyyy) {
      const [, day, month, year] = ddmmyyyy;
      date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    // DD.MM.YYYY format (European with dots)
    const ddmmyyyyDots = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (ddmmyyyyDots) {
      const [, day, month, year] = ddmmyyyyDots;
      date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    // MM/DD/YYYY format (US)
    const mmddyyyy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (mmddyyyy) {
      const [, month, day, year] = mmddyyyy;
      date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    // YYYY-MM-DD format (ISO)
    const yyyymmdd = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (yyyymmdd) {
      const [, year, month, day] = yyyymmdd;
      date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    // If no format matches, return null
    return null;
  }

  /**
   * Start import job
   */
  static async startImportJob(
    data: any[],
    mapping: FieldMapping,
    type: 'income' | 'expense',
    userId: string,
    options: ImportOptions = {}
  ): Promise<string> {
    const jobId = `import_${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const job: ImportJobResult = {
      jobId,
      status: 'pending',
      totalRows: data.length,
      processedRows: 0,
      successfulRows: 0,
      failedRows: 0,
      results: {
        created: 0,
        updated: 0,
        skipped: 0,
        failed: 0
      },
      errors: [],
      warnings: [],
      createdAt: new Date(),
      userId
    };

    importJobs.set(jobId, job);

    // Start processing asynchronously
    this.processImportJob(jobId, data, mapping, type, userId, options)
      .catch(error => {
        console.error(`Import job ${jobId} failed:`, error);
        const job = importJobs.get(jobId);
        if (job) {
          job.status = 'failed';
          job.completedAt = new Date();
          importJobs.set(jobId, job);
        }
      });

    return jobId;
  }

  /**
   * Process import job
   */
  private static async processImportJob(
    jobId: string,
    data: any[],
    mapping: FieldMapping,
    type: 'income' | 'expense',
    userId: string,
    options: ImportOptions
  ): Promise<void> {
    const job = importJobs.get(jobId);
    if (!job) throw new Error('Job not found');

    job.status = 'processing';
    importJobs.set(jobId, job);

    const categoryCache = new Map<string, any>();
    const vendorCache = new Map<string, any>();
    
    // Performance optimization: Process in batches
    const BATCH_SIZE = 10;
    const batches = [];
    
    console.log(`🚀 [Import Performance] Starting batch processing for ${data.length} rows with batch size ${BATCH_SIZE}`);
    const startTime = Date.now();

    // Create batches
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      batches.push(data.slice(i, i + BATCH_SIZE));
    }

    let processedCount = 0;
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const batchStartTime = Date.now();
      
      console.log(`📦 [Import Performance] Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} rows)`);

      // Process batch concurrently
      const batchPromises = batch.map(async (row, indexInBatch) => {
        const rowNumber = processedCount + indexInBatch + 2; // +2 for header row
        
        try {
          // Extract and validate data
          const recordData = await this.extractRecordData(row, mapping, type, userId, options, categoryCache, vendorCache);
          
          return { success: true, recordData, rowNumber };
        } catch (error) {
          return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error',
            rowNumber 
          };
        }
      });

      // Wait for all rows in batch to be processed
      const batchResults = await Promise.all(batchPromises);
      
      // Separate successful and failed records
      const successfulRecords = batchResults.filter(result => result.success).map(result => result.recordData);
      const failedRecords = batchResults.filter(result => !result.success);
      
      // Bulk create successful records
      if (successfulRecords.length > 0) {
        try {
          if (type === 'income') {
            await this.createIncomeRecordsBulk(successfulRecords, userId);
          } else {
            await this.createExpenseRecordsBulk(successfulRecords, userId);
          }
          
          job.successfulRows += successfulRecords.length;
          job.results.created += successfulRecords.length;
        } catch (error) {
          console.error(`❌ [Import Performance] Bulk creation failed for batch ${batchIndex + 1}:`, error);
          // Fall back to individual creation
          for (const recordData of successfulRecords) {
            try {
              if (type === 'income') {
                await this.createIncomeRecord(recordData, userId);
              } else {
                await this.createExpenseRecord(recordData, userId);
              }
              job.successfulRows++;
              job.results.created++;
            } catch (individualError) {
              job.failedRows++;
              job.results.failed++;
              job.errors.push({
                row: processedCount + 2,
                field: 'general',
                message: individualError instanceof Error ? individualError.message : 'Unknown error'
              });
            }
          }
        }
      }
      
      // Handle failed records
      for (const failedRecord of failedRecords) {
        job.failedRows++;
        job.results.failed++;
        job.errors.push({
          row: failedRecord.rowNumber,
          field: 'general',
          message: failedRecord.error
        });

        if (!options.skipInvalidRows) {
          throw new Error(`Row ${failedRecord.rowNumber}: ${failedRecord.error}`);
        }
      }

      processedCount += batch.length;
      job.processedRows = processedCount;
      
      // Update job progress every batch instead of every row
      importJobs.set(jobId, job);
      
      const batchTime = Date.now() - batchStartTime;
      console.log(`✅ [Import Performance] Batch ${batchIndex + 1} completed in ${batchTime}ms (${successfulRecords.length} success, ${failedRecords.length} failed)`);
    }

    const totalTime = Date.now() - startTime;
    console.log(`🎉 [Import Performance] Import completed in ${totalTime}ms (${job.successfulRows} success, ${job.failedRows} failed)`);

    job.status = 'completed';
    job.completedAt = new Date();
    importJobs.set(jobId, job);
  }

  /**
   * Extract record data from row
   */
  private static async extractRecordData(
    row: any,
    mapping: FieldMapping,
    type: 'income' | 'expense',
    userId: string,
    options: ImportOptions,
    categoryCache: Map<string, any>,
    vendorCache: Map<string, any>
  ): Promise<any> {
    const extractStartTime = Date.now();
    const data: any = {};

    // Extract basic fields
    Object.keys(mapping).forEach(csvColumn => {
      const systemField = mapping[csvColumn];
      const value = row[csvColumn];

      switch (systemField) {
        case 'amount':
          data.amount = this.parseAmount(value);
          break;
        case 'description':
          data.description = value?.toString().trim();
          break;
        case 'date':
          data.date = this.parseDate(value) || new Date();
          break;
        case 'recurring':
          data.isRecurring = this.parseBoolean(value);
          break;
        default:
          data[systemField] = value;
      }
    });

    // Handle category
    const categoryColumn = Object.keys(mapping).find(key => mapping[key] === 'category');
    if (categoryColumn && row[categoryColumn]) {
      const categoryName = row[categoryColumn].toString().trim();
      data.categoryId = await this.resolveCategory(categoryName, type, userId, options, categoryCache);
    }

    // Handle vendor (for expenses)
    if (type === 'expense') {
      const vendorColumn = Object.keys(mapping).find(key => mapping[key] === 'vendor');
      if (vendorColumn && row[vendorColumn]) {
        const vendorName = row[vendorColumn].toString().trim();
        data.vendorId = await this.resolveVendor(vendorName, userId, options, vendorCache);
      }
    }

    data.userId = userId;

    const extractTime = Date.now() - extractStartTime;
    if (extractTime > 100) { // Log slow extractions (>100ms)
      console.warn(`⚠️ [Performance] Slow data extraction: ${extractTime}ms for row`);
    }

    return data;
  }

  /**
   * Parse boolean value
   */
  private static parseBoolean(value: any): boolean {
    if (typeof value === 'boolean') return value;

    const str = value?.toString().toLowerCase().trim();
    return ['true', 'yes', '1', 'y', 'on'].includes(str || '');
  }

  /**
   * Resolve category (create if needed)
   */
  private static async resolveCategory(
    categoryName: string,
    type: 'income' | 'expense',
    userId: string,
    options: ImportOptions,
    cache: Map<string, any>
  ): Promise<string | null> {
    const resolveStartTime = Date.now();
    const cacheKey = `${type}_${categoryName}`;

    if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }

    const CategoryModel = type === 'income' ? IncomeCategory : ExpenseCategory;

    // Try to find existing category
    let category = await CategoryModel.findOne({
      name: { $regex: new RegExp(`^${categoryName}$`, 'i') },
      userId
    });

    if (!category && options.createCategories) {
      // Create new category
      category = new CategoryModel({
        name: categoryName,
        description: `Auto-created during import`,
        isDefault: false,
        userId
      });
      await category.save();
    }

    const categoryId = category?._id.toString() || null;
    cache.set(cacheKey, categoryId);

    const resolveTime = Date.now() - resolveStartTime;
    if (resolveTime > 200) { // Log slow category resolution (>200ms)
      console.warn(`⚠️ [Performance] Slow category resolution: ${resolveTime}ms for "${categoryName}"`);
    }

    return categoryId;
  }

  /**
   * Resolve vendor (create if needed)
   */
  private static async resolveVendor(
    vendorName: string,
    userId: string,
    options: ImportOptions,
    cache: Map<string, any>
  ): Promise<string | null> {
    const resolveStartTime = Date.now();
    
    if (cache.has(vendorName)) {
      return cache.get(vendorName);
    }

    // Try to find existing vendor
    let vendor = await Vendor.findOne({
      name: { $regex: new RegExp(`^${vendorName}$`, 'i') },
      userId
    });

    if (!vendor && options.createVendors) {
      // Create new vendor
      vendor = new Vendor({
        name: vendorName,
        email: '',
        phone: '',
        address: '',
        userId
      });
      await vendor.save();
    }

    const vendorId = vendor?._id.toString() || null;
    cache.set(vendorName, vendorId);

    const resolveTime = Date.now() - resolveStartTime;
    if (resolveTime > 200) { // Log slow vendor resolution (>200ms)
      console.warn(`⚠️ [Performance] Slow vendor resolution: ${resolveTime}ms for "${vendorName}"`);
    }

    return vendorId;
  }

  /**
   * Create income record
   */
  private static async createIncomeRecord(data: any, userId: string): Promise<void> {
    const income = new Income(data);
    await income.save();
  }

  /**
   * Create expense record
   */
  private static async createExpenseRecord(data: any, userId: string): Promise<void> {
    const expense = new Expense(data);
    await expense.save();
  }

  /**
   * Create multiple income records using bulk operations
   */
  private static async createIncomeRecordsBulk(dataArray: any[], userId: string): Promise<void> {
    if (dataArray.length === 0) return;
    
    console.log(`💾 [Bulk Operation] Creating ${dataArray.length} income records`);
    const startTime = Date.now();
    
    try {
      const result = await Income.insertMany(dataArray, { 
        ordered: false, // Continue processing even if some documents fail
        rawResult: true 
      });
      
      const bulkTime = Date.now() - startTime;
      console.log(`✅ [Bulk Operation] Income bulk insert completed in ${bulkTime}ms (${result.insertedCount} inserted)`);
    } catch (error) {
      const bulkTime = Date.now() - startTime;
      console.error(`❌ [Bulk Operation] Income bulk insert failed after ${bulkTime}ms:`, error);
      throw error;
    }
  }

  /**
   * Create multiple expense records using bulk operations
   */
  private static async createExpenseRecordsBulk(dataArray: any[], userId: string): Promise<void> {
    if (dataArray.length === 0) return;
    
    console.log(`💾 [Bulk Operation] Creating ${dataArray.length} expense records`);
    const startTime = Date.now();
    
    try {
      const result = await Expense.insertMany(dataArray, { 
        ordered: false, // Continue processing even if some documents fail
        rawResult: true 
      });
      
      const bulkTime = Date.now() - startTime;
      console.log(`✅ [Bulk Operation] Expense bulk insert completed in ${bulkTime}ms (${result.insertedCount} inserted)`);
    } catch (error) {
      const bulkTime = Date.now() - startTime;
      console.error(`❌ [Bulk Operation] Expense bulk insert failed after ${bulkTime}ms:`, error);
      throw error;
    }
  }

  /**
   * Get import job status
   */
  static getImportJob(jobId: string): ImportJobResult | null {
    return importJobs.get(jobId) || null;
  }

  /**
   * Get user's import jobs
   */
  static getUserImportJobs(userId: string): ImportJobResult[] {
    return Array.from(importJobs.values()).filter(job => job.userId === userId);
  }

  /**
   * Get job status
   */
  static getJobStatus(jobId: string): ImportJobResult | null {
    return importJobs.get(jobId) || null;
  }

  /**
   * Cancel import job
   */
  static cancelJob(jobId: string): boolean {
    const job = importJobs.get(jobId);
    if (!job) return false;

    // Can only cancel pending or processing jobs
    if (job.status === 'pending' || job.status === 'processing') {
      job.status = 'failed';
      job.completedAt = new Date();
      importJobs.set(jobId, job);
      return true;
    }

    return false;
  }

  /**
   * Get all jobs for a user
   */
  static getUserJobs(userId: string): ImportJobResult[] {
    const userJobs: ImportJobResult[] = [];

    for (const job of importJobs.values()) {
      if (job.userId === userId) {
        userJobs.push(job);
      }
    }

    return userJobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Clean up old import jobs (call this periodically)
   */
  static cleanupOldJobs(maxAgeHours: number = 24): void {
    const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);

    for (const [jobId, job] of importJobs) {
      if (job.createdAt < cutoffTime) {
        importJobs.delete(jobId);
      }
    }
  }
}