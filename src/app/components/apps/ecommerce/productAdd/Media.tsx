"use client";
import React, { useState } from "react";
import Box from "@mui/material/Box";
import { Chip, Typography, useTheme, Grid, IconButton, Card, CardMedia, Stack, Alert, Button } from "@mui/material";
import { useDropzone } from "react-dropzone";
import { useFormikContext } from "formik";
import CustomFormLabel from "@/app/components/forms/theme-elements/CustomFormLabel";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import { IconX, IconPhoto, IconAlertTriangle } from "@tabler/icons-react";
import { isBlobUrl, isValidImageUrl, getImageUrlValidationMessage } from "@/lib/utils/image-utils";
import { uploadProductImage, validateImageFile, formatFileSize, isUploadedImageUrl } from "@/lib/utils/file-upload";

const MediaCard = () => {
  const theme = useTheme();
  const { values, errors, touched, setFieldValue } = useFormikContext<any>();
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploadStatus, setUploadStatus] = useState<{
    loading: boolean;
    error: string | null;
    success: string | null;
  }>({ loading: false, error: null, success: null });

  const onDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setUploadStatus({ loading: true, error: null, success: null });
      
      try {
        const file = acceptedFiles[0];
        
        // Validate file
        const validation = validateImageFile(file);
        if (!validation.valid) {
          setUploadStatus({ 
            loading: false, 
            error: validation.error || 'Invalid file', 
            success: null 
          });
          return;
        }

        // Create temporary preview while uploading
        const tempPreview = URL.createObjectURL(file);
        setPreviewUrl(tempPreview);

        // Upload the main image
        const uploadResult = await uploadProductImage(file);
        
        if (uploadResult.success && uploadResult.url) {
          // Replace blob URL with permanent URL
          setFieldValue("photo", uploadResult.url);
          setPreviewUrl(uploadResult.url);
          
          setUploadStatus({ 
            loading: false, 
            error: null, 
            success: `Image uploaded successfully! (${formatFileSize(file.size)})` 
          });

          // Clean up temporary URL
          URL.revokeObjectURL(tempPreview);
        } else {
          setUploadStatus({ 
            loading: false, 
            error: uploadResult.error || 'Upload failed', 
            success: null 
          });
          setPreviewUrl("");
        }

        // Handle additional gallery images
        if (acceptedFiles.length > 1) {
          const galleryFiles = acceptedFiles.slice(1);
          const galleryUploads = await Promise.all(
            galleryFiles.map(file => uploadProductImage(file))
          );
          
          const successfulUploads = galleryUploads
            .filter(result => result.success && result.url)
            .map(result => result.url!);
          
          if (successfulUploads.length > 0) {
            setFieldValue("gallery", [...values.gallery, ...successfulUploads]);
          }
        }

      } catch (error) {
        console.error('Upload error:', error);
        setUploadStatus({ 
          loading: false, 
          error: 'Failed to upload image. Please try again.', 
          success: null 
        });
        setPreviewUrl("");
      }
    }
  };

  const handleUrlChange = (url: string) => {
    setFieldValue("photo", url);
    setPreviewUrl(url);
    // Clear upload status when manually entering URL
    setUploadStatus({ loading: false, error: null, success: null });
  };

  const removeGalleryImage = (index: number) => {
    const newGallery = values.gallery.filter((_: string, i: number) => i !== index);
    setFieldValue("gallery", newGallery);
  };

  // Get validation message for current photo URL
  const photoValidationMessage = getImageUrlValidationMessage(values.photo);
  const hasPhotoError = photoValidationMessage !== null;

  // Check if current photo is uploaded or hosted
  const isCurrentImageUploaded = isUploadedImageUrl(values.photo);
  const isCurrentImageBlob = isBlobUrl(values.photo);

  const { acceptedFiles, getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    multiple: true
  });

  const files = acceptedFiles.map((file: any) => (
    <Box
      key={file.path}
      display="flex"
      alignItems="center"
      py={1}
      mt={2}
      sx={{ borderTop: `1px solid ${theme.palette.divider}` }}
      justifyContent="space-between"
    >
      <Typography variant="body1" fontWeight="500">
        {file.path}
      </Typography>
      <Chip color="primary" label={`${Math.round(file.size / 1024)} KB`} />
    </Box>
  ));

  return (
    <Box p={3}>
      <Typography variant="h5" mb={3}>Product Media</Typography>

      {/* Upload Status Messages */}
      {uploadStatus.loading && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            Uploading image... Please wait.
          </Typography>
        </Alert>
      )}
      
      {uploadStatus.error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="body2" fontWeight={500}>
            Upload Failed
          </Typography>
          <Typography variant="body2">
            {uploadStatus.error}
          </Typography>
        </Alert>
      )}
      
      {uploadStatus.success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          <Typography variant="body2">
            {uploadStatus.success}
          </Typography>
        </Alert>
      )}

      {/* Blob URL Warning (for old temporary URLs) */}
      {isCurrentImageBlob && !uploadStatus.loading && (
        <Alert 
          severity="warning" 
          icon={<IconAlertTriangle />}
          sx={{ mb: 3 }}
        >
          <Typography variant="body2" fontWeight={500}>
            Temporary file upload detected
          </Typography>
          <Typography variant="body2">
            This is a temporary URL that cannot be saved. Please upload the file again or use a hosted URL.
          </Typography>
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Main Product Image Section */}
        <Grid item xs={12} md={6}>
          <CustomFormLabel 
            htmlFor="photo"
            error={touched.photo && (Boolean(errors.photo) || hasPhotoError)}
          >
            Product Image URL{" "}
            <Typography color="error.main" component="span" className="required-asterisk">
              *
            </Typography>
          </CustomFormLabel>
          <CustomTextField 
            id="photo"
            name="photo"
            placeholder="https://example.com/image.jpg" 
            fullWidth 
            value={values.photo}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUrlChange(e.target.value)}
            error={touched.photo && (Boolean(errors.photo) || hasPhotoError)}
            helperText={touched.photo && (errors.photo || photoValidationMessage)}
          />
          <Typography variant="body2" sx={{ mt: 1 }}>
            Enter a hosted image URL, or upload an image file using the upload area on the right.
          </Typography>
          <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: "block" }}>
            Example: https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=400&fit=crop
          </Typography>
          
          {/* Sample Image URLs */}
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="textSecondary" sx={{ mb: 1, display: "block" }}>
              Quick test images (click to use):
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {[
                "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=400&fit=crop", // Laptop
                "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop", // Headphones
                "https://images.unsplash.com/photo-1586816001966-79b736744398?w=400&h=400&fit=crop", // Phone
                "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop", // Shoes
              ].map((url, index) => (
                <Button
                  key={index}
                  size="small"
                  variant="outlined"
                  onClick={() => handleUrlChange(url)}
                  sx={{ fontSize: "0.7rem", minWidth: "auto", px: 1 }}
                >
                  Sample {index + 1}
                </Button>
              ))}
            </Stack>
          </Box>

          {/* Image Preview */}
          {(values.photo || previewUrl) && (
            <Card sx={{ mt: 2, maxWidth: 300 }}>
              <CardMedia
                component="img"
                height="200"
                image={previewUrl || values.photo}
                alt="Product Preview"
                sx={{
                  objectFit: "cover",
                  border: isBlobUrl(values.photo) 
                    ? "2px solid orange" 
                    : isValidImageUrl(values.photo) 
                      ? "2px solid green" 
                      : "2px solid red"
                }}
                onError={() => setPreviewUrl("")}
              />
              <Box p={1} textAlign="center">
                <Typography variant="caption" color="textSecondary">
                  Main Product Image
                </Typography>
                {isCurrentImageUploaded && (
                  <Typography variant="caption" color="success.main" display="block" sx={{ mt: 0.5 }}>
                    ✅ Uploaded Successfully
                  </Typography>
                )}
                {isCurrentImageBlob && (
                  <Typography variant="caption" color="warning.main" display="block" sx={{ mt: 0.5 }}>
                    ⚠️ Temporary URL - Cannot be saved
                  </Typography>
                )}
                {!isCurrentImageUploaded && !isCurrentImageBlob && isValidImageUrl(values.photo) && (
                  <Typography variant="caption" color="info.main" display="block" sx={{ mt: 0.5 }}>
                    🌐 Hosted URL
                  </Typography>
                )}
              </Box>
            </Card>
          )}
        </Grid>

        {/* Upload Section */}
        <Grid item xs={12} md={6}>
          <Typography variant="h6" mb={2}>Upload Images</Typography>
          <Box
            sx={{
              backgroundColor: uploadStatus.loading ? "grey.100" : "primary.light",
              color: uploadStatus.loading ? "grey.500" : "primary.main",
              padding: "40px 20px",
              textAlign: "center",
              border: `2px dashed`,
              borderColor: uploadStatus.loading ? "grey.300" : "primary.main",
              cursor: uploadStatus.loading ? "not-allowed" : "pointer",
              borderRadius: 2,
              transition: "all 0.3s ease",
              "&:hover": {
                backgroundColor: uploadStatus.loading ? "grey.100" : "primary.main",
                color: uploadStatus.loading ? "grey.500" : "white",
              }
            }}
            {...getRootProps({ className: "dropzone" })}
          >
            <input {...getInputProps()} disabled={uploadStatus.loading} />
            <IconPhoto size={48} style={{ marginBottom: 16 }} />
            <Typography variant="body1" fontWeight={500}>
              {uploadStatus.loading ? "Uploading..." : "Drag & drop images here"}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              {uploadStatus.loading ? "Please wait..." : "or click to browse files"}
            </Typography>
            <Typography variant="caption" sx={{ mt: 1, display: "block" }}>
              {uploadStatus.loading ? "Processing your image..." : "Max 5MB • JPEG, PNG, GIF, WebP"}
            </Typography>
          </Box>
          
          {acceptedFiles.length > 0 && (
            <Box mt={2}>
              <Typography variant="subtitle2" mb={1}>
                Uploaded Files:
              </Typography>
              {files}
            </Box>
          )}
        </Grid>

        {/* Gallery Images */}
        {values.gallery && values.gallery.length > 0 && (
          <Grid item xs={12}>
            <Typography variant="h6" mb={2}>Gallery Images</Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
              {values.gallery.map((imageUrl: string, index: number) => (
                <Card key={index} sx={{ position: "relative", width: 120, height: 120 }}>
                  <CardMedia
                    component="img"
                    height="120"
                    image={imageUrl}
                    alt={`Gallery ${index + 1}`}
                    sx={{ objectFit: "cover" }}
                  />
                  <IconButton
                    size="small"
                    sx={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      backgroundColor: "error.main",
                      color: "white",
                      "&:hover": { backgroundColor: "error.dark" }
                    }}
                    onClick={() => removeGalleryImage(index)}
                  >
                    <IconX size={16} />
                  </IconButton>
                </Card>
              ))}
            </Stack>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default MediaCard;
