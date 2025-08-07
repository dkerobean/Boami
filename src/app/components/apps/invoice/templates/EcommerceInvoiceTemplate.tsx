"use client";
import React from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Divider,
  Grid,
  Stack,
  Avatar,
} from "@mui/material";
import { format, isValid, parseISO } from "date-fns";
import Logo from "@/app/(dashboard)/layout/shared/logo/Logo";
import { InvoiceList } from "@/app/(dashboard)/types/apps/invoice";

interface EcommerceInvoiceTemplateProps {
  invoice: InvoiceList;
  logoUrl?: string;
}

const EcommerceInvoiceTemplate: React.FC<EcommerceInvoiceTemplateProps> = ({ 
  invoice, 
  logoUrl 
}) => {
  const orderDate = invoice.orderDate
    ? isValid(parseISO(invoice.orderDate.toString()))
      ? format(parseISO(invoice.orderDate.toString()), "EEEE, MMMM dd, yyyy")
      : "Invalid Date"
    : format(new Date(), "EEEE, MMMM dd, yyyy");

  return (
    <Box
      className="invoice-template ecommerce-template"
      sx={{
        p: 4,
        bgcolor: "background.paper",
        maxWidth: "210mm",
        minHeight: "297mm",
        margin: "0 auto",
        fontFamily: "Inter, sans-serif",
        "@media print": {
          p: 2,
          boxShadow: "none",
          bgcolor: "white",
        },
      }}
    >
      {/* Header Section with Logo */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems="center"
        justifyContent="space-between"
        mb={4}
        sx={{
          borderBottom: "3px solid",
          borderColor: "primary.main",
          pb: 3,
        }}
      >
        <Box display="flex" alignItems="center" gap={2}>
          {logoUrl ? (
            <Box
              component="img"
              src={logoUrl}
              alt="Company Logo"
              sx={{
                maxHeight: 60,
                maxWidth: 120,
                objectFit: "contain",
              }}
            />
          ) : (
            <Box
              sx={{
                width: 120,
                height: 60,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px dashed',
                borderColor: 'divider',
                borderRadius: 1,
                bgcolor: 'grey.50',
              }}
            >
              <Typography variant="caption" color="text.secondary" fontWeight="bold">
                No Logo Set
              </Typography>
            </Box>
          )}
          <Box>
            <Typography
              variant="h4"
              fontWeight={700}
              color="primary.main"
              sx={{ letterSpacing: "0.05em" }}
            >
              INVOICE
            </Typography>
            <Typography variant="body2" color="text.secondary">
              E-commerce Professional Invoice
            </Typography>
          </Box>
        </Box>

        <Box textAlign={{ xs: "center", sm: "right" }}>
          <Typography variant="h5" fontWeight={600} mb={1}>
            # {invoice.id}
          </Typography>
          <Chip
            size="medium"
            color="primary"
            variant="outlined"
            label={orderDate}
            sx={{ mb: 1 }}
          />
          <Box>
            {invoice.status === "Shipped" ? (
              <Chip size="small" color="primary" label={invoice.status} />
            ) : invoice.status === "Delivered" ? (
              <Chip size="small" color="success" label={invoice.status} />
            ) : invoice.status === "Pending" ? (
              <Chip size="small" color="warning" label={invoice.status} />
            ) : (
              ""
            )}
          </Box>
        </Box>
      </Stack>

      {/* Company and Customer Information */}
      <Grid container spacing={4} mb={4}>
        <Grid item xs={12} sm={6}>
          <Box
            sx={{
              border: "1px solid",
              borderColor: "grey.300",
              borderRadius: 2,
              p: 3,
              bgcolor: "grey.50",
              height: "100%",
            }}
          >
            <Typography
              variant="h6"
              fontWeight={600}
              color="primary.main"
              mb={2}
              sx={{ 
                display: "flex", 
                alignItems: "center", 
                gap: 1 
              }}
            >
              🏪 From (Seller)
            </Typography>
            <Stack spacing={1}>
              <Typography variant="body1" fontWeight={600}>
                {invoice.billFrom}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                📧 {invoice.billFromEmail}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                📍 {invoice.billFromAddress}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                📞 {invoice.billFromPhone}
              </Typography>
              {invoice.billFromFax && (
                <Typography variant="body2" color="text.secondary">
                  📠 {invoice.billFromFax}
                </Typography>
              )}
            </Stack>
          </Box>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Box
            sx={{
              border: "2px solid",
              borderColor: "primary.main",
              borderRadius: 2,
              p: 3,
              bgcolor: "primary.light",
              height: "100%",
            }}
          >
            <Typography
              variant="h6"
              fontWeight={600}
              color="primary.main"
              mb={2}
              sx={{ 
                display: "flex", 
                alignItems: "center", 
                gap: 1 
              }}
            >
              👤 Bill To (Customer)
            </Typography>
            <Stack spacing={1}>
              <Typography variant="body1" fontWeight={600}>
                {invoice.billTo}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                📧 {invoice.billToEmail}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                📍 {invoice.billToAddress}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                📞 {invoice.billToPhone}
              </Typography>
              {invoice.billToFax && (
                <Typography variant="body2" color="text.secondary">
                  📠 {invoice.billToFax}
                </Typography>
              )}
            </Stack>
          </Box>
        </Grid>
      </Grid>

      {/* Items Table */}
      <Box mb={4}>
        <Typography 
          variant="h6" 
          fontWeight={600} 
          mb={2} 
          color="text.primary"
          sx={{ 
            display: "flex", 
            alignItems: "center", 
            gap: 1 
          }}
        >
          🛍️ Items & Products
        </Typography>
        <TableContainer
          component={Paper}
          variant="outlined"
          sx={{ 
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <Table>
            <TableHead sx={{ bgcolor: "primary.main" }}>
              <TableRow>
                <TableCell sx={{ color: "white", fontWeight: 600, minWidth: 200 }}>
                  Product
                </TableCell>
                <TableCell sx={{ color: "white", fontWeight: 600, textAlign: "center" }}>
                  Unit Price
                </TableCell>
                <TableCell sx={{ color: "white", fontWeight: 600, textAlign: "center" }}>
                  Qty
                </TableCell>
                <TableCell sx={{ color: "white", fontWeight: 600, textAlign: "right" }}>
                  Total
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invoice.orders.map((order, index) => (
                <TableRow
                  key={index}
                  sx={{
                    "&:nth-of-type(odd)": { bgcolor: "grey.50" },
                    "&:hover": { bgcolor: "grey.100" },
                  }}
                >
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Avatar
                        sx={{ 
                          bgcolor: "primary.light",
                          color: "primary.main",
                          width: 40,
                          height: 40,
                        }}
                      >
                        📦
                      </Avatar>
                      <Box>
                        <Typography variant="body1" fontWeight={500}>
                          {order.itemName}
                        </Typography>
                        {order.sku && (
                          <Typography variant="caption" color="text.secondary">
                            SKU: {order.sku}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ textAlign: "center" }}>
                    <Typography variant="body2" fontWeight={500}>
                      ${parseFloat(order.unitPrice.toString()).toFixed(2)}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ textAlign: "center" }}>
                    <Chip
                      size="small"
                      label={order.units}
                      sx={{
                        bgcolor: "primary.light",
                        color: "primary.main",
                        fontWeight: 600,
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ textAlign: "right" }}>
                    <Typography variant="body1" fontWeight={600} color="primary.main">
                      ${parseFloat(order.unitTotalPrice.toString()).toFixed(2)}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Totals Section */}
      <Box
        sx={{
          bgcolor: "grey.50",
          border: "1px solid",
          borderColor: "grey.300",
          borderRadius: 2,
          p: 3,
        }}
      >
        <Grid container>
          <Grid item xs={12} sm={7}>
            <Typography variant="h6" fontWeight={600} mb={2} color="primary.main">
              💼 Payment Information
            </Typography>
            <Stack spacing={1}>
              <Typography variant="body2" color="text.secondary">
                Payment Terms: Net 30 Days
              </Typography>
              <Typography variant="body2" color="text.secondary">
                All amounts are in USD unless otherwise specified.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Thank you for choosing our e-commerce store!
              </Typography>
            </Stack>
          </Grid>
          <Grid item xs={12} sm={5}>
            <Box
              sx={{
                bgcolor: "white",
                border: "1px solid",
                borderColor: "grey.300",
                borderRadius: 2,
                p: 2,
              }}
            >
              <Stack spacing={2}>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body1" color="text.secondary">
                    Subtotal:
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    ${parseFloat(invoice.totalCost.toString()).toFixed(2)}
                  </Typography>
                </Box>
                
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body1" color="text.secondary">
                    Tax (VAT):
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    ${parseFloat(invoice.vat.toString()).toFixed(2)}
                  </Typography>
                </Box>
                
                <Divider />
                
                <Box 
                  display="flex" 
                  justifyContent="space-between"
                  sx={{
                    bgcolor: "primary.main",
                    color: "white",
                    p: 1.5,
                    borderRadius: 1,
                    mx: -2,
                    mb: -2,
                  }}
                >
                  <Typography variant="h6" fontWeight={700}>
                    Total Amount:
                  </Typography>
                  <Typography variant="h6" fontWeight={700}>
                    ${parseFloat(invoice.grandTotal.toString()).toFixed(2)}
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Footer */}
      <Box
        sx={{
          mt: 4,
          pt: 3,
          borderTop: "1px solid",
          borderColor: "grey.300",
          textAlign: "center",
        }}
      >
        <Typography variant="body1" fontWeight={600} color="primary.main" mb={1}>
          🌟 Thank you for your business!
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={1}>
          For any questions about this invoice, please contact us.
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
          Invoice generated on {format(new Date(), "MMMM dd, yyyy 'at' HH:mm")}
        </Typography>
      </Box>
    </Box>
  );
};

export default EcommerceInvoiceTemplate;