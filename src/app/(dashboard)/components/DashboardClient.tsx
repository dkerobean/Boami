"use client";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import { styled, useTheme } from "@mui/material/styles";
import React, { useState } from "react";
import Header from "../layout/vertical/header/Header";
import Sidebar from "../layout/vertical/sidebar/Sidebar";
import Customizer from "../layout/shared/customizer/Customizer";
import Navigation from "../layout/horizontal/navbar/Navigation";
import HorizontalHeader from "../layout/horizontal/header/Header";
import { useSelector } from "@/store/hooks";
import { AppState } from "@/store/store";
import { useDashboardLoading } from "@/hooks/useDashboardLoading";
import { useAuthContext } from "@/app/context/AuthContext";
import { InvoiceProvider } from "@/app/context/InvoiceContext";
import { ProtectedRoute } from "@/app/components/shared/ProtectedRoute";
import { AuthLoading } from "@/app/components/shared/AuthLoading";
import { ErrorBoundary } from "@/app/components/shared/ErrorBoundary";

const MainWrapper = styled("div")(() => ({
  display: "flex",
  minHeight: "100vh",
  width: "100%",
}));

const PageWrapper = styled("div")(() => ({
  display: "flex",
  flexGrow: 1,
  paddingBottom: "60px",
  flexDirection: "column",
  zIndex: 1,
  width: "100%",
  backgroundColor: "transparent",
}));

interface DashboardClientProps {
  children: React.ReactNode;
}

export default function DashboardClient({ children }: DashboardClientProps) {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const customizer = useSelector((state: AppState) => state.customizer);
  const theme = useTheme();
  const { isLoading, error } = useAuthContext();

  // Initialize dashboard loading for sub-menu navigation
  useDashboardLoading();

  // Authentication loading fallback
  const authLoadingFallback = (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      flexDirection="column"
    >
      <AuthLoading
        type="security"
        message="Verifying access permissions..."
        size="large"
      />
    </Box>
  );

  return (
    <ErrorBoundary>
      <ProtectedRoute
        fallback={authLoadingFallback}
        showFallback={true}
      >
        <InvoiceProvider>
          <MainWrapper className={customizer.activeMode === 'dark' ? 'darkbg mainwrapper' : 'mainwrapper'}>
          {/* ------------------------------------------- */}
          {/* Sidebar */}
          {/* ------------------------------------------- */}
          {customizer.isHorizontal ? "" : <Sidebar />}
          {/* ------------------------------------------- */}
          {/* Main Wrapper */}
          {/* ------------------------------------------- */}
          <PageWrapper
            className="page-wrapper"
            sx={{
              ...(customizer.isCollapse && {
                [theme.breakpoints.up("lg")]: {
                  ml: `${customizer.MiniSidebarWidth}px`,
                },
              }),
            }}
          >
            {/* ------------------------------------------- */}
            {/* Header */}
            {/* ------------------------------------------- */}
            {customizer.isHorizontal ? <HorizontalHeader /> : <Header />}
            {/* PageContent */}
            {customizer.isHorizontal ? <Navigation /> : ""}
            <Container
              sx={{
                pt: '30px',
                maxWidth: customizer.isLayout === "boxed" ? "lg" : "100%!important",
              }}
            >
              {/* ------------------------------------------- */}
              {/* PageContent */}
              {/* ------------------------------------------- */}

              <Box sx={{ minHeight: "calc(100vh - 170px)" }}>
                {/* Show loading state during authentication checks */}
                {isLoading ? (
                  <Box
                    display="flex"
                    justifyContent="center"
                    alignItems="center"
                    minHeight="200px"
                  >
                    <AuthLoading
                      type="refresh"
                      message="Loading dashboard..."
                      size="medium"
                    />
                  </Box>
                ) : (
                  children
                )}
              </Box>

              {/* ------------------------------------------- */}
              {/* End Page */}
              {/* ------------------------------------------- */}
            </Container>
            <Customizer />
          </PageWrapper>
        </MainWrapper>
        </InvoiceProvider>
      </ProtectedRoute>
    </ErrorBoundary>
  );
}