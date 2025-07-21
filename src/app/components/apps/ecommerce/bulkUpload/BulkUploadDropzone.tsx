'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Box, Typography, Button, LinearProgress, Alert, List, ListItem, ListItemText, ListItemIcon, IconButton } from '@mui/material';
import { IconUpload, IconFile, IconX, IconCheck, IconAlertCircle } from '@tabler/icons-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

interface ParsedData {
  headers: string[];
  data: any[];
  totalRows: number;
  previewData: any[];
}

interface BulkUploadDropzoneProps {
  onFileUpload: (file: File, data: ParsedData) => void;
}

interface UploadFile {
  file: File;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  error?: string;
  data?: ParsedData;
}

const BulkUploadDropzone: React.FC<BulkUploadDropzoneProps> = ({ onFileUpload }) => {
  const [files, setFiles] = useState<UploadFile[]>([]);

  const validateFile = (file: File): string | null => {
    // Check file type
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    const allowedExtensions = ['.csv', '.xls', '.xlsx'];
    
    const hasValidType = allowedTypes.includes(file.type);
    const hasValidExtension = allowedExtensions.some(ext => 
      file.name.toLowerCase().endsWith(ext)
    );
    
    if (!hasValidType && !hasValidExtension) {
      return 'Invalid file type. Please upload a CSV or Excel file.';
    }
    
    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return 'File size too large. Maximum size is 10MB.';
    }
    
    // Check file name
    if (file.name.length > 255) {
      return 'File name too long. Maximum length is 255 characters.';
    }
    
    return null;
  };

  const processCSVFile = (file: File, uploadFile: UploadFile) => {
    return new Promise<ParsedData>((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
        transform: (value) => value.trim(),
        complete: (results) => {
          try {
            if (results.errors.length > 0) {
              const criticalErrors = results.errors.filter(error => 
                error.type === 'Delimiter' || error.type === 'Quotes'
              );
              
              if (criticalErrors.length > 0) {
                throw new Error(`CSV parsing error: ${criticalErrors[0].message}`);
              }
            }
            
            const data = results.data as any[];
            const headers = results.meta.fields || [];
            
            if (headers.length === 0) {
              throw new Error('No headers found in CSV file');
            }
            
            if (data.length === 0) {
              throw new Error('No data rows found in CSV file');
            }
            
            // Validate required columns
            const requiredColumns = ['name', 'sku', 'price'];
            const lowercaseHeaders = headers.map(h => h.toLowerCase());
            const missingColumns = requiredColumns.filter(col => 
              !lowercaseHeaders.some(header => header.includes(col))
            );
            
            if (missingColumns.length > 0) {
              console.warn(`Recommended columns not found: ${missingColumns.join(', ')}`);
            }
            
            // Create preview data (first 5 rows)
            const previewData = data.slice(0, 5);
            
            const parsedData: ParsedData = {
              headers,
              data,
              totalRows: data.length,
              previewData,
            };
            
            resolve(parsedData);
          } catch (error) {
            reject(error);
          }
        },
        error: (error) => {
          reject(new Error(`Failed to parse CSV: ${error.message}`));
        }
      });
    });
  };

  const processExcelFile = (file: File, uploadFile: UploadFile) => {
    return new Promise<ParsedData>((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Get the first worksheet
          const sheetName = workbook.SheetNames[0];
          if (!sheetName) {
            throw new Error('No worksheets found in Excel file');
          }
          
          const worksheet = workbook.Sheets[sheetName];
          
          // Convert to JSON with headers
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1,
            defval: '',
            blankrows: false 
          }) as any[][];
          
          if (jsonData.length === 0) {
            throw new Error('No data found in Excel file');
          }
          
          // Extract headers from first row
          const headers = jsonData[0].map((header: any) => String(header).trim()).filter(Boolean);
          
          if (headers.length === 0) {
            throw new Error('No headers found in Excel file');
          }
          
          // Convert remaining rows to objects
          const dataRows = jsonData.slice(1).map(row => {
            const obj: any = {};
            headers.forEach((header, index) => {
              obj[header] = row[index] ? String(row[index]).trim() : '';
            });
            return obj;
          }).filter(row => Object.values(row).some(val => val !== ''));
          
          if (dataRows.length === 0) {
            throw new Error('No data rows found in Excel file');
          }
          
          // Validate required columns (warn but don't fail)
          const requiredColumns = ['name', 'sku', 'price'];
          const lowercaseHeaders = headers.map(h => h.toLowerCase());
          const missingColumns = requiredColumns.filter(col => 
            !lowercaseHeaders.some(header => header.includes(col))
          );
          
          if (missingColumns.length > 0) {
            console.warn(`Recommended columns not found: ${missingColumns.join(', ')}`);
          }
          
          // Create preview data (first 5 rows)
          const previewData = dataRows.slice(0, 5);
          
          const parsedData: ParsedData = {
            headers,
            data: dataRows,
            totalRows: dataRows.length,
            previewData,
          };
          
          resolve(parsedData);
        } catch (error) {
          reject(new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read Excel file'));
      };
      
      reader.readAsArrayBuffer(file);
    });
  };

  const processFile = async (file: File, uploadFile: UploadFile) => {
    try {
      setFiles(prev => prev.map(f => 
        f.file === file ? { ...f, status: 'processing', progress: 20 } : f
      ));
      
      let parsedData: ParsedData;
      
      if (file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv')) {
        parsedData = await processCSVFile(file, uploadFile);
      } else {
        parsedData = await processExcelFile(file, uploadFile);
      }
      
      setFiles(prev => prev.map(f => 
        f.file === file ? { 
          ...f, 
          status: 'completed', 
          progress: 100, 
          data: parsedData 
        } : f
      ));
      
      // Auto-proceed with the file
      setTimeout(() => {
        onFileUpload(file, parsedData);
      }, 500);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setFiles(prev => prev.map(f => 
        f.file === file ? { 
          ...f, 
          status: 'error', 
          progress: 0, 
          error: errorMessage 
        } : f
      ));
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => {
      const validationError = validateFile(file);
      
      const uploadFile: UploadFile = {
        file,
        status: validationError ? 'error' : 'pending',
        progress: 0,
        error: validationError || undefined,
      };
      
      if (!validationError) {
        processFile(file, uploadFile);
      }
      
      return uploadFile;
    });
    
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxFiles: 1,
    multiple: false,
  });

  const removeFile = (fileToRemove: File) => {
    setFiles(prev => prev.filter(f => f.file !== fileToRemove));
  };

  const getFileIcon = (file: File) => {
    if (file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv')) {
      return <IconFile size={20} color="green" />;
    }
    return <IconFile size={20} color="blue" />;
  };

  const getStatusIcon = (uploadFile: UploadFile) => {
    switch (uploadFile.status) {
      case 'completed':
        return <IconCheck size={20} color="green" />;
      case 'error':
        return <IconAlertCircle size={20} color="red" />;
      case 'processing':
        return <IconUpload size={20} color="blue" />;
      default:
        return <IconUpload size={20} color="gray" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Box>
      {/* Dropzone */}
      <Box
        {...getRootProps()}
        sx={{
          border: '2px dashed',
          borderColor: isDragActive ? 'primary.main' : 'divider',
          borderRadius: 2,
          p: 4,
          textAlign: 'center',
          cursor: 'pointer',
          bgcolor: isDragActive ? 'action.hover' : 'background.paper',
          transition: 'all 0.2s ease',
          '&:hover': {
            borderColor: 'primary.main',
            bgcolor: 'action.hover',
          },
        }}
      >
        <input {...getInputProps()} />
        <IconUpload size={48} color="gray" />
        <Typography variant="h6" mt={2}>
          {isDragActive ? 'Drop your file here' : 'Drag & drop a file here'}
        </Typography>
        <Typography variant="body2" color="text.secondary" mt={1}>
          or click to browse files
        </Typography>
        <Button variant="outlined" sx={{ mt: 2 }}>
          Choose File
        </Button>
        <Typography variant="caption" display="block" mt={2} color="text.secondary">
          Supported formats: CSV, XLS, XLSX (max 10MB)
        </Typography>
      </Box>

      {/* File List */}
      {files.length > 0 && (
        <Box mt={3}>
          <Typography variant="h6" mb={2}>
            Uploaded Files
          </Typography>
          <List>
            {files.map((uploadFile, index) => (
              <ListItem 
                key={index}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  mb: 1,
                  bgcolor: 'background.paper',
                }}
              >
                <ListItemIcon>
                  {getFileIcon(uploadFile.file)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={2}>
                      <Typography variant="subtitle2">
                        {uploadFile.file.name}
                      </Typography>
                      {getStatusIcon(uploadFile)}
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        {formatFileSize(uploadFile.file.size)}
                      </Typography>
                      {uploadFile.status === 'processing' && (
                        <Box mt={1}>
                          <LinearProgress
                            variant="determinate"
                            value={uploadFile.progress}
                            sx={{ height: 4, borderRadius: 2 }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            Processing... {uploadFile.progress}%
                          </Typography>
                        </Box>
                      )}
                      {uploadFile.error && (
                        <Alert severity="error" sx={{ mt: 1 }}>
                          {uploadFile.error}
                        </Alert>
                      )}
                      {uploadFile.status === 'completed' && uploadFile.data && (
                        <Alert severity="success" sx={{ mt: 1 }}>
                          Successfully processed {uploadFile.data.totalRows} rows
                        </Alert>
                      )}
                    </Box>
                  }
                />
                <IconButton 
                  onClick={() => removeFile(uploadFile.file)}
                  size="small"
                >
                  <IconX size={16} />
                </IconButton>
              </ListItem>
            ))}
          </List>
        </Box>
      )}
    </Box>
  );
};

export default BulkUploadDropzone;