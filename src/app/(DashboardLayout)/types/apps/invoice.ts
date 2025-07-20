export interface InvoiceItem {
  productId?: string;
  itemName: string;
  sku?: string;
  description?: string;
  unitPrice: number;
  units: number;
  discount?: {
    type: 'percentage' | 'fixed';
    value: number;
    reason?: string;
  };
  taxRate?: number;
  unitTotalPrice: number;
  image?: string;
}

export interface InvoiceDiscount {
  type: 'percentage' | 'fixed';
  value: number;
  reason?: string;
  appliedTo: 'line_item' | 'subtotal';
}

export interface InvoiceTaxConfig {
  type: 'inclusive' | 'exclusive';
  rates: {
    name: string;
    rate: number;
    appliedTo: string[]; // item IDs or 'all'
  }[];
}

export interface CompanySettings {
  name: string;
  email: string;
  phone: string;
  address: string;
  logoUrl?: string;
  taxNumber?: string;
  website?: string;
}

export interface InvoiceList {
  id: number;
  billFrom: string;
  billFromEmail: string;
  billFromAddress: string;
  billFromPhone: number;
  billFromFax: number;
  billTo: string;
  billToEmail: string;
  billToAddress: string;
  billToPhone: number;
  billToFax: number;
  orders: InvoiceItem[];
  orderDate: Date;
  totalCost: number;
  vat: number; // Keep for backward compatibility, will be renamed to tax
  tax?: number; // New field for tax amount
  grandTotal: number;
  status: string;
  completed: boolean;
  isSelected: boolean;
  
  // Enhanced features
  logoUrl?: string;
  discounts?: InvoiceDiscount[];
  taxConfig?: InvoiceTaxConfig;
  subtotalBeforeDiscount?: number;
  totalDiscount?: number;
  notes?: string;
  manualTaxOverride?: number;
  manualDiscountOverride?: number;
}

export interface InvoiceCreateFormData {
  id: number;
  billFrom: string;
  billTo: string;
  totalCost: number;
  status: string;
  billFromAddress: string;
  billToAddress: string;
  orders: InvoiceItem[];
  vat: number; // Keep for backward compatibility
  tax: number; // New tax field
  grandTotal: number;
  subtotal: number;
  date: string;
  template: string;
  
  // Enhanced features
  discounts: InvoiceDiscount[];
  taxConfig: InvoiceTaxConfig;
  subtotalBeforeDiscount: number;
  totalDiscount: number;
  manualTaxOverride?: number;
  manualDiscountOverride?: number;
  notes?: string;
}