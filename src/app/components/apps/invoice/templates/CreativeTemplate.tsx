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
import Logo from "@/app/(DashboardLayout)/layout/shared/logo/Logo";
import { InvoiceList } from "@/app/(DashboardLayout)/types/apps/invoice";

interface CreativeTemplateProps {
  invoice: InvoiceList;
  logoUrl?: string;
}

const CreativeTemplate: React.FC<CreativeTemplateProps> = ({ invoice, logoUrl }) => {
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
        fontFamily: "Poppins, sans-serif",
        position: "relative",
        overflow: "hidden",
        "@media print": {
          p: 2,
          boxShadow: "none",
          bgcolor: "white",
        },
      }}
    >
      {/* Creative Background Elements */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          right: 0,
          width: "300px",
          height: "300px",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          opacity: 0.1,
          borderRadius: "50%",
          transform: "translate(50%, -50%)",
          zIndex: 0,
        }}
      />
      <Box
        sx={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: "200px",
          height: "200px",
          background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
          opacity: 0.1,
          borderRadius: "50%",
          transform: "translate(-50%, 50%)",
          zIndex: 0,
        }}
      />

      {/* Creative Header */}
      <Box sx={{ position: "relative", zIndex: 1 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems="center"
          justifyContent="space-between"
          mb={4}
          sx={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            borderRadius: 3,
            p: 3,
            color: "white",
          }}
        >
          <Box>
            <Box sx={{ filter: logoUrl ? "none" : "brightness(0) invert(1)" }}>
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
                    borderColor: 'rgba(255,255,255,0.5)',
                    borderRadius: 1,
                    bgcolor: 'rgba(255,255,255,0.1)',
                  }}
                >
                  <Typography variant="caption" color="white" fontWeight="bold">
                    No Logo Set
                  </Typography>
                </Box>
              )}
            </Box>
            <Typography
              variant="h3"
              fontWeight={700}
              sx={{ 
                mt: 2,
                background: "linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                textShadow: "0 2px 4px rgba(0,0,0,0.1)",
              }}
            >
              INVOICE
            </Typography>
          </Box>

          <Box textAlign={{ xs: "center", sm: "right" }} color="white">
            <Box
              sx={{
                bgcolor: "rgba(255,255,255,0.2)",
                borderRadius: 2,
                p: 2,
                backdropFilter: "blur(10px)",
              }}
            >
              <Typography variant="h5" fontWeight={600} mb={1}>
                #{invoice.id}
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9 }}>
                {orderDate}
              </Typography>
              <Box sx={{ mt: 1 }}>
                {invoice.status === "Shipped" ? (
                  <Chip 
                    size="small" 
                    label={invoice.status}
                    sx={{ 
                      bgcolor: "#2196f3",
                      color: "white",
                      fontWeight: 600
                    }}
                  />
                ) : invoice.status === "Delivered" ? (
                  <Chip 
                    size="small" 
                    label={invoice.status}
                    sx={{ 
                      bgcolor: "#4caf50",
                      color: "white",
                      fontWeight: 600
                    }}
                  />
                ) : invoice.status === "Pending" ? (
                  <Chip 
                    size="small" 
                    label={invoice.status}
                    sx={{ 
                      bgcolor: "#ff9800",
                      color: "white",
                      fontWeight: 600
                    }}
                  />
                ) : (
                  ""
                )}
              </Box>
            </Box>
          </Box>
        </Stack>

        {/* Creative Billing Cards */}
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} sm={6}>
            <Box
              sx={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                borderRadius: 3,
                p: 3,
                color: "white",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  position: "absolute",
                  top: -20,
                  right: -20,
                  width: 80,
                  height: 80,
                  bgcolor: "rgba(255,255,255,0.1)",
                  borderRadius: "50%",
                }}
              />
              <Avatar
                sx={{
                  bgcolor: "rgba(255,255,255,0.2)",
                  mb: 2,
                  width: 56,
                  height: 56,
                }}
              >
                <Typography variant="h6" fontWeight={700}>
                  {invoice.billFrom.charAt(0)}
                </Typography>
              </Avatar>
              <Typography variant="h6" fontWeight={600} mb={2}>
                From
              </Typography>
              <Stack spacing={1}>
                <Typography variant="body1" fontWeight={500}>
                  {invoice.billFrom}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  {invoice.billFromEmail}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  {invoice.billFromAddress}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  📞 {invoice.billFromPhone}
                </Typography>
              </Stack>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Box
              sx={{
                background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                borderRadius: 3,
                p: 3,
                color: "white",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  position: "absolute",
                  top: -20,
                  right: -20,
                  width: 80,
                  height: 80,
                  bgcolor: "rgba(255,255,255,0.1)",
                  borderRadius: "50%",
                }}
              />
              <Avatar
                sx={{
                  bgcolor: "rgba(255,255,255,0.2)",
                  mb: 2,
                  width: 56,
                  height: 56,
                }}
              >
                <Typography variant="h6" fontWeight={700}>
                  {invoice.billTo.charAt(0)}
                </Typography>
              </Avatar>
              <Typography variant="h6" fontWeight={600} mb={2}>
                To
              </Typography>
              <Stack spacing={1}>
                <Typography variant="body1" fontWeight={500}>
                  {invoice.billTo}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  {invoice.billToEmail}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  {invoice.billToAddress}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  📞 {invoice.billToPhone}
                </Typography>
              </Stack>
            </Box>
          </Grid>
        </Grid>

        {/* Creative Items Table */}
        <Box mb={4}>
          <Typography 
            variant="h5" 
            fontWeight={700} 
            mb={3} 
            sx={{
              background: "linear-gradient(45deg, #667eea 30%, #764ba2 90%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              textAlign: "center",
            }}
          >
            💼 Items & Services
          </Typography>
          <TableContainer
            component={Paper}
            sx={{ 
              borderRadius: 3,
              overflow: "hidden",
              boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
            }}
          >
            <Table>
              <TableHead 
                sx={{ 
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                }}
              >
                <TableRow>
                  <TableCell sx={{ color: "white", fontWeight: 700 }}>
                    🏷️ Item
                  </TableCell>
                  <TableCell sx={{ color: "white", fontWeight: 700 }}>
                    💰 Price
                  </TableCell>
                  <TableCell sx={{ color: "white", fontWeight: 700 }}>
                    📦 Qty
                  </TableCell>
                  <TableCell align="right" sx={{ color: "white", fontWeight: 700 }}>
                    💸 Total
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {invoice.orders.map((order, index) => (
                  <TableRow
                    key={index}
                    sx={{
                      "&:nth-of-type(odd)": { 
                        bgcolor: "rgba(102, 126, 234, 0.05)" 
                      },
                      "&:hover": { 
                        bgcolor: "rgba(102, 126, 234, 0.1)",
                        transform: "scale(1.01)",
                        transition: "all 0.2s ease-in-out",
                      },
                    }}
                  >
                    <TableCell>
                      <Typography variant="body1" fontWeight={500}>
                        {order.itemName}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="primary">
                        ${parseFloat(order.unitPrice.toString()).toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={order.units}
                        sx={{
                          background: "linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)",
                          color: "white",
                          fontWeight: 600,
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body1" fontWeight={600} color="primary">
                        ${parseFloat(order.unitTotalPrice.toString()).toFixed(2)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        {/* Creative Totals Section */}
        <Box
          sx={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            borderRadius: 3,
            p: 4,
            color: "white",
          }}
        >
          <Grid container>
            <Grid item xs={12} sm={8}>
              <Typography variant="h6" fontWeight={600} mb={2}>
                🎉 Thank You!
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                We appreciate your business and look forward to working with you again.
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box
                sx={{
                  bgcolor: "rgba(255,255,255,0.1)",
                  borderRadius: 2,
                  p: 3,
                  backdropFilter: "blur(10px)",
                }}
              >
                <Stack spacing={2}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body1">
                      Subtotal:
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      ${parseFloat(invoice.totalCost.toString()).toFixed(2)}
                    </Typography>
                  </Box>
                  
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body1">
                      VAT:
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      ${parseFloat(invoice.vat.toString()).toFixed(2)}
                    </Typography>
                  </Box>
                  
                  <Divider sx={{ borderColor: "rgba(255,255,255,0.3)" }} />
                  
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="h6" fontWeight={700}>
                      💎 Total:
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

        {/* Creative Footer */}
        <Box
          sx={{
            mt: 4,
            p: 3,
            textAlign: "center",
            borderRadius: 2,
            bgcolor: "rgba(102, 126, 234, 0.05)",
          }}
        >
          <Typography variant="body1" fontWeight={600} color="primary" mb={1}>
            ✨ Designed with creativity in mind ✨
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Generated with love on {format(new Date(), "MMMM dd, yyyy")}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default CreativeTemplate;