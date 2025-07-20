"use client";
import React, { useState, useRef } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  Avatar,
  Stack,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  IconUpload,
  IconX,
  IconPhoto,
  IconCheck,
} from "@tabler/icons-react";

interface LogoUploadProps {
  logoUrl?: string;
  onLogoChange: (logoUrl: string | null) => void;
  maxSize?: number; // in MB
  acceptedFormats?: string[];
  disabled?: boolean;
}

const LogoUpload: React.FC<LogoUploadProps> = ({
  logoUrl,
  onLogoChange,
  maxSize = 2,
  acceptedFormats = ["image/jpeg", "image/png", "image/svg+xml"],
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(logoUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!acceptedFormats.includes(file.type)) {
      return `Invalid file format. Please use: ${acceptedFormats
        .map(f => f.split('/')[1].toUpperCase())
        .join(', ')}`;
    }

    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      return `File size must be less than ${maxSize}MB`;
    }

    return null;
  };

  const handleFileUpload = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // Create a preview URL for immediate feedback
      const previewUrl = URL.createObjectURL(file);
      setPreview(previewUrl);

      // Upload to server
      const formData = new FormData();
      formData.append('logo', file);
      
      const response = await fetch('/api/company/logo', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Use the server URL instead of local preview
        setPreview(result.data.logoUrl);
        onLogoChange(result.data.logoUrl);
      } else {
        throw new Error(result.message || 'Upload failed');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to upload logo. Please try again.");
      console.error("Logo upload error:", error);
      // Reset preview on error
      setPreview(logoUrl || null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleRemoveLogo = () => {
    setPreview(null);
    onLogoChange(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClick = () => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Company Logo
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>
        Upload your company logo to appear on invoices. Max size: {maxSize}MB
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper
        variant="outlined"
        sx={{
          p: 3,
          textAlign: "center",
          border: preview ? "2px solid" : "2px dashed",
          borderColor: isDragging 
            ? "primary.main" 
            : preview 
            ? "success.main" 
            : "grey.300",
          bgcolor: isDragging 
            ? "primary.light" 
            : preview 
            ? "success.light" 
            : "background.paper",
          cursor: disabled || isUploading ? "not-allowed" : "pointer",
          transition: "all 0.2s ease-in-out",
          opacity: disabled ? 0.6 : 1,
          "&:hover": {
            borderColor: disabled || isUploading ? undefined : (preview ? "success.main" : "primary.main"),
            bgcolor: disabled || isUploading ? undefined : (preview ? "success.light" : "primary.light"),
          },
        }}
        onDrop={disabled ? undefined : handleDrop}
        onDragOver={disabled ? undefined : handleDragOver}
        onDragLeave={disabled ? undefined : handleDragLeave}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedFormats.join(",")}
          onChange={handleFileSelect}
          disabled={disabled || isUploading}
          style={{ display: "none" }}
        />

        {isUploading ? (
          <Stack alignItems="center" spacing={2}>
            <CircularProgress size={40} />
            <Typography variant="body2">Uploading logo...</Typography>
          </Stack>
        ) : preview ? (
          <Stack alignItems="center" spacing={2}>
            <Box position="relative">
              <Avatar
                src={preview}
                alt="Company Logo"
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: 2,
                }}
                variant="rounded"
              >
                <IconPhoto />
              </Avatar>
              <Tooltip title="Remove logo">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveLogo();
                  }}
                  sx={{
                    position: "absolute",
                    top: -8,
                    right: -8,
                    bgcolor: "error.main",
                    color: "white",
                    "&:hover": {
                      bgcolor: "error.dark",
                    },
                  }}
                >
                  <IconX size={16} />
                </IconButton>
              </Tooltip>
            </Box>
            <Box display="flex" alignItems="center" gap={1}>
              <IconCheck color="green" size={20} />
              <Typography variant="body2" color="success.main" fontWeight={500}>
                Logo uploaded successfully
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">
              Click to change logo
            </Typography>
          </Stack>
        ) : (
          <Stack alignItems="center" spacing={2}>
            <Avatar
              sx={{
                width: 80,
                height: 80,
                bgcolor: "grey.100",
                borderRadius: 2,
              }}
              variant="rounded"
            >
              <IconUpload size={32} color="grey" />
            </Avatar>
            <Box>
              <Typography variant="h6" gutterBottom>
                Upload Logo
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Drag and drop your logo here, or click to browse
              </Typography>
              <Button
                variant="outlined"
                startIcon={<IconUpload />}
                disabled={disabled || isUploading}
                onClick={(e) => {
                  e.stopPropagation();
                  handleClick();
                }}
              >
                Choose File
              </Button>
            </Box>
          </Stack>
        )}
      </Paper>

      <Typography variant="caption" display="block" mt={1} color="text.secondary">
        Supported formats: {acceptedFormats.map(f => f.split('/')[1].toUpperCase()).join(', ')}
      </Typography>
    </Box>
  );
};

export default LogoUpload;