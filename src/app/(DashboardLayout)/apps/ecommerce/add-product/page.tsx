"use client";
import { Box, Button, Grid, Stack, Alert } from "@mui/material";
import { useState } from "react";
import { Formik, Form } from "formik";
import * as yup from "yup";
import Breadcrumb from "@/app/(DashboardLayout)/layout/shared/breadcrumb/Breadcrumb";
import PageContainer from "@/app/components/container/PageContainer";
import { isBlobUrl, isValidImageUrl } from "@/lib/utils/image-utils";
import { isUploadedImageUrl } from "@/lib/utils/file-upload";

import GeneralCard from "@/app/components/apps/ecommerce/productAdd/GeneralCard";
import MediaCard from "@/app/components/apps/ecommerce/productAdd/Media";
import VariationCard from "@/app/components/apps/ecommerce/productAdd/VariationCard";
import PricingCard from "@/app/components/apps/ecommerce/productAdd/Pricing";
import StatusCard from "@/app/components/apps/ecommerce/productAdd/Status";
import ProductDetails from "@/app/components/apps/ecommerce/productAdd/ProductDetails";
import BlankCard from "@/app/components/shared/BlankCard";

const BCrumb = [
  {
    to: "/",
    title: "Home",
  },
  {
    title: "Add Product",
  },
];

// Product form validation schema
const productValidationSchema = yup.object({
  title: yup.string().required("Product title is required").max(200),
  description: yup.string().required("Product description is required"),
  price: yup.number().required("Price is required").min(0, "Price must be positive"),
  sku: yup.string().max(50), // Optional since it's auto-generated (hidden from user)
  category: yup.array().of(yup.string()).min(1, "At least one category is required"),
  brand: yup.string(),
  type: yup.string().oneOf(["simple", "variable", "grouped", "external"]).default("simple"),
  status: yup.string().oneOf(["draft", "pending", "private", "publish"]).default("publish"),
  virtual: yup.boolean().default(false),
  downloadable: yup.boolean().default(false),
  qty: yup.number().min(0, "Quantity cannot be negative").default(0),
  lowStockThreshold: yup.number().min(0, "Low stock threshold cannot be negative").default(5),
  manageStock: yup.boolean().default(true),
  backordersAllowed: yup.boolean().default(false),
  weight: yup.number().min(0, "Weight cannot be negative"),
  photo: yup.string()
    .required("Product photo is required")
    .test("not-blob-url", "This is a temporary URL that cannot be saved. Please upload the file or use a hosted URL.", (value) => {
      return !isBlobUrl(value);
    })
    .test("valid-image-url", "Please enter a valid image URL or upload an image file.", (value) => {
      return isValidImageUrl(value) || isUploadedImageUrl(value);
    }),
  gallery: yup.array().of(
    yup.string().test("not-blob-url", "Gallery images cannot contain temporary URLs. Please upload files or use hosted URLs.", (value) => {
      return !isBlobUrl(value);
    })
  ).default([]),
  colors: yup.array().of(yup.string()).default([]),
  tags: yup.array().of(yup.string()).default([]),
  variations: yup.array().of(
    yup.object({
      id: yup.string().required(),
      name: yup.string().required("Variation name is required"),
      values: yup.array().of(yup.string()).min(1, "At least one variation value is required")
    })
  ).default([]),
});

// Initial form values
const initialValues = {
  title: "",
  description: "",
  price: 0,
  sku: "", // Auto-generated but hidden from user
  category: [],
  subcategory: [],
  brand: "",
  gender: "unisex",
  type: "simple",
  status: "publish",
  virtual: false,
  downloadable: false,
  qty: 0,
  lowStockThreshold: 5,
  manageStock: true,
  backordersAllowed: false,
  weight: 0,
  dimensions: {
    length: "",
    width: "",
    height: "",
  },
  photo: "",
  gallery: [],
  colors: [],
  tags: [],
  metaTitle: "",
  metaDescription: "",
  variations: [],
};

const EcommerceAddProduct = () => {
  const [loading, setLoading] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  const handleSubmit = async (values: any, { setSubmitting, resetForm }: any) => {
    setLoading(true);
    setSubmitStatus({ type: null, message: "" });

    // Additional validation for blob URLs (temporary URLs only)
    if (isBlobUrl(values.photo)) {
      setSubmitStatus({
        type: "error",
        message: "Cannot save product with temporary URL. Please upload the file or use a hosted URL.",
      });
      setLoading(false);
      setSubmitting(false);
      return;
    }

    // Check gallery for blob URLs
    const hasGalleryBlobUrls = values.gallery.some((url: string) => isBlobUrl(url));
    if (hasGalleryBlobUrls) {
      setSubmitStatus({
        type: "error",
        message: "Cannot save product with temporary gallery URLs. Please upload files or use hosted URLs.",
      });
      setLoading(false);
      setSubmitting(false);
      return;
    }

    try {
      // Convert variations to variants format expected by API
      const variants: any[] = [];
      if (values.variations && values.variations.length > 0) {
        // Generate all possible combinations of variations
        const generateCombinations = (variations: any[]) => {
          if (variations.length === 0) return [[]];
          
          const [first, ...rest] = variations;
          const restCombinations = generateCombinations(rest);
          
          const combinations: any[] = [];
          for (const value of first.values) {
            for (const combination of restCombinations) {
              combinations.push([{ name: first.name, value }, ...combination]);
            }
          }
          return combinations;
        };

        const combinations = generateCombinations(values.variations);
        
        combinations.forEach((combination, index) => {
          variants.push({
            attributes: combination,
            pricing: {
              price: values.price,
              compareAtPrice: values.regularPrice || values.price,
              costPrice: values.price * 0.7, // Default cost price
              currency: 'USD'
            },
            inventory: {
              quantity: Math.floor(values.qty / combinations.length) || 0,
              lowStockThreshold: values.lowStockThreshold || 5,
              backordersAllowed: values.backordersAllowed || false
            },
            status: 'active',
            isDefault: index === 0
          });
        });
      }

      const submissionData = {
        ...values,
        variants,
        // Add default values for removed fields
        featured: false,
        reviewsAllowed: true,
        discount: 0,
        regularPrice: values.price,
        salePrice: values.price,
        // Remove the variations field since API expects variants
        variations: undefined
      };

      const response = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submissionData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create product");
      }

      const result = await response.json();
      setSubmitStatus({
        type: "success",
        message: "Product created successfully!",
      });
      resetForm();
    } catch (error) {
      setSubmitStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to create product",
      });
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  return (
    <PageContainer title="Add Product" description="this is Add Product">
      <Breadcrumb title="Add Product" items={BCrumb} />
      
      <>
        {submitStatus.type && (
          <Alert 
            severity={submitStatus.type} 
            sx={{ mb: 3 }}
            onClose={() => setSubmitStatus({ type: null, message: "" })}
          >
            {submitStatus.message}
          </Alert>
        )}
      </>

      <Formik
        initialValues={initialValues}
        validationSchema={productValidationSchema}
        onSubmit={handleSubmit}
      >
        {({ isSubmitting, resetForm }) => (
          <Form>
            <Grid container spacing={3}>
              <Grid item lg={8}>
                <Stack spacing={3}>
                  <BlankCard>
                    <GeneralCard />
                  </BlankCard>

                  <BlankCard>
                    <MediaCard />
                  </BlankCard>

                  <BlankCard>
                    <VariationCard />
                  </BlankCard>

                  <BlankCard>
                    <PricingCard />
                  </BlankCard>
                </Stack>
              </Grid>

              <Grid item lg={4}>
                <Stack spacing={3}>
                  <BlankCard>
                    <StatusCard />
                  </BlankCard>

                  <BlankCard>
                    <ProductDetails />
                  </BlankCard>
                </Stack>
              </Grid>
            </Grid>

            <Stack direction="row" spacing={2} mt={3}>
              <Button 
                variant="contained" 
                color="primary" 
                type="submit"
                disabled={isSubmitting || loading}
              >
                {loading ? "Creating Product..." : "Create Product"}
              </Button>
              <Button 
                variant="outlined" 
                color="error"
                onClick={() => resetForm()}
                disabled={isSubmitting || loading}
              >
                Reset Form
              </Button>
            </Stack>
          </Form>
        )}
      </Formik>
    </PageContainer>
  );
};

export default EcommerceAddProduct;
