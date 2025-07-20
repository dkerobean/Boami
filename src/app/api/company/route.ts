import { NextRequest, NextResponse } from 'next/server';
import * as yup from 'yup';
import { JWTManager } from '@/lib/auth/jwt';
import { connectToDatabase } from '@/lib/database/mongoose-connection';
import fs from 'fs/promises';
import path from 'path';

const companySettingsSchema = yup.object({
  name: yup.string().required('Company name is required').max(100, 'Company name cannot exceed 100 characters'),
  email: yup.string().email('Please enter a valid email address').required('Email is required'),
  phone: yup.string().nullable().transform((value) => value || null),
  address: yup.string().nullable().transform((value) => value || null),
  website: yup.string().url('Please enter a valid website URL').nullable().transform((value) => value || null),
  taxNumber: yup.string().nullable().transform((value) => value || null),
  logoUrl: yup.string().nullable().transform((value) => value || null)
});

const COMPANY_SETTINGS_FILE = path.join(process.cwd(), 'data', 'company-settings.json');

// Ensure data directory exists
async function ensureDataDirectory() {
  const dataDir = path.dirname(COMPANY_SETTINGS_FILE);
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

// Load company settings from file
async function loadCompanySettings() {
  try {
    await ensureDataDirectory();
    const data = await fs.readFile(COMPANY_SETTINGS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    // Return default settings if file doesn't exist
    return {
      name: '',
      email: '',
      phone: '',
      address: '',
      website: '',
      taxNumber: '',
      logoUrl: ''
    };
  }
}

// Save company settings to file
async function saveCompanySettings(settings: any) {
  await ensureDataDirectory();
  await fs.writeFile(COMPANY_SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

/**
 * GET /api/company - Get company settings
 */
export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const currentUser = JWTManager.getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json({ 
        success: false,
        message: 'Unauthorized' 
      }, { status: 401 });
    }

    const settings = await loadCompanySettings();

    return NextResponse.json({
      success: true,
      data: settings
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching company settings:', error);
    return NextResponse.json({ 
      success: false,
      message: 'Internal Server Error' 
    }, { status: 500 });
  }
}

/**
 * POST /api/company - Create or update company settings
 */
export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const currentUser = JWTManager.getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json({ 
        success: false,
        message: 'Unauthorized' 
      }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = await companySettingsSchema.validate(body);

    const settingsWithTimestamp = {
      ...validatedData,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser.email
    };

    await saveCompanySettings(settingsWithTimestamp);

    return NextResponse.json({
      success: true,
      message: 'Company settings saved successfully',
      data: settingsWithTimestamp
    }, { status: 200 });

  } catch (error) {
    console.error('Error saving company settings:', error);
    
    if (error instanceof yup.ValidationError) {
      return NextResponse.json({
        success: false,
        message: 'Validation error',
        errors: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({ 
      success: false,
      message: 'Internal Server Error' 
    }, { status: 500 });
  }
}

/**
 * PUT /api/company - Update company settings (alias for POST)
 */
export async function PUT(req: NextRequest) {
  return POST(req);
}