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

interface CorporateTemplateProps {
  invoice: InvoiceList;
  logoUrl?: string;
}

const CorporateTemplate: React.FC<CorporateTemplateProps> = ({ invoice, logoUrl }) => {
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
        fontFamily: "Times New Roman, serif",
        "@media print": {
          p: 2,
          boxShadow: "none",
          bgcolor: "white",
        },
      }}
    >
      {/* Formal Header */}
      <Box
        sx={{
          textAlign: "center",
          mb: 4,
          border: "2px solid black",
          p: 3,
          bgcolor: "grey.100",
        }}
      >
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
        <Typography
          variant="h3"
          fontWeight={700}
          color="black"
          sx={{ mt: 2, letterSpacing: "0.1em" }}
        >
          INVOICE
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mt: 1 }}>
          Document Number: #{invoice.id}
        </Typography>
      </Box>

      {/* Date and Status Information */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6}>
          <Box sx={{ border: "1px solid black", p: 2 }}>
            <Typography variant="h6" fontWeight={600} mb={1}>
              Invoice Date:
            </Typography>
            <Typography variant="body1">{orderDate}</Typography>
          </Box>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Box sx={{ border: "1px solid black", p: 2, textAlign: "center" }}>
            <Typography variant="h6" fontWeight={600} mb={1}>
              Status:
            </Typography>
            {invoice.status === "Shipped" ? (
              <Chip size="medium" color="primary" label={invoice.status} />
            ) : invoice.status === "Delivered" ? (
              <Chip size="medium" color="success" label={invoice.status} />
            ) : invoice.status === "Pending" ? (
              <Chip size="medium" color="warning" label={invoice.status} />
            ) : (
              <Chip size="medium" color="default" label="Unknown" />
            )}
          </Box>
        </Grid>
      </Grid>

      {/* Formal Billing Information */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6}>
          <Box sx={{ border: "2px solid black", p: 3 }}>
            <Typography
              variant="h6"
              fontWeight={700}
              mb={2}
              sx={{ 
                textAlign: "center",
                bgcolor: "black",
                color: "white",
                p: 1,
                mx: -3,
                mt: -3,
                mb: 2
              }}
            >
              REMIT TO
            </Typography>
            <Stack spacing={1}>
              <Typography variant="body1" fontWeight={600}>
                {invoice.billFrom}
              </Typography>
              <Typography variant="body2">
                Email: {invoice.billFromEmail}
              </Typography>
              <Typography variant="body2">
                Address: {invoice.billFromAddress}
              </Typography>
              <Typography variant="body2">
                Telephone: {invoice.billFromPhone}
              </Typography>
              {invoice.billFromFax && (
                <Typography variant="body2">
                  Facsimile: {invoice.billFromFax}
                </Typography>
              )}
            </Stack>
          </Box>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Box sx={{ border: "2px solid black", p: 3 }}>
            <Typography
              variant="h6"
              fontWeight={700}
              mb={2}
              sx={{ 
                textAlign: "center",
                bgcolor: "black",
                color: "white",
                p: 1,
                mx: -3,
                mt: -3,
                mb: 2
              }}
            >
              BILL TO
            </Typography>
            <Stack spacing={1}>
              <Typography variant="body1" fontWeight={600}>
                {invoice.billTo}
              </Typography>
              <Typography variant="body2">
                Email: {invoice.billToEmail}
              </Typography>
              <Typography variant="body2">
                Address: {invoice.billToAddress}
              </Typography>
              <Typography variant="body2">
                Telephone: {invoice.billToPhone}
              </Typography>
              {invoice.billToFax && (
                <Typography variant="body2">
                  Facsimile: {invoice.billToFax}
                </Typography>
              )}
            </Stack>
          </Box>
        </Grid>
      </Grid>

      {/* Formal Items Table */}
      <Box mb={4}>
        <Typography 
          variant="h6" 
          fontWeight={700} 
          mb={2} 
          sx={{ 
            textAlign: "center",
            bgcolor: "black",
            color: "white",
            p: 1
          }}
        >
          STATEMENT OF CHARGES
        </Typography>
        <TableContainer
          component={Paper}
          variant="outlined"
          sx={{ border: "2px solid black" }}
        >
          <Table>
            <TableHead sx={{ bgcolor: "grey.200" }}>
              <TableRow>
                <TableCell sx={{ 
                  fontWeight: 700, 
                  fontSize: "0.9rem",
                  border: "1px solid black",
                  textAlign: "center"
                }}>
                  DESCRIPTION OF SERVICES/GOODS
                </TableCell>
                <TableCell sx={{ 
                  fontWeight: 700, 
                  fontSize: "0.9rem",
                  border: "1px solid black",
                  textAlign: "center"
                }}>
                  UNIT RATE
                </TableCell>
                <TableCell sx={{ 
                  fontWeight: 700, 
                  fontSize: "0.9rem",
                  border: "1px solid black",
                  textAlign: "center"
                }}>
                  QUANTITY
                </TableCell>
                <TableCell sx={{ 
                  fontWeight: 700, 
                  fontSize: "0.9rem",
                  border: "1px solid black",
                  textAlign: "center"
                }}>
                  TOTAL AMOUNT
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invoice.orders.map((order, index) => (
                <TableRow key={index}>
                  <TableCell sx={{ 
                    border: "1px solid black",
                    fontFamily: "Times New Roman, serif"
                  }}>
                    <Typography variant="body1">
                      {order.itemName}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ 
                    border: "1px solid black",
                    textAlign: "right",
                    fontFamily: "Times New Roman, serif"
                  }}>
                    <Typography variant="body2">
                      ${parseFloat(order.unitPrice.toString()).toFixed(2)}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ 
                    border: "1px solid black",
                    textAlign: "center",
                    fontFamily: "Times New Roman, serif"
                  }}>
                    <Typography variant="body2">{order.units}</Typography>
                  </TableCell>
                  <TableCell sx={{ 
                    border: "1px solid black",
                    textAlign: "right",
                    fontFamily: "Times New Roman, serif"
                  }}>
                    <Typography variant="body1" fontWeight={600}>
                      ${parseFloat(order.unitTotalPrice.toString()).toFixed(2)}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Formal Totals Section */}
      <Box sx={{ border: "2px solid black", p: 3 }}>
        <Grid container>
          <Grid item xs={12} sm={8}>
            <Typography variant="body2" color="text.secondary">
              Payment Terms: Net 30 Days
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              All amounts are in USD unless otherwise specified.
            </Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box sx={{ border: "1px solid black", p: 2 }}>
              <Stack spacing={2}>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body1" fontWeight={600}>
                    SUBTOTAL:
                  </Typography>
                  <Typography variant="body1">
                    ${parseFloat(invoice.totalCost.toString()).toFixed(2)}
                  </Typography>
                </Box>
                
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body1" fontWeight={600}>
                    VAT/TAX:
                  </Typography>
                  <Typography variant="body1">
                    ${parseFloat(invoice.vat.toString()).toFixed(2)}
                  </Typography>
                </Box>
                
                <Divider sx={{ borderColor: "black", borderWidth: 1 }} />
                
                <Box 
                  display="flex" 
                  justifyContent="space-between"
                  sx={{ 
                    bgcolor: "black",
                    color: "white",
                    p: 1,
                    mx: -2,
                    mb: -2
                  }}
                >
                  <Typography variant="h6" fontWeight={700}>
                    TOTAL AMOUNT DUE:
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

      {/* Formal Footer */}
      <Box
        sx={{
          mt: 4,
          pt: 3,
          borderTop: "2px solid black",
          textAlign: "center",
        }}
      >
        <Typography variant="body2" fontWeight={600}>
          This document constitutes a legal invoice for services rendered or goods delivered.
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
          Generated on {format(new Date(), "MMMM dd, yyyy 'at' HH:mm")}
        </Typography>
      </Box>
    </Box>
  );
};

export default CorporateTemplate;