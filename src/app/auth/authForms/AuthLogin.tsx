'use client'
import {
  Box,
  Typography,
  FormGroup,
  FormControlLabel,
  Button,
  Stack,
  Divider,
  CircularProgress,
  Alert,
} from "@mui/material";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Formik, Form } from "formik";
import * as yup from "yup";
import toast, { Toaster } from "react-hot-toast";
import { loginType } from "@/app/(DashboardLayout)/types/auth/auth";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import CustomFormLabel from "@/app/components/forms/theme-elements/CustomFormLabel";
import AuthSocialButtons from "./AuthSocialButtons";

const validationSchema = yup.object({
  email: yup
    .string()
    .email('Please enter a valid email address')
    .required('Email is required')
    .trim()
    .lowercase(),
  password: yup
    .string()
    .required('Password is required')
    .min(1, 'Password cannot be empty'),
  rememberMe: yup
    .boolean()
    .optional()
    .default(false),
});

interface LoginFormValues {
  email: string;
  password: string;
  rememberMe: boolean;
}

const AuthLogin = ({ title, subtitle, subtext }: loginType) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [verificationRequired, setVerificationRequired] = useState<string | null>(null);

  const handleSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    setVerificationRequired(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Login successful! Welcome back!');

        setTimeout(() => {
          router.push('/dashboards/ecommerce');
        }, 1500);
      } else if (data.requiresVerification) {
        setVerificationRequired(data.email);
        toast.error('Please verify your email address to continue.');
      } else {
        toast.error(data.error || 'Login failed. Please check your credentials.');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToVerification = () => {
    if (verificationRequired) {
      router.push(`/auth/auth1/verify-email?email=${encodeURIComponent(verificationRequired)}`);
    }
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

      {title ? (
        <Typography fontWeight="700" variant="h3" mb={1}>
          {title}
        </Typography>
      ) : null}

      {subtext}

      <AuthSocialButtons title="Sign in with" />
      <Box mt={3}>
        <Divider>
          <Typography
            component="span"
            color="textSecondary"
            variant="h6"
            fontWeight="400"
            position="relative"
            px={2}
          >
            or sign in with
          </Typography>
        </Divider>
      </Box>

      {verificationRequired && (
        <Alert
          severity="warning"
          sx={{ mb: 3 }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={handleGoToVerification}
            >
              Verify Now
            </Button>
          }
        >
          Your email address is not verified. Please verify your email to continue.
        </Alert>
      )}

      <Formik
        initialValues={{
          email: '',
          password: '',
          rememberMe: false,
        }}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        {({ values, errors, touched, handleChange, handleBlur, setFieldValue, isValid }) => (
          <Form>
            <Stack mb={3}>
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
                  disabled={isLoading}
                />
              </Box>
              <Box>
                <CustomFormLabel htmlFor="password">Password</CustomFormLabel>
                <CustomTextField
                  id="password"
                  name="password"
                  type="password"
                  variant="outlined"
                  fullWidth
                  value={values.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.password && Boolean(errors.password)}
                  helperText={touched.password && errors.password}
                  disabled={isLoading}
                />
              </Box>
              <Stack
                justifyContent="space-between"
                direction="row"
                alignItems="center"
                my={2}
              >
                <FormGroup>
                  <FormControlLabel
                    control={
                      <CustomCheckbox
                        checked={values.rememberMe}
                        onChange={(e) => setFieldValue('rememberMe', e.target.checked)}
                        disabled={isLoading}
                      />
                    }
                    label="Remember this Device"
                  />
                </FormGroup>
                <Typography
                  component={Link}
                  href="/auth/auth1/forgot-password"
                  fontWeight="500"
                  sx={{
                    textDecoration: "none",
                    color: "primary.main",
                  }}
                >
                  Forgot Password ?
                </Typography>
              </Stack>
            </Stack>

            <Box>
              <Button
                type="submit"
                color="primary"
                variant="contained"
                size="large"
                fullWidth
                disabled={isLoading || !isValid}
                sx={{ mb: 2 }}
              >
                {isLoading ? (
                  <>
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    Signing In...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </Box>
          </Form>
        )}
      </Formik>

      {subtitle}
    </>
  );
};

export default AuthLogin;
