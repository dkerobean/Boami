"use client";
import { Box, Typography, Button, CircularProgress, Alert, Divider } from "@mui/material";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Formik, Form } from "formik";
import * as yup from "yup";
import toast, { Toaster } from "react-hot-toast";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import CustomFormLabel from "@/app/components/forms/theme-elements/CustomFormLabel";
import { Stack } from "@mui/system";

// Validation schemas for different steps
const emailValidationSchema = yup.object({
  email: yup
    .string()
    .email('Please enter a valid email address')
    .required('Email is required')
    .trim()
    .lowercase(),
});

const codeValidationSchema = yup.object({
  code: yup
    .string()
    .required('Verification code is required')
    .matches(/^\d{4}$/, 'Please enter exactly 4 digits'),
});

const passwordValidationSchema = yup.object({
  newPassword: yup
    .string()
    .min(8, 'Password must be at least 8 characters')
    .matches(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .matches(/[a-z]/, 'Password must contain at least one lowercase letter')
    .matches(/\d/, 'Password must contain at least one number')
    .matches(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character')
    .required('Password is required'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('newPassword')], 'Passwords must match')
    .required('Please confirm your password'),
});

// Form value interfaces
interface EmailFormValues {
  email: string;
}

interface CodeFormValues {
  code: string;
}

interface PasswordFormValues {
  newPassword: string;
  confirmPassword: string;
}

// Component props interface
interface AuthResetPasswordProps {
  title?: string;
  subtitle?: string;
  subtext?: React.ReactNode;
}

const AuthResetPassword = ({ title, subtitle, subtext }: AuthResetPasswordProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<'email' | 'code' | 'password'>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Get email from URL params if available
  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
      setStep('code');
    }
  }, [searchParams]);

  // Countdown timer for resend functionality
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Handle auto-focus for code input
  const handleCodeInputChange = (index: number, value: string, setFieldValue: any, values: any) => {
    const newCode = values.code.split('');
    newCode[index] = value;
    const updatedCode = newCode.join('');
    setFieldValue('code', updatedCode);

    // Auto-focus next input
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle key down for code input
  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent, setFieldValue: any, values: any) => {
    if (e.key === 'Backspace' && !values.code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Step 1: Request password reset
  const handleEmailSubmit = async (values: EmailFormValues) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'request',
          email: values.email
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setEmail(values.email);
        setStep('code');
        setCountdown(60); // 60 seconds before allowing resend
        toast.success(data.message || 'Reset code sent to your email');
      } else {
        toast.error(data.error || 'Failed to send reset code');
      }
    } catch (error) {
      console.error('Password reset request error:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify code and continue to password reset
  const handleCodeSubmit = async (values: CodeFormValues) => {
    setIsLoading(true);
    try {
      // Just validate the code format here, actual verification happens in password reset
      if (values.code.length === 4) {
        setVerificationCode(values.code); // Save the code to state
        setStep('password');
        toast.success('Code verified! Please enter your new password.');
      } else {
        toast.error('Please enter a valid 4-digit code');
      }
    } catch (error) {
      console.error('Code verification error:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Reset password with verification code
  const handlePasswordSubmit = async (values: PasswordFormValues) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset',
          email: email,
          code: verificationCode, // Use the stored verification code
          newPassword: values.newPassword
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || 'Password reset successful!');
        setTimeout(() => {
          router.push('/auth/auth1/login?message=password-reset-success');
        }, 2000);
      } else {
        toast.error(data.error || 'Failed to reset password');
        if (data.error?.includes('Invalid or expired')) {
          setStep('email'); // Go back to start if code is invalid
        }
      }
    } catch (error) {
      console.error('Password reset error:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Resend reset code
  const handleResendCode = async () => {
    if (countdown > 0) return;
    
    setIsResending(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'request',
          email: email
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setCountdown(60);
        toast.success('New reset code sent to your email');
      } else {
        toast.error(data.error || 'Failed to resend code');
      }
    } catch (error) {
      console.error('Resend code error:', error);
      toast.error('Failed to resend code');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <>
      <Toaster position="top-right" />
      <Box>
        {title && (
          <Typography fontWeight="700" variant="h3" mb={1}>
            {title}
          </Typography>
        )}

        {subtext}

        {/* Step 1: Email Input */}
        {step === 'email' && (
          <Formik
            initialValues={{ email: email }}
            validationSchema={emailValidationSchema}
            onSubmit={handleEmailSubmit}
          >
            {({ values, errors, touched, handleChange, handleBlur }) => (
              <Form>
                <Stack spacing={3}>
                  <Box>
                    <CustomFormLabel htmlFor="email">Email Address</CustomFormLabel>
                    <CustomTextField
                      id="email"
                      name="email"
                      type="email"
                      variant="outlined"
                      fullWidth
                      value={values.email}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.email && Boolean(errors.email)}
                      helperText={touched.email && errors.email}
                      placeholder="Enter your email address"
                    />
                  </Box>

                  <Button
                    type="submit"
                    color="primary"
                    variant="contained"
                    size="large"
                    fullWidth
                    disabled={isLoading}
                    sx={{ mb: 2 }}
                  >
                    {isLoading ? (
                      <CircularProgress size={24} color="inherit" />
                    ) : (
                      'Send Reset Code'
                    )}
                  </Button>
                </Stack>
              </Form>
            )}
          </Formik>
        )}

        {/* Step 2: Code Verification */}
        {step === 'code' && (
          <Formik
            initialValues={{ code: '' }}
            validationSchema={codeValidationSchema}
            onSubmit={handleCodeSubmit}
          >
            {({ values, errors, touched, setFieldValue }) => (
              <Form>
                <Stack spacing={3}>
                  <Box textAlign="center">
                    <Typography variant="h6" mb={1}>
                      Enter Verification Code
                    </Typography>
                    <Typography variant="body2" color="textSecondary" mb={3}>
                      We've sent a 4-digit code to {email}
                    </Typography>
                  </Box>

                  <Box>
                    <CustomFormLabel htmlFor="code">Verification Code</CustomFormLabel>
                    <Box display="flex" gap={2} justifyContent="center" mb={2}>
                      {[0, 1, 2, 3].map((index) => (
                        <CustomTextField
                          key={index}
                          inputRef={(el: HTMLInputElement | null) => (inputRefs.current[index] = el)}
                          type="text"
                          inputMode="numeric"
                          variant="outlined"
                          value={values.code[index] || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            const value = e.target.value.replace(/\D/g, '');
                            if (value.length <= 1) {
                              handleCodeInputChange(index, value, setFieldValue, values);
                            }
                          }}
                          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => handleCodeKeyDown(index, e, setFieldValue, values)}
                          sx={{
                            width: 60,
                            height: 60,
                            '& input': {
                              textAlign: 'center',
                              fontSize: '1.5rem',
                              fontWeight: 'bold'
                            }
                          }}
                          error={touched.code && Boolean(errors.code)}
                        />
                      ))}
                    </Box>
                    {touched.code && errors.code && (
                      <Typography color="error" variant="caption" display="block" textAlign="center">
                        {errors.code}
                      </Typography>
                    )}
                  </Box>

                  <Button
                    type="submit"
                    color="primary"
                    variant="contained"
                    size="large"
                    fullWidth
                    disabled={isLoading || values.code.length !== 4}
                    sx={{ mb: 2 }}
                  >
                    {isLoading ? (
                      <CircularProgress size={24} color="inherit" />
                    ) : (
                      'Verify Code'
                    )}
                  </Button>

                  <Box textAlign="center">
                    <Typography variant="body2" color="textSecondary" mb={1}>
                      Didn't receive the code?
                    </Typography>
                    <Button
                      variant="text"
                      onClick={handleResendCode}
                      disabled={countdown > 0 || isResending}
                      size="small"
                    >
                      {isResending ? (
                        <CircularProgress size={16} />
                      ) : countdown > 0 ? (
                        `Resend in ${countdown}s`
                      ) : (
                        'Resend Code'
                      )}
                    </Button>
                  </Box>
                </Stack>
              </Form>
            )}
          </Formik>
        )}

        {/* Step 3: New Password */}
        {step === 'password' && (
          <Formik
            initialValues={{ newPassword: '', confirmPassword: '' }}
            validationSchema={passwordValidationSchema}
            onSubmit={handlePasswordSubmit}
          >
            {({ values, errors, touched, handleChange, handleBlur }) => (
              <Form>
                <Stack spacing={3}>
                  <Box textAlign="center">
                    <Typography variant="h6" mb={1}>
                      Create New Password
                    </Typography>
                    <Typography variant="body2" color="textSecondary" mb={3}>
                      Please enter your new password
                    </Typography>
                  </Box>

                  <Box>
                    <CustomFormLabel htmlFor="newPassword">New Password</CustomFormLabel>
                    <CustomTextField
                      id="newPassword"
                      name="newPassword"
                      type="password"
                      variant="outlined"
                      fullWidth
                      value={values.newPassword}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.newPassword && Boolean(errors.newPassword)}
                      helperText={touched.newPassword && errors.newPassword}
                      placeholder="Enter new password"
                    />
                  </Box>

                  <Box>
                    <CustomFormLabel htmlFor="confirmPassword">Confirm Password</CustomFormLabel>
                    <CustomTextField
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      variant="outlined"
                      fullWidth
                      value={values.confirmPassword}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.confirmPassword && Boolean(errors.confirmPassword)}
                      helperText={touched.confirmPassword && errors.confirmPassword}
                      placeholder="Confirm new password"
                    />
                  </Box>

                  <Button
                    type="submit"
                    color="primary"
                    variant="contained"
                    size="large"
                    fullWidth
                    disabled={isLoading}
                    sx={{ mb: 2 }}
                  >
                    {isLoading ? (
                      <CircularProgress size={24} color="inherit" />
                    ) : (
                      'Reset Password'
                    )}
                  </Button>
                </Stack>
              </Form>
            )}
          </Formik>
        )}

        {/* Navigation Links */}
        <Box mt={3}>
          <Divider />
          <Box textAlign="center" mt={2}>
            <Typography variant="body2" color="textSecondary">
              Remember your password?{' '}
              <Link href="/auth/auth1/login" style={{ textDecoration: 'none', color: 'inherit' }}>
                <Typography component="span" variant="body2" color="primary" sx={{ textDecoration: 'underline' }}>
                  Sign In
                </Typography>
              </Link>
            </Typography>
          </Box>
        </Box>
      </Box>
    </>
  );
};

export default AuthResetPassword;