"use client";
import React, { useState, useContext, useEffect } from "react";
import { InvoiceContext } from "@/app/context/InvoiceContext";
import {
  Alert,
  Button,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  Box,
  Stack,
  Divider,
  Grid,
  Chip,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
} from "@mui/material";
import { usePathname, useRouter } from "next/navigation";
import { format, isValid } from "date-fns";
import {
  IconPlus,
  IconSquareRoundedPlus,
  IconTrash,
  IconPackage,
  IconEdit,
  IconCalculator,
  IconDiscount,
  IconCurrencyDollar,
} from "@tabler/icons-react";
import CustomFormLabel from "@/app/components/forms/theme-elements/CustomFormLabel";
import CustomSelect from "@/app/components/forms/theme-elements/CustomSelect";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";

// Import our enhanced components
import ProductSelector from "@/app/components/apps/invoice/ProductSelector";
import TaxCalculator from "@/app/components/apps/invoice/TaxCalculator";
import DiscountManager from "@/app/components/apps/invoice/DiscountManager";
import PricingBreakdown from "@/app/components/apps/invoice/PricingBreakdown";

// Import types
import { 
  InvoiceCreateFormData, 
  InvoiceItem, 
  InvoiceDiscount, 
  InvoiceTaxConfig 
} from "@/app/(DashboardLayout)/types/apps/invoice";

const EnhancedEditInvoice = () => {
  const { invoices, updateInvoice } = useContext(InvoiceContext);
  const [showAlert, setShowAlert] = useState(false);
  const [editing, setEditing] = useState(false);
  const router = useRouter();
  const pathName = usePathname();
  const getTitle = pathName.split("/").pop();
  
  // Product selection states
  const [productSelectorOpen, setProductSelectorOpen] = useState(false);
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);
  
  // Tax and discount dialog states
  const [taxDialogOpen, setTaxDialogOpen] = useState(false);
  const [discountDialogOpen, setDiscountDialogOpen] = useState(false);
  
  // Manual override states
  const [showManualTaxOverride, setShowManualTaxOverride] = useState(false);

  // Enhanced form data with new features
  const [formData, setFormData] = useState<InvoiceCreateFormData>({
    id: 0,
    billFrom: "",
    billTo: "",
    totalCost: 0,
    status: "Pending",
    billFromAddress: "",
    billToAddress: "",
    orders: [{ 
      itemName: "", 
      unitPrice: 0, 
      units: 1, 
      unitTotalPrice: 0,
      productId: "",
      sku: "",
      description: "",
    }],
    vat: 0, // Keep for backward compatibility
    tax: 0, // New tax field
    grandTotal: 0,
    subtotal: 0,
    date: new Date().toISOString().split("T")[0],
    template: "ecommerce",
    
    // Enhanced features
    discounts: [],
    taxConfig: {
      type: "exclusive",
      rates: [
        {
          name: "Standard Tax",
          rate: 10,
          appliedTo: ["all"],
        },
      ],
    },
    subtotalBeforeDiscount: 0,
    totalDiscount: 0,
    notes: "",
  });

  // Load existing invoice data on component mount
  useEffect(() => {
    if (invoices.length > 0) {
      // Find the invoice to edit
      let selectedInvoice;
      if (getTitle) {
        selectedInvoice = invoices.find(
          (inv: any) => inv.billFrom === getTitle || inv.id.toString() === getTitle
        );
        if (!selectedInvoice) {
          selectedInvoice = invoices[0]; // Fallback to first invoice
        }
      } else {
        selectedInvoice = invoices[0];
      }

      if (selectedInvoice) {
        // Convert legacy invoice data to enhanced form data
        const enhancedData: InvoiceCreateFormData = {
          id: selectedInvoice.id,
          billFrom: selectedInvoice.billFrom || "",
          billTo: selectedInvoice.billTo || "",
          totalCost: selectedInvoice.totalCost || 0,
          status: selectedInvoice.status || "Pending",
          billFromAddress: selectedInvoice.billFromAddress || "",
          billToAddress: selectedInvoice.billToAddress || "",
          orders: selectedInvoice.orders || [],
          vat: selectedInvoice.vat || 0,
          tax: selectedInvoice.tax || selectedInvoice.vat || 0,
          grandTotal: selectedInvoice.grandTotal || 0,
          subtotal: selectedInvoice.subtotal || selectedInvoice.totalCost || 0,
          date: selectedInvoice.orderDate 
            ? new Date(selectedInvoice.orderDate).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0],
          template: selectedInvoice.template || "ecommerce",
          
          // Enhanced features (use existing or defaults)
          discounts: selectedInvoice.discounts || [],
          taxConfig: selectedInvoice.taxConfig || {
            type: "exclusive",
            rates: [
              {
                name: "Standard Tax",
                rate: 10,
                appliedTo: ["all"],
              },
            ],
          },
          subtotalBeforeDiscount: selectedInvoice.subtotalBeforeDiscount || selectedInvoice.totalCost || 0,
          totalDiscount: selectedInvoice.totalDiscount || 0,
          notes: selectedInvoice.notes || "",
          manualTaxOverride: selectedInvoice.manualTaxOverride,
        };

        setFormData(enhancedData);
        setEditing(true);
      }
    }
  }, [getTitle, invoices]);

  // Enhanced calculation function (same as create invoice)
  const calculateTotals = (orders: InvoiceItem[], discounts: InvoiceDiscount[], taxConfig: InvoiceTaxConfig) => {
    // Calculate subtotal
    let subtotal = 0;
    orders.forEach((order) => {
      const unitPrice = parseFloat(order.unitPrice.toString()) || 0;
      const units = parseInt(order.units.toString()) || 0;
      const totalCost = unitPrice * units;
      
      subtotal += totalCost;
      order.unitTotalPrice = totalCost;
    });

    // Calculate total discount amount
    const calculateDiscountAmount = (discount: InvoiceDiscount): number => {
      if (discount.type === "percentage") {
        return (subtotal * discount.value) / 100;
      } else {
        return discount.value;
      }
    };

    const totalDiscountAmount = discounts.reduce((sum, discount) => {
      return sum + calculateDiscountAmount(discount);
    }, 0);

    // Calculate subtotal after discounts
    const subtotalAfterDiscount = subtotal - totalDiscountAmount;

    // Calculate tax amount
    const calculateTaxForItem = (item: InvoiceItem): number => {
      const applicableTaxRates = taxConfig.rates.filter(rate =>
        rate.appliedTo.includes("all") || 
        rate.appliedTo.includes(item.productId || "")
      );

      const totalTaxRate = applicableTaxRates.reduce((sum, rate) => sum + rate.rate, 0);
      
      if (taxConfig.type === "inclusive") {
        return (item.unitTotalPrice * totalTaxRate) / (100 + totalTaxRate);
      } else {
        return (item.unitTotalPrice * totalTaxRate) / 100;
      }
    };

    const totalTaxAmount = orders.reduce((sum, item) => {
      return sum + calculateTaxForItem(item);
    }, 0);

    // Calculate final total
    const grandTotal = taxConfig.type === "inclusive" 
      ? subtotalAfterDiscount 
      : subtotalAfterDiscount + totalTaxAmount;

    return { 
      subtotal, 
      subtotalBeforeDiscount: subtotal,
      totalDiscount: totalDiscountAmount,
      vat: totalTaxAmount, // Keep for compatibility
      tax: totalTaxAmount,
      grandTotal,
      totalCost: subtotal
    };
  };

  const handleChange = (e: { target: { name: any; value: any } }) => {
    const { name, value } = e.target;
    setFormData((prevData) => {
      const newFormData = { ...prevData, [name]: value };
      const totals = calculateTotals(newFormData.orders, newFormData.discounts, newFormData.taxConfig);
      return {
        ...newFormData,
        ...totals,
      };
    });
  };

  const handleOrderChange = (index: number, field: string, value: any) => {
    setFormData((prevData) => {
      const updatedOrders = [...prevData.orders];
      updatedOrders[index] = {
        ...updatedOrders[index],
        [field]: value,
      };
      const totals = calculateTotals(updatedOrders, prevData.discounts, prevData.taxConfig);
      return {
        ...prevData,
        orders: updatedOrders,
        ...totals,
      };
    });
  };

  const handleAddItem = () => {
    setFormData((prevData) => {
      const updatedOrders = [
        ...prevData.orders,
        { 
          itemName: "", 
          unitPrice: 0, 
          units: 1, 
          unitTotalPrice: 0,
          productId: "",
          sku: "",
          description: "",
        },
      ];
      const totals = calculateTotals(updatedOrders, prevData.discounts, prevData.taxConfig);
      return {
        ...prevData,
        orders: updatedOrders,
        ...totals,
      };
    });
  };

  const handleDeleteItem = (index: number) => {
    setFormData((prevData) => {
      const updatedOrders = prevData.orders.filter((_, i) => i !== index);
      const totals = calculateTotals(updatedOrders, prevData.discounts, prevData.taxConfig);
      return {
        ...prevData,
        orders: updatedOrders,
        ...totals,
      };
    });
  };

  const handleProductSelect = (product: InvoiceItem) => {
    if (activeItemIndex !== null) {
      handleOrderChange(activeItemIndex, "itemName", product.itemName);
      handleOrderChange(activeItemIndex, "unitPrice", product.unitPrice);
      handleOrderChange(activeItemIndex, "productId", product.productId);
      handleOrderChange(activeItemIndex, "sku", product.sku);
      handleOrderChange(activeItemIndex, "description", product.description);
      handleOrderChange(activeItemIndex, "image", product.image);
    }
    setProductSelectorOpen(false);
    setActiveItemIndex(null);
  };

  const openProductSelector = (index: number) => {
    setActiveItemIndex(index);
    setProductSelectorOpen(true);
  };

  const handleDiscountsChange = (discounts: InvoiceDiscount[]) => {
    setFormData((prevData) => {
      const totals = calculateTotals(prevData.orders, discounts, prevData.taxConfig);
      return {
        ...prevData,
        discounts,
        ...totals,
      };
    });
  };

  const handleTaxConfigChange = (taxConfig: InvoiceTaxConfig) => {
    setFormData((prevData) => {
      const totals = calculateTotals(prevData.orders, prevData.discounts, taxConfig);
      return {
        ...prevData,
        taxConfig,
        ...totals,
      };
    });
  };

  const handleManualTaxOverride = (amount: number) => {
    setFormData((prevData) => ({
      ...prevData,
      manualTaxOverride: amount,
      tax: amount,
      vat: amount, // Keep for compatibility
      grandTotal: prevData.subtotal - prevData.totalDiscount + amount,
    }));
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      // Convert enhanced form data to legacy format for backward compatibility
      const legacyInvoiceData = {
        ...formData,
        // Map enhanced fields to legacy fields
        vat: formData.tax,
        totalCost: formData.subtotal,
        orderDate: new Date(formData.date),
      };
      
      await updateInvoice(legacyInvoiceData);
      setEditing(false);
      setShowAlert(true);
      setTimeout(() => {
        setShowAlert(false);
      }, 5000);
      router.push("/apps/invoice/list");
    } catch (error) {
      console.error("Error updating invoice:", error);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    router.push("/apps/invoice/list");
  };

  const parsedDate = isValid(new Date(formData.date))
    ? new Date(formData.date)
    : new Date();
  const formattedOrderDate = format(parsedDate, "EEEE, MMMM dd, yyyy");

  return (
    <>
      <form onSubmit={handleSave}>
        <Box>
          <Stack
            direction="row"
            spacing={{ xs: 1, sm: 2, md: 4 }}
            justifyContent="space-between"
            mb={3}
          >
            <Typography variant="h5"># {formData.id}</Typography>
            <Box display="flex" gap={1}>
              {editing ? (
                <>
                  <Button type="submit" variant="contained" color="primary">
                    Save
                  </Button>
                  <Button variant="outlined" color="error" onClick={handleCancel}>
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  variant="contained"
                  color="info"
                  onClick={() => setEditing(true)}
                >
                  Edit Invoice
                </Button>
              )}
            </Box>
          </Stack>
          <Divider />
          
          <Stack
            direction="row"
            spacing={{ xs: 1, sm: 2, md: 4 }}
            justifyContent="space-between"
            alignItems="center"
            mb={3}
          >
            <Box>
              <CustomFormLabel htmlFor="demo-simple-select">
                Order Status
              </CustomFormLabel>
              <CustomSelect
                labelId="demo-simple-select-label"
                id="demo-simple-select"
                value={formData.status}
                onChange={(e: any) =>
                  setFormData({ ...formData, status: e.target.value })
                }
              >
                <MenuItem value="Pending">Pending</MenuItem>
                <MenuItem value="Shipped">Shipped</MenuItem>
                <MenuItem value="Delivered">Delivered</MenuItem>
              </CustomSelect>
            </Box>
            <Box textAlign="right">
              <CustomFormLabel htmlFor="demo-simple-select">
                Order Date
              </CustomFormLabel>
              <Typography variant="body1">{formattedOrderDate}</Typography>
            </Box>
          </Stack>
          <Divider />

          <Grid container spacing={3} mb={4}>
            <Grid item xs={12} sm={6}>
              <CustomFormLabel htmlFor="bill-from">Bill From</CustomFormLabel>
              <CustomTextField
                id="bill-from"
                name="billFrom"
                value={formData.billFrom}
                onChange={handleChange}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <CustomFormLabel
                htmlFor="bill-to"
                sx={{
                  mt: {
                    xs: 0,
                    sm: 3,
                  },
                }}
              >
                Bill To
              </CustomFormLabel>
              <CustomTextField
                name="billTo"
                value={formData.billTo}
                onChange={handleChange}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <CustomFormLabel
                htmlFor="From Address"
                sx={{
                  mt: 0,
                }}
              >
                From Address
              </CustomFormLabel>
              <CustomTextField
                name="billFromAddress"
                value={formData.billFromAddress}
                onChange={handleChange}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <CustomFormLabel
                htmlFor="Bill To Address"
                sx={{
                  mt: 0,
                }}
              >
                Bill To Address
              </CustomFormLabel>
              <CustomTextField
                name="billToAddress"
                value={formData.billToAddress}
                onChange={handleChange}
                fullWidth
              />
            </Grid>
          </Grid>

          {/* Enhanced Items Section */}
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            mb={2}
          >
            <Typography variant="h6">Items Details :</Typography>
            <Button
              onClick={handleAddItem}
              variant="contained"
              color="primary"
              startIcon={<IconPlus width={18} />}
            >
              Add Item
            </Button>
          </Stack>

          <Paper variant="outlined">
            <TableContainer sx={{ whiteSpace: { xs: "nowrap", md: "unset" } }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <Typography variant="h6" fontSize="14px">
                        Item Name
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="h6" fontSize="14px">
                        Unit Price
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="h6" fontSize="14px">
                        Units
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="h6" fontSize="14px">
                        Total Cost
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="h6" fontSize="14px">
                        Actions
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {formData.orders.map((order, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Box>
                          <Stack direction="row" spacing={2} alignItems="center">
                            <CustomTextField
                              type="text"
                              value={order.itemName}
                              placeholder="Item Name"
                              onChange={(e: any) =>
                                handleOrderChange(index, "itemName", e.target.value)
                              }
                              fullWidth
                            />
                            <Tooltip title="Select from Database">
                              <IconButton
                                onClick={() => openProductSelector(index)}
                                color="primary"
                                size="small"
                              >
                                <IconPackage width={20} />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                          {order.sku && (
                            <Chip
                              label={`SKU: ${order.sku}`}
                              size="small"
                              variant="outlined"
                              sx={{ mt: 1 }}
                            />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <CustomTextField
                          type="number"
                          value={order.unitPrice}
                          placeholder="Unit Price"
                          onChange={(e: any) =>
                            handleOrderChange(
                              index,
                              "unitPrice",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          fullWidth
                        />
                      </TableCell>
                      <TableCell>
                        <CustomTextField
                          type="number"
                          value={order.units}
                          placeholder="Units"
                          onChange={(e: any) =>
                            handleOrderChange(
                              index, 
                              "units", 
                              parseInt(e.target.value) || 1
                            )
                          }
                          fullWidth
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body1" fontWeight="500">
                          ${order.unitTotalPrice.toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          <Tooltip title="Add Item">
                            <IconButton onClick={handleAddItem} color="primary" size="small">
                              <IconSquareRoundedPlus width={20} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Item">
                            <IconButton
                              onClick={() => handleDeleteItem(index)}
                              color="error"
                              size="small"
                            >
                              <IconTrash width={20} />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* Enhanced Totals Section */}
          <Grid container spacing={3} mt={3}>
            <Grid item xs={12} md={8}>
              {/* Tax and Discount Configuration */}
              <Stack spacing={2}>
                <Card variant="outlined">
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                      <Typography variant="h6">Tax Configuration</Typography>
                      <Button
                        startIcon={<IconCalculator />}
                        onClick={() => setTaxDialogOpen(true)}
                        variant="outlined"
                        size="small"
                      >
                        Configure Tax
                      </Button>
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      Current: {formData.taxConfig.rates.length} tax rate(s) configured
                    </Typography>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={showManualTaxOverride}
                          onChange={(e) => setShowManualTaxOverride(e.target.checked)}
                        />
                      }
                      label="Manual Tax Override"
                    />
                    {showManualTaxOverride && (
                      <TextField
                        label="Tax Amount"
                        type="number"
                        value={formData.manualTaxOverride || formData.tax}
                        onChange={(e) => handleManualTaxOverride(parseFloat(e.target.value) || 0)}
                        size="small"
                        sx={{ mt: 1 }}
                      />
                    )}
                  </CardContent>
                </Card>

                <Card variant="outlined">
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                      <Typography variant="h6">Discount Management</Typography>
                      <Button
                        startIcon={<IconDiscount />}
                        onClick={() => setDiscountDialogOpen(true)}
                        variant="outlined"
                        size="small"
                      >
                        Manage Discounts
                      </Button>
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      Current: {formData.discounts.length} discount(s) applied
                    </Typography>
                  </CardContent>
                </Card>
              </Stack>
            </Grid>

            <Grid item xs={12} md={4}>
              {/* Enhanced Pricing Breakdown */}
              <PricingBreakdown
                items={formData.orders}
                discounts={formData.discounts}
                taxConfig={formData.taxConfig}
                currency="USD"
                showDetails={true}
              />
            </Grid>
          </Grid>

          {/* Notes Section */}
          <Box mt={3}>
            <CustomFormLabel htmlFor="notes">Additional Notes</CustomFormLabel>
            <CustomTextField
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              multiline
              rows={3}
              fullWidth
              placeholder="Add any additional notes or comments..."
            />
          </Box>

          {showAlert && (
            <Alert
              severity="success"
              sx={{ position: "fixed", top: 16, right: 16 }}
            >
              Invoice updated successfully.
            </Alert>
          )}
        </Box>
      </form>

      {/* Product Selector Dialog */}
      <ProductSelector
        open={productSelectorOpen}
        onClose={() => {
          setProductSelectorOpen(false);
          setActiveItemIndex(null);
        }}
        onProductSelect={handleProductSelect}
        selectedProducts={formData.orders}
      />

      {/* Tax Configuration Dialog */}
      <Dialog open={taxDialogOpen} onClose={() => setTaxDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Tax Configuration</DialogTitle>
        <DialogContent>
          <TaxCalculator
            taxConfig={formData.taxConfig}
            onTaxConfigChange={handleTaxConfigChange}
            invoiceItems={formData.orders}
            subtotal={formData.subtotal}
            currency="USD"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTaxDialogOpen(false)}>Done</Button>
        </DialogActions>
      </Dialog>

      {/* Discount Management Dialog */}
      <Dialog open={discountDialogOpen} onClose={() => setDiscountDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Discount Management</DialogTitle>
        <DialogContent>
          <DiscountManager
            discounts={formData.discounts}
            onDiscountsChange={handleDiscountsChange}
            subtotal={formData.subtotal}
            currency="USD"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDiscountDialogOpen(false)}>Done</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default EnhancedEditInvoice;