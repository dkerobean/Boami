"use client";
import React, { useState } from "react";
import {
  Box,
  Typography,
  Grid,
  Paper,
  Stack,
  Tabs,
  Tab,
  Button,
  Alert,
  Snackbar,
} from "@mui/material";
import {
  IconSettings,
  IconCalculator,
  IconReceipt,
  IconDeviceFloppy,
} from "@tabler/icons-react";
import TaxCalculator from "../TaxCalculator";
import PricingBreakdown from "../PricingBreakdown";
import { 
  InvoiceTaxConfig, 
  InvoiceItem, 
  InvoiceDiscount 
} from "@/app/(DashboardLayout)/types/apps/invoice";

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
      id={`pricing-tabpanel-${index}`}
      aria-labelledby={`pricing-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const InvoicePricing: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  // Sample data for demonstration
  const [taxConfig, setTaxConfig] = useState<InvoiceTaxConfig>({
    type: "exclusive",
    rates: [
      {
        name: "VAT (Standard)",
        rate: 20,
        appliedTo: ["all"],
      },
    ],
  });

  const [sampleItems] = useState<InvoiceItem[]>([
    {
      itemName: "Sample Product 1",
      unitPrice: 100,
      units: 2,
      unitTotalPrice: 200,
      productId: "prod-1",
    },
    {
      itemName: "Sample Product 2",
      unitPrice: 50,
      units: 3,
      unitTotalPrice: 150,
      productId: "prod-2",
    },
  ]);

  const [sampleDiscounts] = useState<InvoiceDiscount[]>([
    {
      type: "percentage",
      value: 10,
      reason: "Early Bird Discount",
      appliedTo: "subtotal",
    },
  ]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleTaxConfigChange = (newConfig: InvoiceTaxConfig) => {
    setTaxConfig(newConfig);
  };

  const handleSaveSettings = () => {
    // Here you would typically save to your backend
    console.log("Saving tax configuration:", taxConfig);
    setSnackbarMessage("Tax settings saved successfully!");
    setShowSnackbar(true);
  };

  const subtotal = sampleItems.reduce((sum, item) => sum + item.unitTotalPrice, 0);

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <Stack direction="row" alignItems="center" gap={2}>
          <IconSettings size={24} />
          <Typography variant="h5">
            Pricing & Tax Management
          </Typography>
        </Stack>
        <Button
          variant="contained"
          startIcon={<IconDeviceFloppy />}
          onClick={handleSaveSettings}
        >
          Save Settings
        </Button>
      </Stack>

      <Typography variant="body1" color="text.secondary" mb={3}>
        Configure tax rates, pricing rules, and discount settings for your invoices.
      </Typography>

      <Paper variant="outlined">
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab
              label="Tax Configuration"
              icon={<IconCalculator />}
              iconPosition="start"
            />
            <Tab
              label="Pricing Preview"
              icon={<IconReceipt />}
              iconPosition="start"
            />
          </Tabs>
        </Box>

        <TabPanel value={activeTab} index={0}>
          <Box p={3}>
            <Alert severity="info" sx={{ mb: 3 }}>
              Configure your tax rates and calculation methods. These settings will be applied to all new invoices.
            </Alert>
            
            <TaxCalculator
              taxConfig={taxConfig}
              onTaxConfigChange={handleTaxConfigChange}
              invoiceItems={sampleItems}
              subtotal={subtotal}
              currency="USD"
            />
          </Box>
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <Box p={3}>
            <Alert severity="info" sx={{ mb: 3 }}>
              Preview how your tax and pricing settings will appear on invoices using sample data.
            </Alert>
            
            <Grid container spacing={3}>
              <Grid item xs={12} lg={8}>
                <Typography variant="h6" gutterBottom>
                  Sample Invoice Items
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                  <Stack spacing={2}>
                    {sampleItems.map((item, index) => (
                      <Box
                        key={index}
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                        py={1}
                      >
                        <Box>
                          <Typography variant="body1" fontWeight={500}>
                            {item.itemName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            ${item.unitPrice} × {item.units} units
                          </Typography>
                        </Box>
                        <Typography variant="body1" fontWeight={500}>
                          ${item.unitTotalPrice}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Paper>
              </Grid>
              
              <Grid item xs={12} lg={4}>
                <PricingBreakdown
                  items={sampleItems}
                  discounts={sampleDiscounts}
                  taxConfig={taxConfig}
                  currency="USD"
                  showDetails={true}
                />
              </Grid>
            </Grid>
          </Box>
        </TabPanel>
      </Paper>

      <Snackbar
        open={showSnackbar}
        autoHideDuration={3000}
        onClose={() => setShowSnackbar(false)}
        message={snackbarMessage}
      />
    </Box>
  );
};

export default InvoicePricing;