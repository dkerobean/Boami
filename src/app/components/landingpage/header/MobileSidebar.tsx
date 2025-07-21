import React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import { styled } from '@mui/material/styles';
import { motion } from 'framer-motion';
import Logo from "@/app/(DashboardLayout)/layout/shared/logo/Logo";
import CTAButton from '@/app/components/shared/CTAButton';

const MobileSidebar = () => {
    const StyledButton = styled(Button)(({ theme }) => ({
        justifyContent: 'flex-start',
        textAlign: 'left',
        fontSize: '16px',
        fontWeight: 500,
        textTransform: 'none',
        padding: '12px 0',
        color: theme.palette.text.primary,
        '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
            color: theme.palette.primary.main,
        },
    }));

    const handleNavClick = (item: { label: string; href: string; external?: boolean }) => (e: React.MouseEvent) => {
        if (!item.external && item.href.startsWith('#')) {
            e.preventDefault();
            const element = document.querySelector(item.href);
            if (element) {
                element.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                });
            }
        }
    };

    const navigationItems = [
        { label: 'Features', href: '#features' },
        { label: 'Pricing', href: '#pricing' },
        { label: 'Resources', href: '/resources', external: true },
        { label: 'Support', href: '/support', external: true },
        { label: 'About', href: '/about', external: true },
        { label: 'Blog', href: '/blog', external: true },
        { label: 'Contact', href: '/contact', external: true },
    ];

    return (
        <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
        >
            <Box px={3} py={2}>
                <Logo />
            </Box>

            <Divider />

            <Box p={3}>
                <Stack direction="column" spacing={1}>
                    {navigationItems.map((item, index) => (
                        <motion.div
                            key={item.label}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1, duration: 0.3 }}
                        >
                            <StyledButton
                                color="inherit"
                                href={item.href}
                                onClick={handleNavClick(item)}
                                fullWidth
                            >
                                {item.label}
                            </StyledButton>
                        </motion.div>
                    ))}

                    <Box mt={3}>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4, duration: 0.3 }}
                        >
                            <CTAButton
                                href="/auth/auth1/register"
                                variant="contained"
                                color="primary"
                                size="large"
                                fullWidth
                            >
                                Start Free Trial
                            </CTAButton>
                        </motion.div>
                    </Box>

                    <Box mt={2}>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5, duration: 0.3 }}
                        >
                            <CTAButton
                                href="/demo"
                                variant="outlined"
                                color="primary"
                                size="large"
                                fullWidth
                            >
                                Request Demo
                            </CTAButton>
                        </motion.div>
                    </Box>

                    <Box mt={2}>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6, duration: 0.3 }}
                        >
                            <Button
                                href="/auth/auth1/login"
                                variant="text"
                                color="primary"
                                size="large"
                                fullWidth
                                sx={{
                                    textTransform: 'none',
                                    fontWeight: 500,
                                    '&:hover': {
                                        backgroundColor: 'rgba(25, 118, 210, 0.04)',
                                    },
                                }}
                            >
                                Login to Dashboard
                            </Button>
                        </motion.div>
                    </Box>
                </Stack>
            </Box>
        </motion.div>
    );
};

export default MobileSidebar;
