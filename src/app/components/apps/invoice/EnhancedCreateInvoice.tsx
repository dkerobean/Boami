"use client";
import React, { useState, useContext, useEffect } from "react";
import { InvoiceContext } from "@/app/context/InvoiceContext";
import axios from 'axios';
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Stack,
  Divider,
  Step,
  Stepper,
  StepLabel,
  Alert,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
} from "@mui/material";
import { useRouter } from "next/navigation";
import {
  IconPlus,
  IconTrash,
  IconEye,
  IconDeviceFloppy,
  IconArrowLeft,
  IconArrowRight,
} from "@tabler/icons-react";
import CustomFormLabel from "@/app/components/forms/theme-elements/CustomFormLabel";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import { InvoiceList, InvoiceItem, InvoiceDiscount, InvoiceTaxConfig } from "@/app/(DashboardLayout)/types/apps/invoice";
import LogoUpload from "./LogoUpload";
import ProductSelector from "./ProductSelector";
import DiscountManager from "./DiscountManager";
import TaxCalculator from "./TaxCalculator";
import PricingBreakdown from "./PricingBreakdown";
import EcommerceInvoiceTemplate from "./templates/EcommerceInvoiceTemplate";

const steps = [
  "Company & Customer",
  "Products & Items",
  "Pricing & Discounts",
  "Review & Generate"
];

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const EnhancedCreateInvoice = () => {
  const { addInvoice, invoices } = useContext(InvoiceContext);
  const [activeStep, setActiveStep] = useState(0);
  const [showAlert, setShowAlert] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [productSelectorOpen, setProductSelectorOpen] = useState(false);
  const [companySettings, setCompanySettings] = useState<any>(null);
  const router = useRouter();

  const [formData, setFormData] = useState<Partial<InvoiceList>>({
    id: 0,
    billFrom: "",
    billFromEmail: "",
    billFromAddress: "",
    billFromPhone: 0,
    billFromFax: 0,
    billTo: "",
    billToEmail: "",
    billToAddress: "",
    billToPhone: 0,
    billToFax: 0,
    orders: [],
    orderDate: new Date(),
    totalCost: 0,
    vat: 0,
    grandTotal: 0,
    status: "Pending",
    completed: false,
    isSelected: false,
    logoUrl: "",
    discounts: [],
    taxConfig: {
      type: "exclusive",
      rates: [],
    },
    notes: "",
  });

  // Fetch company settings and load logo
  const fetchCompanySettings = async () => {
    try {
      const response = await axios.get('/api/company');
      
      if (response.data.success) {
        const settings = response.data.data;
        setCompanySettings(settings);
        
        // Pre-populate form with company settings
        setFormData(prev => ({
          ...prev,
          logoUrl: settings.logoUrl || "",
          billFrom: settings.name || "",
          billFromEmail: settings.email || "",
          billFromAddress: settings.address || "",
          billFromPhone: settings.phone || 0,
        }));
      }
    } catch (error) {
      console.error('Error fetching company settings:', error);
    }
  };

  useEffect(() => {
    fetchCompanySettings();
  }, []);

  useEffect(() => {
    if (invoices.length > 0) {
      const lastId = invoices[invoices.length - 1].id;
      setFormData(prev => ({ ...prev, id: lastId + 1 }));
    } else {
      setFormData(prev => ({ ...prev, id: 1 }));
    }
  }, [invoices]);

  // Calculate totals
  const calculateTotals = () => {
    const orders = formData.orders || [];
    const discounts = formData.discounts || [];
    const taxConfig = formData.taxConfig!;

    // Calculate subtotal
    const subtotal = orders.reduce((sum, order) => sum + order.unitTotalPrice, 0);

    // Calculate discount amount
    const totalDiscountAmount = discounts.reduce((sum, discount) => {
      if (discount.type === "percentage") {
        return sum + (subtotal * discount.value) / 100;
      } else {
        return sum + discount.value;
      }
    }, 0);

    // Calculate subtotal after discount
    const subtotalAfterDiscount = subtotal - totalDiscountAmount;

    // Calculate tax
    const totalTaxAmount = orders.reduce((sum, item) => {
      const applicableTaxRates = taxConfig.rates.filter(rate =>
        rate.appliedTo.includes("all") || 
        rate.appliedTo.includes(item.productId || "")
      );

      const totalTaxRate = applicableTaxRates.reduce((rateSum, rate) => rateSum + rate.rate, 0);
      
      if (taxConfig.type === "inclusive") {
        return sum + (item.unitTotalPrice * totalTaxRate) / (100 + totalTaxRate);
      } else {
        return sum + (item.unitTotalPrice * totalTaxRate) / 100;
      }
    }, 0);

    // Calculate grand total
    const grandTotal = taxConfig.type === "inclusive" 
      ? subtotalAfterDiscount 
      : subtotalAfterDiscount + totalTaxAmount;

    setFormData(prev => ({
      ...prev,
      totalCost: subtotal,
      vat: totalTaxAmount,
      grandTotal: grandTotal,
      subtotalBeforeDiscount: subtotal,
      totalDiscount: totalDiscountAmount,
    }));
  };

  useEffect(() => {
    calculateTotals();
  }, [formData.orders, formData.discounts, formData.taxConfig]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleProductSelect = (product: InvoiceItem) => {
    const updatedOrders = [...(formData.orders || []), product];
    setFormData(prev => ({ ...prev, orders: updatedOrders }));
  };

  const handleRemoveItem = (index: number) => {
    const updatedOrders = (formData.orders || []).filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, orders: updatedOrders }));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updatedOrders = [...(formData.orders || [])];
    updatedOrders[index] = { ...updatedOrders[index], [field]: value };
    
    if (field === "unitPrice" || field === "units") {
      const unitPrice = field === "unitPrice" ? value : updatedOrders[index].unitPrice;
      const units = field === "units" ? value : updatedOrders[index].units;
      updatedOrders[index].unitTotalPrice = unitPrice * units;
    }
    
    setFormData(prev => ({ ...prev, orders: updatedOrders }));
  };

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleSubmit = () => {
    if (formData.orders && formData.orders.length > 0) {
      addInvoice(formData as InvoiceList);
      setShowAlert(true);
      setTimeout(() => {
        router.push("/apps/invoice/list");
      }, 2000);
    }
  };

  const isStepComplete = (step: number): boolean => {
    switch (step) {
      case 0:
        return !!(formData.billFrom && formData.billTo && formData.billFromEmail && formData.billToEmail);
      case 1:
        return !!(formData.orders && formData.orders.length > 0);
      case 2:
        return true; // Pricing step is optional
      case 3:
        return true; // Review step
      default:
        return false;
    }
  };

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight={600}>
          Create New Invoice
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<IconEye />}
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? "Hide" : "Show"} Preview
          </Button>
          <Button
            variant="outlined"
            color="error"
            onClick={() => router.push("/apps/invoice/list")}
          >
            Cancel
          </Button>
        </Stack>
      </Stack>

      {showAlert && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Invoice created successfully! Redirecting to invoice list...
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} lg={showPreview ? 6 : 12}>
          {/* Stepper */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Stepper activeStep={activeStep} alternativeLabel>
              {steps.map((label, index) => (
                <Step key={label} completed={isStepComplete(index)}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Paper>

          {/* Step Content */}
          <Paper sx={{ p: 3 }}>
            {/* Step 0: Company & Customer Details */}
            {activeStep === 0 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Company & Customer Information
                </Typography>
                
                <Box mb={4}>
                  <LogoUpload
                    logoUrl={formData.logoUrl}
                    onLogoChange={(logoUrl) => handleInputChange("logoUrl", logoUrl)}
                  />
                </Box>

                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle1" gutterBottom color="primary">
                      📤 Bill From (Your Company)
                    </Typography>
                    <Stack spacing={2}>
                      <CustomTextField
                        label="Company Name"
                        fullWidth
                        value={formData.billFrom}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange("billFrom", e.target.value)}
                        required
                      />
                      <CustomTextField
                        label="Email"
                        type="email"
                        fullWidth
                        value={formData.billFromEmail}
                        onChange={(e) => handleInputChange("billFromEmail", e.target.value)}
                        required
                      />
                      <CustomTextField
                        label="Address"
                        multiline
                        rows={3}
                        fullWidth
                        value={formData.billFromAddress}
                        onChange={(e) => handleInputChange("billFromAddress", e.target.value)}
                        required
                      />
                      <CustomTextField
                        label="Phone"
                        fullWidth
                        value={formData.billFromPhone}
                        onChange={(e) => handleInputChange("billFromPhone", e.target.value)}
                      />
                    </Stack>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle1" gutterBottom color="primary">
                      📥 Bill To (Customer)
                    </Typography>
                    <Stack spacing={2}>
                      <CustomTextField
                        label="Customer Name"
                        fullWidth
                        value={formData.billTo}
                        onChange={(e) => handleInputChange("billTo", e.target.value)}
                        required
                      />
                      <CustomTextField
                        label="Email"
                        type="email"
                        fullWidth
                        value={formData.billToEmail}
                        onChange={(e) => handleInputChange("billToEmail", e.target.value)}
                        required
                      />
                      <CustomTextField
                        label="Address"
                        multiline
                        rows={3}
                        fullWidth
                        value={formData.billToAddress}
                        onChange={(e) => handleInputChange("billToAddress", e.target.value)}
                        required
                      />
                      <CustomTextField
                        label="Phone"
                        fullWidth
                        value={formData.billToPhone}
                        onChange={(e) => handleInputChange("billToPhone", e.target.value)}
                      />
                    </Stack>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* Step 1: Products & Items */}
            {activeStep === 1 && (
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                  <Typography variant="h6">
                    Products & Items
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<IconPlus />}
                    onClick={() => setProductSelectorOpen(true)}
                  >
                    Add Products
                  </Button>
                </Stack>

                {formData.orders && formData.orders.length > 0 ? (
                  <Stack spacing={2}>
                    {formData.orders.map((item, index) => (
                      <Paper key={index} variant="outlined" sx={{ p: 2 }}>
                        <Grid container spacing={2} alignItems="center">
                          <Grid item xs={12} sm={4}>
                            <CustomTextField
                              label="Item Name"
                              fullWidth
                              value={item.itemName}
                              onChange={(e) => handleItemChange(index, "itemName", e.target.value)}
                            />
                          </Grid>
                          <Grid item xs={12} sm={2}>
                            <CustomTextField
                              label="Unit Price"
                              type="number"
                              fullWidth
                              value={item.unitPrice}
                              onChange={(e) => handleItemChange(index, "unitPrice", parseFloat(e.target.value) || 0)}
                            />
                          </Grid>
                          <Grid item xs={12} sm={2}>
                            <CustomTextField
                              label="Quantity"
                              type="number"
                              fullWidth
                              value={item.units}
                              onChange={(e) => handleItemChange(index, "units", parseInt(e.target.value) || 0)}
                            />
                          </Grid>
                          <Grid item xs={12} sm={2}>
                            <CustomTextField
                              label="Total"
                              fullWidth
                              value={`$${item.unitTotalPrice.toFixed(2)}`}
                              disabled
                            />
                          </Grid>
                          <Grid item xs={12} sm={2}>
                            <Tooltip title="Remove item">
                              <IconButton
                                color="error"
                                onClick={() => handleRemoveItem(index)}
                              >
                                <IconTrash />
                              </IconButton>
                            </Tooltip>
                          </Grid>
                        </Grid>
                      </Paper>
                    ))}
                  </Stack>
                ) : (
                  <Paper variant="outlined" sx={{ p: 4, textAlign: "center" }}>
                    <Typography variant="body1" color="text.secondary" mb={2}>
                      No items added yet
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<IconPlus />}
                      onClick={() => setProductSelectorOpen(true)}
                    >
                      Add Your First Product
                    </Button>
                  </Paper>
                )}
              </Box>
            )}

            {/* Step 2: Pricing & Discounts */}
            {activeStep === 2 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Pricing, Discounts & Tax
                </Typography>
                
                <Tabs value={0} sx={{ mb: 3 }}>
                  <Tab label="Discounts" />
                  <Tab label="Tax Configuration" />
                </Tabs>

                <TabPanel value={0} index={0}>
                  <DiscountManager
                    discounts={formData.discounts || []}
                    onDiscountsChange={(discounts) => handleInputChange("discounts", discounts)}
                    subtotal={formData.totalCost || 0}
                  />
                </TabPanel>

                <TabPanel value={0} index={1}>
                  <TaxCalculator
                    taxConfig={formData.taxConfig!}
                    onTaxConfigChange={(config) => handleInputChange("taxConfig", config)}
                    invoiceItems={formData.orders || []}
                    subtotal={formData.totalCost || 0}
                  />
                </TabPanel>

                <Box mt={3}>
                  <PricingBreakdown
                    items={formData.orders || []}
                    discounts={formData.discounts || []}
                    taxConfig={formData.taxConfig!}
                    showDetails={true}
                  />
                </Box>
              </Box>
            )}

            {/* Step 3: Review & Generate */}
            {activeStep === 3 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Review & Generate Invoice
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" gutterBottom>
                      Invoice Summary
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Stack spacing={1}>
                        <Box display="flex" justifyContent="space-between">
                          <Typography>Invoice #:</Typography>
                          <Typography fontWeight={500}>{formData.id}</Typography>
                        </Box>
                        <Box display="flex" justifyContent="space-between">
                          <Typography>Items:</Typography>
                          <Typography fontWeight={500}>{formData.orders?.length || 0}</Typography>
                        </Box>
                        <Box display="flex" justifyContent="space-between">
                          <Typography>Subtotal:</Typography>
                          <Typography fontWeight={500}>${formData.totalCost?.toFixed(2)}</Typography>
                        </Box>
                        <Box display="flex" justifyContent="space-between">
                          <Typography>Tax:</Typography>
                          <Typography fontWeight={500}>${formData.vat?.toFixed(2)}</Typography>
                        </Box>
                        <Divider />
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="h6">Total:</Typography>
                          <Typography variant="h6" color="primary">${formData.grandTotal?.toFixed(2)}</Typography>
                        </Box>
                      </Stack>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" gutterBottom>
                      Additional Notes
                    </Typography>
                    <CustomTextField
                      label="Invoice Notes"
                      multiline
                      rows={6}
                      fullWidth
                      value={formData.notes}
                      onChange={(e) => handleInputChange("notes", e.target.value)}
                      placeholder="Add any additional notes or terms..."
                    />
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* Navigation Buttons */}
            <Box display="flex" justifyContent="space-between" mt={4}>
              <Button
                onClick={handleBack}
                disabled={activeStep === 0}
                startIcon={<IconArrowLeft />}
              >
                Back
              </Button>

              {activeStep === steps.length - 1 ? (
                <Button
                  variant="contained"
                  onClick={handleSubmit}
                  startIcon={<IconDeviceFloppy />}
                  disabled={!isStepComplete(activeStep)}
                >
                  Create Invoice
                </Button>
              ) : (
                <Button
                  variant="contained"
                  onClick={handleNext}
                  endIcon={<IconArrowRight />}
                  disabled={!isStepComplete(activeStep)}
                >
                  Next
                </Button>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Preview Panel */}
        {showPreview && (
          <Grid item xs={12} lg={6}>
            <Paper sx={{ p: 2, maxHeight: "80vh", overflow: "auto" }}>
              <Typography variant="h6" gutterBottom>
                Invoice Preview
              </Typography>
              <Box sx={{ transform: "scale(0.7)", transformOrigin: "top left" }}>
                <EcommerceInvoiceTemplate
                  invoice={formData as InvoiceList}
                  logoUrl={formData.logoUrl}
                />
              </Box>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Product Selector Modal */}
      <ProductSelector
        open={productSelectorOpen}
        onClose={() => setProductSelectorOpen(false)}
        onProductSelect={handleProductSelect}
        selectedProducts={formData.orders || []}
      />
    </Box>
  );
};

export default EnhancedCreateInvoice;