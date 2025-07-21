import React from 'react';
import Button from '@mui/material/Button';
import { styled } from '@mui/material/styles';
import { motion } from 'framer-motion';
import CTAButton from '@/app/components/shared/CTAButton';
import { navigationConfig, useActiveSection, smoothScrollTo } from '@/utils/navigation';

const Navigations = () => {
    const sections = navigationConfig.main
        .filter(item => !item.external)
        .map(item => item.href);
    const activeSection = useActiveSection(sections);

    const StyledButton = styled(Button)<{ isActive?: boolean }>(({ theme, isActive }) => ({
        fontSize: '16px',
        color: isActive ? theme.palette.primary.main : theme.palette.text.secondary,
        fontWeight: isActive ? 600 : 500,
        textTransform: 'none',
        padding: '8px 16px',
        borderRadius: theme.spacing(1),
        position: 'relative',
        transition: 'all 0.3s ease',
        '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
            color: theme.palette.primary.main,
        },
        '&::after': {
            content: '""',
            position: 'absolute',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: isActive ? '80%' : '0%',
            height: '2px',
            backgroundColor: theme.palette.primary.main,
            transition: 'width 0.3s ease',
        },
    }));

    const handleNavClick = (item: typeof navigationConfig.main[0]) => (e: React.MouseEvent) => {
        if (!item.external && item.href.startsWith('#')) {
            e.preventDefault();
            smoothScrollTo(item.href);
        }
    };

    return (
        <>
            {navigationConfig.main.map((item, index) => (
                <motion.div
                    key={item.label}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.3 }}
                >
                    <StyledButton
                        color="inherit"
                        variant="text"
                        href={item.href}
                        onClick={handleNavClick(item)}
                        isActive={!item.external && activeSection === item.href}
                    >
                        {item.label}
                    </StyledButton>
                </motion.div>
            ))}

            {/* Login Button */}
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, duration: 0.3 }}
            >
                <Button
                    href={navigationConfig.cta.login.href}
                    variant="outlined"
                    color="primary"
                    size="medium"
                    sx={{
                        textTransform: 'none',
                        fontWeight: 500,
                        borderRadius: 2,
                        px: 3,
                        mr: 1,
                        '&:hover': {
                            backgroundColor: 'primary.main',
                            color: 'white',
                            borderColor: 'primary.main',
                        },
                    }}
                >
                    {navigationConfig.cta.login.label}
                </Button>
            </motion.div>

            {/* Primary CTA Button */}
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4, duration: 0.3 }}
            >
                <CTAButton
                    href={navigationConfig.cta.primary.href}
                    variant="contained"
                    color="primary"
                    size="medium"
                >
                    {navigationConfig.cta.primary.label}
                </CTAButton>
            </motion.div>
        </>
    );
};

export default Navigations;
