'use client';
import { Box, Typography, LinearProgress, Stack } from "@mui/material";
import { CheckCircle, RadioButtonUnchecked } from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
  met: boolean;
}

interface PasswordRequirementsProps {
  password: string;
  showStrengthMeter?: boolean;
}

const PasswordRequirements: React.FC<PasswordRequirementsProps> = ({ 
  password, 
  showStrengthMeter = true 
}) => {
  const theme = useTheme();


  // Define simplified password requirements
  const requirements: PasswordRequirement[] = [
    {
      label: "At least 8 characters",
      test: (pwd) => pwd.length >= 8,
      met: password.length >= 8
    },
    {
      label: "One uppercase letter (A-Z)",
      test: (pwd) => /[A-Z]/.test(pwd),
      met: /[A-Z]/.test(password)
    },
    {
      label: "One lowercase letter (a-z)",
      test: (pwd) => /[a-z]/.test(pwd),
      met: /[a-z]/.test(password)
    },
    {
      label: "One number (0-9)",
      test: (pwd) => /\d/.test(pwd),
      met: /\d/.test(password)
    }
  ];

  // Calculate password strength
  const metRequirements = requirements.filter(req => req.met).length;
  const strengthPercentage = (metRequirements / requirements.length) * 100;
  
  const getStrengthLabel = (): { label: string; color: string } => {
    if (strengthPercentage <= 25) return { label: 'Very Weak', color: theme.palette.error.main };
    if (strengthPercentage <= 50) return { label: 'Weak', color: theme.palette.warning.main };
    if (strengthPercentage <= 75) return { label: 'Good', color: theme.palette.info.main };
    return { label: 'Strong', color: theme.palette.success.main };
  };

  const strength = getStrengthLabel();

  return (
    <Box sx={{ mt: 2 }}>
      {showStrengthMeter && password.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="textSecondary">
              Password Strength
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ color: strength.color, fontWeight: 'medium' }}
            >
              {strength.label}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={strengthPercentage}
            sx={{
              height: 6,
              borderRadius: 3,
              backgroundColor: theme.palette.grey[200],
              '& .MuiLinearProgress-bar': {
                backgroundColor: strength.color,
                borderRadius: 3,
              },
            }}
          />
        </Box>
      )}
      
      <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
        Password Requirements:
      </Typography>
      
      <Stack spacing={0.5}>
        {requirements.map((requirement, index) => (
          <Box
            key={index}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            {requirement.met ? (
              <CheckCircle
                sx={{
                  color: theme.palette.success.main,
                  fontSize: 18,
                }}
              />
            ) : (
              <RadioButtonUnchecked
                sx={{
                  color: theme.palette.grey[400],
                  fontSize: 18,
                }}
              />
            )}
            <Typography
              variant="body2"
              sx={{
                color: requirement.met 
                  ? theme.palette.success.main 
                  : theme.palette.text.secondary,
                fontWeight: requirement.met ? 'medium' : 'normal',
              }}
            >
              {requirement.label}
            </Typography>
          </Box>
        ))}
      </Stack>
      
      {password.length > 0 && metRequirements < requirements.length && (
        <Typography
          variant="caption"
          color="textSecondary"
          sx={{ mt: 1, display: 'block' }}
        >
          {metRequirements} of {requirements.length} requirements met
        </Typography>
      )}
    </Box>
  );
};

export default PasswordRequirements;