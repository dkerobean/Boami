'use client'
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";

import ChildCard from "../../../../components/shared/ChildCard";
import {
  IconBriefcase,
  IconMail,
  IconMapPin,
  IconPhone,
} from "@tabler/icons-react";
import { useAuth } from "@/hooks/useAuth";

const IntroCard = () => {
  const { user, loading, error } = useAuth();

  const getDisplayName = () => {
    if (!user) return "Guest User";
    return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
  };


  if (loading) {
    return (
      <ChildCard>
        <Box display="flex" justifyContent="center" alignItems="center" height="200px">
          <CircularProgress />
        </Box>
      </ChildCard>
    );
  }

  if (error) {
    return (
      <ChildCard>
        <Alert severity="error">
          Error loading user information: {error}
        </Alert>
      </ChildCard>
    );
  }

  return (
    <ChildCard>
      <Typography fontWeight={600} variant="h4" mb={2}>
        Introduction
      </Typography>
      <Typography color="textSecondary" variant="subtitle2" mb={2}>
        Hello, I am {getDisplayName()}.
      </Typography>
      
      <>
        {user?.company && (
          <Stack direction="row" gap={2} alignItems="center" mb={3}>
            <IconBriefcase size="21" />
            <Typography variant="h6">{user.company}</Typography>
          </Stack>
        )}
        
        {user?.email && (
          <Stack direction="row" gap={2} alignItems="center" mb={3}>
            <IconMail size="21" />
            <Typography variant="h6">{user.email}</Typography>
          </Stack>
        )}
        
        {user?.phone && (
          <Stack direction="row" gap={2} alignItems="center" mb={3}>
            <IconPhone size="21" />
            <Typography variant="h6">{user.phone}</Typography>
          </Stack>
        )}
        
      </>
    </ChildCard>
  );
};

export default IntroCard;
