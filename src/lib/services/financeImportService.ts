import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import Income from '@/lib/database/models/Income';
import Expense from '@/lib/database/models/Expense';
import IncomeCategory from '@/lib/database/models/IncomeCategory';
import ExpenseCategory from '@/lib/database/models/ExpenseCategory';
import Vendor from '@/lib/database/models/Vendor';
import ImportJob from '@/lib/database/models/ImportJob';

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

// Import jobs are now persisted in MongoDB using the ImportJob model

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
            value: csvColumn ? row[csvColumn] : undefined
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
   * Start import job with MongoDB persistence
   */
  static async startImportJob(
    data: any[],
    mapping: FieldMapping,
    type: 'income' | 'expense',
    userId: string,
    options: ImportOptions = {}
  ): Promise<string> {
    const jobId = `import_${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create job in database
    const job = new ImportJob({
      jobId,
      status: 'pending',
      type,
      totalRows: data.length,
      processedRows: 0,
      successfulRows: 0,
      failedRows: 0,
      progress: {
        percentage: 0
      },
      results: {
        created: 0,
        updated: 0,
        skipped: 0,
        failed: 0
      },
      errors: [],
      warnings: [],
      userId,
      mapping,
      options
    });

    await job.save();
    console.log(`📝 [Job Management] Created import job ${jobId} in database`);

    // Start processing asynchronously
    this.processImportJob(jobId, data, mapping, type, userId, options)
      .catch(async error => {
        console.error(`Import job ${jobId} failed:`, error);
        try {
          await ImportJob.findOneAndUpdate(
            { jobId },
            {
              status: 'failed',
              completedAt: new Date(),
              $push: {
                errors: {
                  row: 0,
                  field: 'general',
                  message: error instanceof Error ? error.message : 'Unknown error'
                }
              }
            }
          );
        } catch (updateError) {
          console.error(`Failed to update job ${jobId} status:`, updateError);
        }
      });

    return jobId;
  }

  /**
   * Process import job with database persistence
   */
  private static async processImportJob(
    jobId: string,
    data: any[],
    mapping: FieldMapping,
    type: 'income' | 'expense',
    userId: string,
    options: ImportOptions
  ): Promise<void> {
    const job = await ImportJob.findOne({ jobId });
    if (!job) throw new Error('Job not found in database');

    job.status = 'processing';
    await job.save();

    const categoryCache = new Map<string, any>();
    const vendorCache = new Map<string, any>();

    // Pre-cache all existing categories and vendors to avoid database queries during processing
    console.log(`🔄 [Import Performance] Pre-caching categories and vendors for user ${userId}`);
    const preCacheStartTime = Date.now();

    const CategoryModel = type === 'income' ? IncomeCategory : ExpenseCategory;
    const existingCategories = await CategoryModel.find({ userId }).lean();
    existingCategories.forEach(category => {
      const cacheKey = `${type}_${category.name.toLowerCase()}`;
      categoryCache.set(cacheKey, (category._id as any).toString());
    });

    if (type === 'expense') {
      const existingVendors = await Vendor.find({ userId }).lean();
      existingVendors.forEach(vendor => {
        vendorCache.set(vendor.name.toLowerCase(), (vendor._id as any).toString());
      });
      console.log(`📝 [Import Performance] Pre-cached ${existingVendors.length} vendors`);
    }

    const preCacheTime = Date.now() - preCacheStartTime;
    console.log(`✅ [Import Performance] Pre-caching completed in ${preCacheTime}ms (${existingCategories.length} categories, ${vendorCache.size} vendors)`);

    // Performance optimization: Process in batches
    const BATCH_SIZE = 100;
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
              if (!job.importErrors) job.importErrors = [];
              job.importErrors.push({
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
        if (!job.importErrors) job.importErrors = [];
        job.importErrors.push({
          row: failedRecord.rowNumber,
          field: 'general',
          message: failedRecord.error || 'Unknown error'
        });

        if (!options.skipInvalidRows) {
          throw new Error(`Row ${failedRecord.rowNumber}: ${failedRecord.error || 'Unknown error'}`);
        }
      }

      processedCount += batch.length;
      job.processedRows = processedCount;

      // Update job progress every 5 batches to reduce overhead
      if (batchIndex % 5 === 0 || batchIndex === batches.length - 1) {
        job.progress.percentage = Math.round((job.processedRows / job.totalRows) * 100);
        await job.save();
        console.log(`📊 [Progress Update] Batch ${batchIndex + 1}/${batches.length} - ${job.processedRows}/${job.totalRows} rows processed`);
      }

      const batchTime = Date.now() - batchStartTime;
      console.log(`✅ [Import Performance] Batch ${batchIndex + 1} completed in ${batchTime}ms (${successfulRecords.length} success, ${failedRecords.length} failed)`);
    }

    const totalTime = Date.now() - startTime;
    console.log(`🎉 [Import Performance] Import completed in ${totalTime}ms (${job.successfulRows} success, ${job.failedRows} failed)`);

    job.status = 'completed';
    job.completedAt = new Date();
    job.progress.percentage = 100;
    await job.save();
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
   * Resolve category (create if needed) - optimized with pre-caching
   */
  private static async resolveCategory(
    categoryName: string,
    type: 'income' | 'expense',
    userId: string,
    options: ImportOptions,
    cache: Map<string, any>
  ): Promise<string | null> {
    const resolveStartTime = Date.now();
    const cacheKey = `${type}_${categoryName.toLowerCase()}`;

    // Check pre-cached categories first
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }

    // If not in cache and createCategories is enabled, create new category
    if (options.createCategories) {
      const CategoryModel = type === 'income' ? IncomeCategory : ExpenseCategory;

      const category = new CategoryModel({
        name: categoryName,
        description: `Auto-created during import`,
        isDefault: false,
        userId
      });
      await category.save();

      const categoryId = (category._id as any).toString();
      cache.set(cacheKey, categoryId);

      const resolveTime = Date.now() - resolveStartTime;
      console.log(`📝 [Performance] Created new category "${categoryName}" in ${resolveTime}ms`);

      return categoryId;
    }

    // Category not found and creation disabled
    return null;
  }

  /**
   * Resolve vendor (create if needed) - optimized with pre-caching
   */
  private static async resolveVendor(
    vendorName: string,
    userId: string,
    options: ImportOptions,
    cache: Map<string, any>
  ): Promise<string | null> {
    const resolveStartTime = Date.now();
    const cacheKey = vendorName.toLowerCase();

    // Check pre-cached vendors first
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }

    // If not in cache and createVendors is enabled, create new vendor
    if (options.createVendors) {
      const vendor = new Vendor({
        name: vendorName,
        email: '',
        phone: '',
        address: '',
        userId
      });
      await vendor.save();

      const vendorId = (vendor._id as any).toString();
      cache.set(cacheKey, vendorId);

      const resolveTime = Date.now() - resolveStartTime;
      console.log(`📝 [Performance] Created new vendor "${vendorName}" in ${resolveTime}ms`);

      return vendorId;
    }

    // Vendor not found and creation disabled
    return null;
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
   * Create multiple income records using bulk operations with improved error handling
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

      // Handle partial failures in unordered bulk insert
      if (result.insertedCount < dataArray.length) {
        const failedCount = dataArray.length - result.insertedCount;
        console.warn(`⚠️ [Bulk Operation] ${failedCount} income records failed during bulk insert`);
      }
    } catch (error: any) {
      const bulkTime = Date.now() - startTime;

      // Handle MongoDB bulk write errors
      if (error.name === 'BulkWriteError' && error.result) {
        const insertedCount = error.result.insertedCount || 0;
        const failedCount = dataArray.length - insertedCount;

        console.warn(`⚠️ [Bulk Operation] Income bulk insert partially completed in ${bulkTime}ms (${insertedCount} inserted, ${failedCount} failed)`);

        // Log specific errors if available
        if (error.writeErrors && error.writeErrors.length > 0) {
          console.error(`❌ [Bulk Operation] First few write errors:`, error.writeErrors.slice(0, 3));
        }

        // Don't throw error for partial success in unordered operations
        return;
      }

      console.error(`❌ [Bulk Operation] Income bulk insert failed after ${bulkTime}ms:`, error);
      throw error;
    }
  }

  /**
   * Create multiple expense records using bulk operations with improved error handling
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

      // Handle partial failures in unordered bulk insert
      if (result.insertedCount < dataArray.length) {
        const failedCount = dataArray.length - result.insertedCount;
        console.warn(`⚠️ [Bulk Operation] ${failedCount} expense records failed during bulk insert`);
      }
    } catch (error: any) {
      const bulkTime = Date.now() - startTime;

      // Handle MongoDB bulk write errors
      if (error.name === 'BulkWriteError' && error.result) {
        const insertedCount = error.result.insertedCount || 0;
        const failedCount = dataArray.length - insertedCount;

        console.warn(`⚠️ [Bulk Operation] Expense bulk insert partially completed in ${bulkTime}ms (${insertedCount} inserted, ${failedCount} failed)`);

        // Log specific errors if available
        if (error.writeErrors && error.writeErrors.length > 0) {
          console.error(`❌ [Bulk Operation] First few write errors:`, error.writeErrors.slice(0, 3));
        }

        // Don't throw error for partial success in unordered operations
        return;
      }

      console.error(`❌ [Bulk Operation] Expense bulk insert failed after ${bulkTime}ms:`, error);
      throw error;
    }
  }

  /**
   * Get import job status from database
   */
  static async getImportJob(jobId: string): Promise<ImportJobResult | null> {
    try {
      const job = await ImportJob.findOne({ jobId }).lean();
      return job as ImportJobResult | null;
    } catch (error) {
      console.error(`Failed to get import job ${jobId}:`, error);
      return null;
    }
  }

  /**
   * Get user's import jobs from database
   */
  static async getUserImportJobs(userId: string, limit = 10): Promise<ImportJobResult[]> {
    try {
      const jobs = await ImportJob.findUserJobs(userId, limit);
      return jobs.map(job => ({
        jobId: job.jobId,
        status: job.status,
        totalRows: job.totalRows,
        processedRows: job.processedRows,
        successfulRows: job.successfulRows,
        failedRows: job.failedRows,
        results: job.results,
        errors: job.importErrors || [],
        warnings: job.warnings || [],
        createdAt: job.createdAt,
        completedAt: job.completedAt,
        userId: job.userId
      }));
    } catch (error) {
      console.error(`Failed to get user import jobs for ${userId}:`, error);
      return [];
    }
  }

  /**
   * Get job status from database
   */
  static async getJobStatus(jobId: string): Promise<ImportJobResult | null> {
    return this.getImportJob(jobId);
  }

  /**
   * Cancel import job in database
   */
  static async cancelJob(jobId: string): Promise<boolean> {
    try {
      const result = await ImportJob.findOneAndUpdate(
        {
          jobId,
          status: { $in: ['pending', 'processing'] }
        },
        {
          status: 'failed',
          completedAt: new Date()
        }
      );

      return result !== null;
    } catch (error) {
      console.error(`Failed to cancel import job ${jobId}:`, error);
      return false;
    }
  }

  /**
   * Get all jobs for a user from database
   */
  static async getUserJobs(userId: string, limit = 20): Promise<ImportJobResult[]> {
    return this.getUserImportJobs(userId, limit);
  }

  /**
   * Clean up old import jobs from database
   */
  static async cleanupOldJobs(maxAgeHours: number = 24): Promise<number> {
    try {
      const result = await ImportJob.cleanupOldJobs(maxAgeHours);
      console.log(`🧹 [Cleanup] Removed ${result.deletedCount} old import jobs`);
      return result.deletedCount || 0;
    } catch (error) {
      console.error('Failed to cleanup old import jobs:', error);
      return 0;
    }
  }
}