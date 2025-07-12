'use client'
import { Box, Typography, Button, Divider, Alert, CircularProgress } from "@mui/material";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Formik, Form } from "formik";
import * as yup from "yup";
import toast, { Toaster } from "react-hot-toast";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import CustomFormLabel from "@/app/components/forms/theme-elements/CustomFormLabel";
import { Stack } from "@mui/system";
import { registerType } from "@/app/(DashboardLayout)/types/auth/auth";
import AuthSocialButtons from "./AuthSocialButtons";

const validationSchema = yup.object({
  firstName: yup
    .string()
    .required('First name is required')
    .trim()
    .min(1, 'First name cannot be empty'),
  lastName: yup
    .string()
    .required('Last name is required')
    .trim()
    .min(1, 'Last name cannot be empty'),
  email: yup
    .string()
    .email('Please enter a valid email address')
    .required('Email is required')
    .trim()
    .lowercase(),
  password: yup
    .string()
    .min(8, 'Password must be at least 8 characters')
    .matches(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .matches(/[a-z]/, 'Password must contain at least one lowercase letter')
    .matches(/\d/, 'Password must contain at least one number')
    .matches(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character')
    .required('Password is required'),
});

interface RegisterFormValues {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

const AuthRegister = ({ title, subtitle, subtext }: registerType) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (values: RegisterFormValues) => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Registration successful! Please check your email for a verification code.');
        
        setTimeout(() => {
          router.push(`/auth/auth1/verify-email?email=${encodeURIComponent(values.email)}`);
        }, 1500);
      } else {
        if (data.details && Array.isArray(data.details)) {
          data.details.forEach((error: string) => toast.error(error));
        } else {
          toast.error(data.error || 'Registration failed. Please try again.');
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
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
      <AuthSocialButtons title="Sign up with" />

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
            or sign up with
          </Typography>
        </Divider>
      </Box>

      <Formik
        initialValues={{
          firstName: '',
          lastName: '',
          email: '',
          password: '',
        }}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        {({ values, errors, touched, handleChange, handleBlur, isValid }) => (
          <Form>
            <Stack mb={3}>
              <CustomFormLabel htmlFor="firstName">First Name</CustomFormLabel>
              <CustomTextField
                id="firstName"
                name="firstName"
                variant="outlined"
                fullWidth
                value={values.firstName}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.firstName && Boolean(errors.firstName)}
                helperText={touched.firstName && errors.firstName}
                disabled={isLoading}
              />

              <CustomFormLabel htmlFor="lastName">Last Name</CustomFormLabel>
              <CustomTextField
                id="lastName"
                name="lastName"
                variant="outlined"
                fullWidth
                value={values.lastName}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.lastName && Boolean(errors.lastName)}
                helperText={touched.lastName && errors.lastName}
                disabled={isLoading}
              />

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

              {errors.password && touched.password && (
                <Alert severity="info" sx={{ mt: 1 }}>
                  Password requirements:
                  <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                    <li>At least 8 characters long</li>
                    <li>One uppercase letter</li>
                    <li>One lowercase letter</li>
                    <li>One number</li>
                    <li>One special character</li>
                  </ul>
                </Alert>
              )}
            </Stack>

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
                  Creating Account...
                </>
              ) : (
                'Sign Up'
              )}
            </Button>
          </Form>
        )}
      </Formik>
      
      {subtitle}
    </>
  );
};

export default AuthRegister;
