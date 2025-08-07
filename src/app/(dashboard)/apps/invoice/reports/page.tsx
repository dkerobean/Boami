import React from "react";
import Breadcrumb from "@/app/(dashboard)/layout/shared/breadcrumb/Breadcrumb";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import { CardContent } from "@mui/material";
import InvoiceReports from "@/app/components/apps/invoice/reports/InvoiceReports";

const BCrumb = [
  {
    to: "/",
    title: "Home",
  },
  {
    to: "/apps/invoice/list",
    title: "Invoice",
  },
  {
    title: "Reports",
  },
];

const InvoiceReportsPage = () => {
  return (
    <PageContainer title="Invoice Reports" description="Analytics and reporting for invoice data">
      <Breadcrumb title="Invoice Reports & Analytics" items={BCrumb} />
      <BlankCard>
        <CardContent>
          <InvoiceReports />
        </CardContent>
      </BlankCard>
    </PageContainer>
  );
};

export default InvoiceReportsPage;