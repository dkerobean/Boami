import React from "react";
import Breadcrumb from "@/app/(dashboard)/layout/shared/breadcrumb/Breadcrumb";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import { CardContent } from "@mui/material";
import CompanySettings from "@/app/components/apps/invoice/company/CompanySettings";

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
    title: "Company Settings",
  },
];

const InvoiceCompanyPage = () => {
  return (
    <PageContainer title="Company Settings" description="Manage company information for invoices">
      <Breadcrumb title="Company Settings" items={BCrumb} />
      <BlankCard>
        <CardContent>
          <CompanySettings />
        </CardContent>
      </BlankCard>
    </PageContainer>
  );
};

export default InvoiceCompanyPage;