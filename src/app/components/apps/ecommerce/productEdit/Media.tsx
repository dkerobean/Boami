"use client";
import React, { useState } from "react";
import Box from "@mui/material/Box";
import { Chip, Typography, useTheme, Grid, Card, CardMedia, IconButton, Stack } from "@mui/material";
import { useDropzone } from "react-dropzone";
import { IconX, IconPhoto } from "@tabler/icons-react";

interface MediaCardProps {
  productData?: any;
  onImagesChange?: (images: string[]) => void;
  onMainImageChange?: (file: File) => void;
}

const MediaCard = ({ productData, onImagesChange, onMainImageChange }: MediaCardProps) => {
  const theme = useTheme();
  const [currentImages, setCurrentImages] = useState<string[]>(productData?.gallery || []);

  const { acceptedFiles, getRootProps, getInputProps } = useDropzone({
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    maxFiles: 1, // For main image, only allow one file
    onDrop: (files) => {
      console.log('🖼️ MediaCard: Files dropped:', files);
      if (files.length > 0 && onMainImageChange) {
        console.log('🖼️ MediaCard: Calling onMainImageChange with first file:', files[0].name);
        onMainImageChange(files[0]);
      }
    }
  });

  const handleRemoveImage = (index: number) => {
    const updatedImages = currentImages.filter((_, i) => i !== index);
    setCurrentImages(updatedImages);
    onImagesChange?.(updatedImages);
  };

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
        {file.path}{" "}
      </Typography>
      <Chip color="primary" label={`${file.size} Bytes`} />
    </Box>
  ));

  return (
    <Box p={3}>
      <Typography variant="h5" mb={3}>Media</Typography>

      {/* Current Product Images */}
      {currentImages.length > 0 && (
        <Box mb={3}>
          <Typography variant="h6" gutterBottom>
            Current Images
          </Typography>
          <Grid container spacing={2}>
            {currentImages.map((imageUrl, index) => (
              <Grid item xs={6} sm={4} md={3} key={index}>
                <Card sx={{ position: 'relative' }}>
                  <CardMedia
                    component="img"
                    height="120"
                    image={imageUrl}
                    alt={`Product image ${index + 1}`}
                    sx={{ objectFit: 'cover' }}
                  />
                  <IconButton
                    size="small"
                    sx={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      backgroundColor: 'error.main',
                      color: 'white',
                      '&:hover': { backgroundColor: 'error.dark' }
                    }}
                    onClick={() => handleRemoveImage(index)}
                  >
                    <IconX size={16} />
                  </IconButton>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Main Product Photo */}
      {productData?.photo && (
        <Box mb={3}>
          <Typography variant="h6" gutterBottom>
            Main Product Photo
          </Typography>
          <Card sx={{ maxWidth: 200 }}>
            <CardMedia
              component="img"
              height="150"
              image={productData.photo}
              alt="Main product photo"
              sx={{ objectFit: 'cover' }}
            />
          </Card>
        </Box>
      )}

      {/* Upload Area */}
      <Typography variant="h6" gutterBottom>
        Upload New Images
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Drop an image here to set as the main product photo
      </Typography>
      <Box
        sx={{
          backgroundColor: "primary.light",
          color: "primary.main",
          padding: "40px 30px",
          textAlign: "center",
          border: `2px dashed`,
          borderColor: "primary.main",
          borderRadius: 2,
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          '&:hover': {
            backgroundColor: 'primary.main',
            color: 'white'
          }
        }}
        {...getRootProps({ className: "dropzone" })}
      >
        <input {...getInputProps()} />
        <IconPhoto size={48} style={{ marginBottom: 16 }} />
        <Typography variant="body1" fontWeight={500}>
          Drag & drop images here
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          or click to browse files
        </Typography>
        <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
          Max 5MB • JPEG, PNG, GIF, WebP
        </Typography>
      </Box>
      
      {acceptedFiles.length > 0 && (
        <Box mt={3}>
          <Typography variant="h6" gutterBottom>
            Selected Files:
          </Typography>
          <Stack spacing={1}>
            {files}
          </Stack>
        </Box>
      )}
    </Box>
  );
};

export default MediaCard;
