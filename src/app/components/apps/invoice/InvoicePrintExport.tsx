"use client";
import React, { useRef } from "react";
import {
  Box,
  Button,
  Stack,
  MenuItem,
  Menu,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  IconPrinter,
  IconDownload,
  IconFileTypePdf,
  IconShare,
} from "@tabler/icons-react";
import { useReactToPrint } from "react-to-print";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { InvoiceList, TemplateType } from "@/app/(DashboardLayout)/types/apps/invoice";
import ModernBusinessTemplate from "./templates/ModernBusinessTemplate";
import CorporateTemplate from "./templates/CorporateTemplate";
import CreativeTemplate from "./templates/CreativeTemplate";

interface InvoicePrintExportProps {
  invoice: InvoiceList;
  template?: TemplateType;
}

const InvoicePrintExport: React.FC<InvoicePrintExportProps> = ({
  invoice,
  template = "modern",
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Invoice-${invoice.id}`,
  });

  const handleExportPDF = async () => {
    if (!printRef.current) return;

    try {
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`Invoice-${invoice.id}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Invoice #${invoice.id}`,
          text: `Invoice from ${invoice.billFrom} to ${invoice.billTo}`,
          url: window.location.href,
        });
      } catch (error) {
        console.error("Error sharing:", error);
      }
    } else {
      // Fallback: copy URL to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const renderTemplate = () => {
    switch (template) {
      case "corporate":
        return <CorporateTemplate invoice={invoice} />;
      case "creative":
        return <CreativeTemplate invoice={invoice} />;
      case "modern":
      default:
        return <ModernBusinessTemplate invoice={invoice} />;
    }
  };

  return (
    <Box>
      {/* Action Buttons */}
      <Stack direction="row" spacing={1} mb={3}>
        <Tooltip title="Print Invoice">
          <Button
            variant="contained"
            color="primary"
            startIcon={<IconPrinter />}
            onClick={handlePrint}
          >
            Print
          </Button>
        </Tooltip>

        <Tooltip title="Download as PDF">
          <Button
            variant="contained"
            color="secondary"
            startIcon={<IconFileTypePdf />}
            onClick={handleExportPDF}
          >
            PDF
          </Button>
        </Tooltip>

        <Tooltip title="Share Invoice">
          <IconButton
            color="primary"
            onClick={handleShare}
            sx={{ ml: 1 }}
          >
            <IconShare />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* Hidden printable content */}
      <Box
        ref={printRef}
        sx={{
          "@media print": {
            "& *": {
              visibility: "visible !important",
            },
            position: "absolute !important",
            top: 0,
            left: 0,
            width: "100% !important",
            height: "auto !important",
          },
        }}
      >
        {renderTemplate()}
      </Box>
    </Box>
  );
};

export default InvoicePrintExport;