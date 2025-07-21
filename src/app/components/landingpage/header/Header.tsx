import React, { useState, useEffect } from "react";
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import { Theme } from '@mui/material/styles';
import Toolbar from '@mui/material/Toolbar';
import useMediaQuery from '@mui/material/useMediaQuery';
import { styled } from '@mui/material/styles';
import { motion } from 'framer-motion';
import Logo from "@/app/(DashboardLayout)/layout/shared/logo/Logo";
import Navigations from "./Navigations";
import MobileSidebar from "./MobileSidebar";
import { IconMenu2 } from "@tabler/icons-react";

const LpHeader = () => {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      setScrolled(isScrolled);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const AppBarStyled = styled(AppBar)(({ theme }) => ({
    justifyContent: "center",
    [theme.breakpoints.up("lg")]: {
      minHeight: "80px",
    },
    [theme.breakpoints.down("lg")]: {
      minHeight: "64px",
    },
    backgroundColor: scrolled
      ? `rgba(255, 255, 255, 0.95)`
      : theme.palette.background.default,
    backdropFilter: scrolled ? 'blur(10px)' : 'none',
    borderBottom: scrolled
      ? `1px solid ${theme.palette.divider}`
      : 'none',
    transition: 'all 0.3s ease-in-out',
    boxShadow: scrolled
      ? theme.shadows[4]
      : theme.shadows[0],
  }));

  const ToolbarStyled = styled(Toolbar)(({ theme }) => ({
    width: "100%",
    paddingLeft: "0 !important",
    paddingRight: "0 !important",
    color: theme.palette.text.secondary,
    minHeight: 'inherit',
  }));

  const lgUp = useMediaQuery((theme: Theme) => theme.breakpoints.up("lg"));
  const lgDown = useMediaQuery((theme: Theme) => theme.breakpoints.down("lg"));

  const handleDrawerOpen = () => {
    setOpen(true);
  };

  const toggleDrawer = (newOpen: boolean) => () => {
    setOpen(newOpen);
  };

  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <AppBarStyled position="sticky">
        <Container maxWidth="lg">
          <ToolbarStyled>
            <motion.div
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              <Logo />
            </motion.div>
            <Box flexGrow={1} />
            {lgDown ? (
              <IconButton
                color="inherit"
                aria-label="menu"
                onClick={handleDrawerOpen}
                sx={{
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                  },
                }}
              >
                <IconMenu2 size="20" />
              </IconButton>
            ) : null}
            {lgUp ? (
              <Stack spacing={1} direction="row" alignItems="center">
                <Navigations />
              </Stack>
            ) : null}
          </ToolbarStyled>
        </Container>
        <Drawer
          anchor="left"
          open={open}
          variant="temporary"
          onClose={toggleDrawer(false)}
          PaperProps={{
            sx: {
              width: 270,
              border: "0 !important",
              boxShadow: (theme) => theme.shadows[8],
            },
          }}
        >
          <MobileSidebar />
        </Drawer>
      </AppBarStyled>
    </motion.div>
  );
};

export default LpHeader;
