'use client';

import React, { useState, useCallback } from 'react';
import {
  Box,
  Avatar,
  Button,
  Typography,
  CircularProgress,
  IconButton,
  Paper,
  alpha,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { IconCamera, IconUpload, IconX } from '@tabler/icons-react';

interface ProfileImageUploadProps {
  currentImage?: string;
  onImageUpload: (file: File) => Promise<boolean>;
  loading?: boolean;
  size?: number;
}

const DropZone = styled(Paper)(({ theme }) => ({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(3),
  border: `2px dashed ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius * 2,
  cursor: 'pointer',
  transition: 'all 0.2s ease-in-out',
  backgroundColor: alpha(theme.palette.primary.main, 0.02),
  
  '&:hover': {
    borderColor: theme.palette.primary.main,
    backgroundColor: alpha(theme.palette.primary.main, 0.08),
  },
  
  '&.dragover': {
    borderColor: theme.palette.primary.main,
    backgroundColor: alpha(theme.palette.primary.main, 0.12),
    transform: 'scale(1.02)',
  },
}));

const ProfileImageUpload: React.FC<ProfileImageUploadProps> = ({
  currentImage,
  onImageUpload,
  loading = false,
  size = 120,
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const getDisplayImage = () => {
    if (preview) return preview;
    if (currentImage) return currentImage;
    return "/images/profile/user-1.jpg";
  };

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!file.type.startsWith('image/')) {
      return 'Please select a valid image file';
    }
    
    // Check file size (max 800KB)
    if (file.size > 800 * 1024) {
      return 'Image size must be less than 800KB';
    }
    
    return null;
  };

  const handleFileSelect = useCallback((file: File) => {
    const error = validateFile(file);
    if (error) {
      alert(error);
      return;
    }

    setSelectedFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    
    const file = event.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      const success = await onImageUpload(selectedFile);
      if (success) {
        setPreview(null);
        setSelectedFile(null);
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setPreview(null);
    setSelectedFile(null);
  };

  return (
    <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
      {/* Profile Image Display */}
      <Box position="relative">
        <Avatar
          src={getDisplayImage()}
          alt="Profile"
          sx={{
            width: size,
            height: size,
            border: 4,
            borderColor: 'background.paper',
            boxShadow: 3,
          }}
        />
        {(loading || uploading) && (
          <Box
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            display="flex"
            alignItems="center"
            justifyContent="center"
            bgcolor="rgba(0, 0, 0, 0.5)"
            borderRadius="50%"
          >
            <CircularProgress size={24} sx={{ color: 'white' }} />
          </Box>
        )}
      </Box>

      {/* Upload Actions */}
      {!selectedFile ? (
        <DropZone
          className={dragOver ? 'dragover' : ''}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => document.getElementById('profile-image-input')?.click()}
        >
          <input
            id="profile-image-input"
            type="file"
            accept="image/*"
            onChange={handleFileInput}
            style={{ display: 'none' }}
          />
          
          <IconCamera size={32} style={{ opacity: 0.6, marginBottom: 8 }} />
          <Typography variant="body1" fontWeight={500} gutterBottom>
            Upload Profile Picture
          </Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Drag and drop or click to select<br />
            JPG, PNG, GIF up to 800KB
          </Typography>
        </DropZone>
      ) : (
        <Box display="flex" gap={2}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<IconUpload size={18} />}
            onClick={handleUpload}
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<IconX size={18} />}
            onClick={handleCancel}
            disabled={uploading}
          >
            Cancel
          </Button>
        </Box>
      )}

      {/* Info Text */}
      <Typography variant="caption" color="text.secondary" textAlign="center">
        For best results, use a square image at least 200x200 pixels
      </Typography>
    </Box>
  );
};

export default ProfileImageUpload;