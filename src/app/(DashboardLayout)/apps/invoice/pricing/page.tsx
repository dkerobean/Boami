import React from "react";
import Breadcrumb from "@/app/(DashboardLayout)/layout/shared/breadcrumb/Breadcrumb";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import { CardContent } from "@mui/material";
import InvoicePricing from "@/app/components/apps/invoice/pricing/InvoicePricing";

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
    title: "Pricing & Tax",
  },
];

const InvoicePricingPage = () => {
  return (
    <PageContainer title="Invoice Pricing & Tax" description="Manage tax rates and pricing settings">
      <Breadcrumb title="Pricing & Tax Settings" items={BCrumb} />
      <BlankCard>
        <CardContent>
          <InvoicePricing />
        </CardContent>
      </BlankCard>
    </PageContainer>
  );
};

export default InvoicePricingPage;