"use client";
import React, { useState, useRef, useEffect } from "react";
import Box from "@mui/material/Box";
import { Typography } from "@mui/material";

interface ThumbnailProps {
  product: any;
  onImageChange: (file: File) => void;
}

const Thumbnail = ({ product, onImageChange }: ThumbnailProps) => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Debug: Log component props and state
  console.log('🖼️ Thumbnail component render:', {
    hasProduct: !!product,
    productTitle: product?.title,
    productPhoto: product?.photo,
    hasOnImageChange: typeof onImageChange === 'function',
    currentImageUrl: imageUrl,
    hasImageFile: !!imageFile
  });

  useEffect(() => {
    if (product && product.photo) {
      setImageUrl(product.photo);
    }
  }, [product]);

  // Open file input dialog on image click
  const handleImageClick = () => {
    console.log('🖼️ Image clicked! Opening file dialog...', {
      hasRef: !!fileInputRef.current,
      inputElement: fileInputRef.current
    });
    fileInputRef.current?.click();
    console.log('🖼️ File input click() called');
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('🖼️ Thumbnail handleFileChange called!', {
      eventType: event.type,
      hasFiles: !!event.target.files,
      fileCount: event.target.files?.length || 0
    });

    const file = event.target.files?.[0];
    console.log('🖼️ File selected:', {
      hasFile: !!file,
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type
    });

    if (!file) {
      console.log('🖼️ No file selected, returning early');
      return;
    }

    // Validate file size and type (optional)
    if (file.size > 1024 * 1024 * 5) {
      console.log('🖼️ File too large, showing alert');
      alert("File size is too large! Max 5MB allowed.");
      return;
    }

    console.log('🖼️ File validation passed, setting up preview');

    // Read and display image preview
    const reader = new FileReader();
    reader.onload = (e: any) => {
      console.log('🖼️ FileReader loaded, setting preview URL');
      setImageUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Set the image file for upload
    console.log('🖼️ Setting imageFile state and calling onImageChange callback');
    setImageFile(file);
    
    console.log('🖼️ CALLING onImageChange callback with file:', {
      callbackExists: typeof onImageChange === 'function',
      fileName: file.name
    });
    onImageChange(file);
    console.log('🖼️ onImageChange callback completed');
  };

  return (
    <Box p={3}>
      <Typography variant="h5">Thumbnail</Typography>
      <Box mt={3} mb={2} textAlign="center">
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: "none" }}
        />

        {imageUrl ? (
          <Box>
            <img
              src={imageUrl}
              alt="Preview"
              onClick={handleImageClick}
              style={{
                maxWidth: "300px",
                borderRadius: "7px",
                margin: "0 auto",
              }}
            />
          </Box>
        ) : null}

        <Typography variant="body2" textAlign="center">
          Click on image to change
        </Typography>
      </Box>
    </Box>
  );
};

export default Thumbnail;
