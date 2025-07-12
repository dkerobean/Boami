"use client";
import { Box, Typography, Button, CircularProgress, Alert } from "@mui/material";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Formik, Form } from "formik";
import * as yup from "yup";
import toast, { Toaster } from "react-hot-toast";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import CustomFormLabel from "@/app/components/forms/theme-elements/CustomFormLabel";
import { Stack } from "@mui/system";

const validationSchema = yup.object({
  code: yup
    .string()
    .required('Verification code is required')
    .matches(/^\d{4}$/, 'Please enter exactly 4 digits'),
});

interface VerificationFormValues {
  code: string;
}

interface AuthEmailVerificationProps {
  onSuccess?: () => void;
  email?: string;
}

const AuthEmailVerification = ({ onSuccess, email: propEmail }: AuthEmailVerificationProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [email, setEmail] = useState(propEmail || '');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Get email from URL params if not provided as prop
  useEffect(() => {
    if (!email) {
      const emailParam = searchParams.get('email');
      if (emailParam) {
        setEmail(decodeURIComponent(emailParam));
      }
    }
  }, [email, searchParams]);

  // Start countdown timer for resend functionality
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSubmit = async (values: VerificationFormValues) => {
    if (!email) {
      toast.error('Email address is required for verification');
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          code: values.code,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Email verified successfully! Welcome to Boami!');
        
        if (onSuccess) {
          onSuccess();
        } else {
          setTimeout(() => {
            router.push('/dashboards/modern');
          }, 1500);
        }
      } else {
        toast.error(data.error || 'Verification failed. Please try again.');
      }
    } catch (error) {
      console.error('Verification error:', error);
      toast.error('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!email) {
      toast.error('Email address is required to resend code');
      return;
    }

    if (countdown > 0) {
      toast.error(`Please wait ${countdown} seconds before requesting another code`);
      return;
    }

    setIsResending(true);
    
    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('A new verification code has been sent to your email.');
        setCountdown(60); // 60 second cooldown
      } else {
        toast.error(data.error || 'Failed to resend verification code.');
      }
    } catch (error) {
      console.error('Resend error:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const handleDigitChange = (index: number, value: string, setFieldValue: (field: string, value: any) => void, values: VerificationFormValues) => {
    // Only allow single digit
    if (value.length > 1) {
      value = value.slice(-1);
    }

    // Only allow numbers
    if (value && !/^\d$/.test(value)) {
      return;
    }

    // Update the code at the specific position
    const codeArray = values.code.split('');
    codeArray[index] = value;
    const newCode = codeArray.join('');
    
    setFieldValue('code', newCode);

    // Auto-focus next input
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent, setFieldValue: (field: string, value: any) => void, values: VerificationFormValues) => {
    // Handle backspace
    if (e.key === 'Backspace' && !values.code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const getDigitValue = (code: string, index: number) => {
    return code[index] || '';
  };

  const formatEmail = (email: string) => {
    if (!email) return '';
    const [username, domain] = email.split('@');
    if (username.length <= 3) return email;
    const masked = username.slice(0, 2) + '*'.repeat(username.length - 2);
    return `${masked}@${domain}`;
  };

  return (
    <>
      <Toaster 
        position="top-right" 
        toastOptions={{
          duration: 4000,
          style: {
            background: '#333',
            color: '#fff',
          },
        }} 
      />
      
      <Box mt={4}>
        {email && (
          <Alert severity="info" sx={{ mb: 3 }}>
            We sent a 4-digit verification code to <strong>{formatEmail(email)}</strong>
          </Alert>
        )}

        <Formik
          initialValues={{
            code: '',
          }}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({ values, errors, touched, setFieldValue, isValid }) => (
            <Form>
              <Stack mb={3}>
                <CustomFormLabel htmlFor="code">
                  Enter your 4-digit verification code
                </CustomFormLabel>
                <Stack spacing={2} direction="row" justifyContent="center">
                  {[0, 1, 2, 3].map((index) => (
                    <CustomTextField
                      key={index}
                      inputRef={(el: HTMLInputElement) => inputRefs.current[index] = el}
                      variant="outlined"
                      sx={{
                        width: '60px',
                        '& .MuiInputBase-input': {
                          textAlign: 'center',
                          fontSize: '24px',
                          fontWeight: 'bold',
                          padding: '16px 8px',
                        }
                      }}
                      value={getDigitValue(values.code, index)}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDigitChange(index, e.target.value, setFieldValue, values)}
                      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => handleKeyDown(index, e, setFieldValue, values)}
                      inputProps={{
                        maxLength: 1,
                        pattern: '[0-9]',
                        inputMode: 'numeric'
                      }}
                      disabled={isLoading}
                      error={touched.code && Boolean(errors.code)}
                    />
                  ))}
                </Stack>
                {touched.code && errors.code && (
                  <Typography color="error" variant="caption" sx={{ mt: 1, textAlign: 'center' }}>
                    {errors.code}
                  </Typography>
                )}
              </Stack>

              <Button
                type="submit"
                color="primary"
                variant="contained"
                size="large"
                fullWidth
                disabled={isLoading || !isValid || values.code.length !== 4}
                sx={{ mb: 2 }}
              >
                {isLoading ? (
                  <>
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    Verifying...
                  </>
                ) : (
                  'Verify My Account'
                )}
              </Button>
            </Form>
          )}
        </Formik>

        <Stack direction="row" spacing={1} justifyContent="center" mt={3}>
          <Typography color="textSecondary" variant="h6" fontWeight="400">
            Didn&apos;t get the code?
          </Typography>
          <Typography
            component="button"
            type="button"
            onClick={handleResendCode}
            disabled={isResending || countdown > 0}
            fontWeight="500"
            sx={{
              background: 'none',
              border: 'none',
              textDecoration: 'none',
              color: countdown > 0 ? 'text.disabled' : 'primary.main',
              cursor: countdown > 0 ? 'not-allowed' : 'pointer',
              '&:hover': {
                textDecoration: countdown > 0 ? 'none' : 'underline',
              }
            }}
          >
            {isResending ? (
              'Sending...'
            ) : countdown > 0 ? (
              `Resend in ${countdown}s`
            ) : (
              'Resend'
            )}
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1} justifyContent="center" mt={2}>
          <Typography color="textSecondary" variant="body2">
            Wrong email address?
          </Typography>
          <Typography
            component="button"
            type="button"
            onClick={() => router.push('/auth/auth1/register')}
            variant="body2"
            sx={{
              background: 'none',
              border: 'none',
              textDecoration: 'none',
              color: 'primary.main',
              cursor: 'pointer',
              '&:hover': {
                textDecoration: 'underline',
              }
            }}
          >
            Change email
          </Typography>
        </Stack>
      </Box>
    </>
  );
};

export default AuthEmailVerification;