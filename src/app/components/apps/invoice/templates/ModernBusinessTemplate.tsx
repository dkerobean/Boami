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
} from "@mui/material";
import { format, isValid, parseISO } from "date-fns";
import Logo from "@/app/(DashboardLayout)/layout/shared/logo/Logo";
import { InvoiceList } from "@/app/(DashboardLayout)/types/apps/invoice";

interface ModernBusinessTemplateProps {
  invoice: InvoiceList;
}

const ModernBusinessTemplate: React.FC<ModernBusinessTemplateProps> = ({ invoice }) => {
  const orderDate = invoice.orderDate
    ? isValid(parseISO(invoice.orderDate.toString()))
      ? format(parseISO(invoice.orderDate.toString()), "EEEE, MMMM dd, yyyy")
      : "Invalid Date"
    : format(new Date(), "EEEE, MMMM dd, yyyy");

  return (
    <Box
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
      {/* Header Section */}
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
        <Box>
          <Logo />
          <Typography
            variant="h4"
            fontWeight={700}
            color="primary.main"
            sx={{ mt: 1 }}
          >
            INVOICE
          </Typography>
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

      {/* Billing Information */}
      <Grid container spacing={4} mb={4}>
        <Grid item xs={12} sm={6}>
          <Box
            sx={{
              border: "1px solid",
              borderColor: "grey.300",
              borderRadius: 2,
              p: 3,
              bgcolor: "grey.50",
            }}
          >
            <Typography
              variant="h6"
              fontWeight={600}
              color="primary.main"
              mb={2}
            >
              Bill From
            </Typography>
            <Stack spacing={0.5}>
              <Typography variant="body1" fontWeight={500}>
                {invoice.billFrom}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {invoice.billFromEmail}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {invoice.billFromAddress}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Phone: {invoice.billFromPhone}
              </Typography>
              {invoice.billFromFax && (
                <Typography variant="body2" color="text.secondary">
                  Fax: {invoice.billFromFax}
                </Typography>
              )}
            </Stack>
          </Box>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Box
            sx={{
              border: "1px solid",
              borderColor: "primary.main",
              borderRadius: 2,
              p: 3,
              bgcolor: "primary.light",
            }}
          >
            <Typography
              variant="h6"
              fontWeight={600}
              color="primary.main"
              mb={2}
            >
              Bill To
            </Typography>
            <Stack spacing={0.5}>
              <Typography variant="body1" fontWeight={500}>
                {invoice.billTo}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {invoice.billToEmail}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {invoice.billToAddress}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Phone: {invoice.billToPhone}
              </Typography>
              {invoice.billToFax && (
                <Typography variant="body2" color="text.secondary">
                  Fax: {invoice.billToFax}
                </Typography>
              )}
            </Stack>
          </Box>
        </Grid>
      </Grid>

      {/* Items Table */}
      <Box mb={4}>
        <Typography variant="h6" fontWeight={600} mb={2} color="text.primary">
          Items & Services
        </Typography>
        <TableContainer
          component={Paper}
          variant="outlined"
          sx={{ borderRadius: 2 }}
        >
          <Table>
            <TableHead sx={{ bgcolor: "primary.main" }}>
              <TableRow>
                <TableCell sx={{ color: "white", fontWeight: 600 }}>
                  Item Name
                </TableCell>
                <TableCell sx={{ color: "white", fontWeight: 600 }}>
                  Unit Price
                </TableCell>
                <TableCell sx={{ color: "white", fontWeight: 600 }}>
                  Quantity
                </TableCell>
                <TableCell align="right" sx={{ color: "white", fontWeight: 600 }}>
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
                    <Typography variant="body1" fontWeight={500}>
                      {order.itemName}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      ${parseFloat(order.unitPrice.toString()).toFixed(2)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{order.units}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body1" fontWeight={500}>
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
          <Grid item xs={12} sm={8}></Grid>
          <Grid item xs={12} sm={4}>
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
                  VAT:
                </Typography>
                <Typography variant="body1" fontWeight={500}>
                  ${parseFloat(invoice.vat.toString()).toFixed(2)}
                </Typography>
              </Box>
              
              <Divider />
              
              <Box display="flex" justifyContent="space-between">
                <Typography variant="h6" fontWeight={700} color="primary.main">
                  Grand Total:
                </Typography>
                <Typography variant="h6" fontWeight={700} color="primary.main">
                  ${parseFloat(invoice.grandTotal.toString()).toFixed(2)}
                </Typography>
              </Box>
            </Stack>
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
        <Typography variant="body2" color="text.secondary">
          Thank you for your business!
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
          This invoice was generated automatically by our system.
        </Typography>
      </Box>
    </Box>
  );
};

export default ModernBusinessTemplate;