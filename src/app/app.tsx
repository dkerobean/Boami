"use client";
import React from "react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import RTL from "@/app/(DashboardLayout)/layout/shared/customizer/RTL";
import { ThemeSettings } from "@/utils/theme/Theme";
import { useSelector } from 'react-redux';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter';
import { AppState } from "@/store/store";
import { LoadingProvider } from "@/app/components/shared/loading";
import { AuthProvider } from "@/app/context/AuthContext";
import "@/utils/i18n";
import "@/app/api/index";


const MyApp = ({ children }: { children: React.ReactNode }) => {
    const theme = ThemeSettings();
    const customizer = useSelector((state: AppState) => state.customizer);

    // Loading system configuration
    const loadingConfig = {
        minDisplayTime: 200,
        maxDisplayTime: 5000,
        animationType: 'circular' as const,
        showLogo: false,
        showText: false,
        fadeOutDuration: 150,
        size: 'medium' as const,
        color: 'primary' as const,
    };

    return (
        <>
            <AppRouterCacheProvider options={{ enableCssLayer: true }}>
                <ThemeProvider theme={theme}>
                    <RTL direction={customizer.activeDir}>
                        <CssBaseline />
                        <AuthProvider>
                            <LoadingProvider config={loadingConfig}>
                                {children}
                            </LoadingProvider>
                        </AuthProvider>
                    </RTL>
                </ThemeProvider>
            </AppRouterCacheProvider>
        </>
    );
};

export default MyApp;
