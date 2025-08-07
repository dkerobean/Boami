"use client";
import React, { useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Grid,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
} from "@mui/material";
import { SelectChangeEvent } from "@mui/material/Select";
import ModernBusinessTemplate from "./ModernBusinessTemplate";
import CorporateTemplate from "./CorporateTemplate";
import CreativeTemplate from "./CreativeTemplate";
import { InvoiceList } from "@/app/(dashboard)/types/apps/invoice";

export type TemplateType = "modern" | "corporate" | "creative";

interface TemplateSelectorProps {
  selectedTemplate: TemplateType;
  onTemplateChange: (template: TemplateType) => void;
  invoice?: InvoiceList;
  showPreview?: boolean;
}

const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  selectedTemplate,
  onTemplateChange,
  invoice,
  showPreview = true,
}) => {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<TemplateType>("modern");

  const templates = [
    {
      id: "modern" as TemplateType,
      name: "Modern Business",
      description: "Clean, minimal design perfect for modern businesses",
      color: "primary",
      features: ["Professional layout", "Brand colors", "Responsive design"],
    },
    {
      id: "corporate" as TemplateType,
      name: "Corporate",
      description: "Traditional, formal layout for enterprise use",
      color: "secondary",
      features: ["Formal styling", "Black & white", "Professional"],
    },
    {
      id: "creative" as TemplateType,
      name: "Creative",
      description: "Modern, colorful design for creative agencies",
      color: "info",
      features: ["Gradient design", "Colorful", "Creative layout"],
    },
  ];

  const handleTemplateSelect = (templateId: TemplateType) => {
    onTemplateChange(templateId);
  };

  const handlePreview = (templateId: TemplateType) => {
    setPreviewTemplate(templateId);
    setPreviewOpen(true);
  };

  const renderTemplatePreview = (templateType: TemplateType) => {
    if (!invoice) return null;

    switch (templateType) {
      case "modern":
        return <ModernBusinessTemplate invoice={invoice} />;
      case "corporate":
        return <CorporateTemplate invoice={invoice} />;
      case "creative":
        return <CreativeTemplate invoice={invoice} />;
      default:
        return null;
    }
  };

  if (!showPreview) {
    return (
      <FormControl fullWidth size="small">
        <InputLabel>Invoice Template</InputLabel>
        <Select
          value={selectedTemplate}
          label="Invoice Template"
          onChange={(event: SelectChangeEvent) =>
            handleTemplateSelect(event.target.value as TemplateType)
          }
        >
          {templates.map((template) => (
            <MenuItem key={template.id} value={template.id}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Typography>{template.name}</Typography>
                <Chip
                  size="small"
                  label={template.description}
                  color={template.color as any}
                  variant="outlined"
                />
              </Stack>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Choose Invoice Template
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Select a template that best represents your brand and business style.
      </Typography>
      
      <Grid container spacing={3}>
        {templates.map((template) => (
          <Grid item xs={12} sm={6} md={4} key={template.id}>
            <Card
              elevation={selectedTemplate === template.id ? 8 : 2}
              sx={{
                border: selectedTemplate === template.id ? 2 : 0,
                borderColor: `${template.color}.main`,
                transition: "all 0.2s ease-in-out",
                "&:hover": {
                  elevation: 6,
                  transform: "translateY(-2px)",
                },
              }}
            >
              <CardActionArea onClick={() => handleTemplateSelect(template.id)}>
                <CardContent>
                  <Stack spacing={2}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="h6" fontWeight={600}>
                        {template.name}
                      </Typography>
                      {selectedTemplate === template.id && (
                        <Chip
                          size="small"
                          label="Selected"
                          color={template.color as any}
                        />
                      )}
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary">
                      {template.description}
                    </Typography>
                    
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      {template.features.map((feature, index) => (
                        <Chip
                          key={index}
                          size="small"
                          label={feature}
                          variant="outlined"
                          sx={{ fontSize: "0.7rem" }}
                        />
                      ))}
                    </Stack>
                    
                    {invoice && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePreview(template.id);
                        }}
                        sx={{ mt: 2 }}
                      >
                        Preview
                      </Button>
                    )}
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Preview Dialog */}
      {invoice && (
        <Dialog
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          maxWidth="lg"
          fullWidth
          PaperProps={{
            sx: { height: "90vh" }
          }}
        >
          <DialogTitle>
            Template Preview: {templates.find(t => t.id === previewTemplate)?.name}
          </DialogTitle>
          <DialogContent>
            <Box
              sx={{
                height: "100%",
                overflow: "auto",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
              }}
            >
              {renderTemplatePreview(previewTemplate)}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPreviewOpen(false)}>
              Close
            </Button>
            <Button
              variant="contained"
              onClick={() => {
                handleTemplateSelect(previewTemplate);
                setPreviewOpen(false);
              }}
            >
              Use This Template
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};

export default TemplateSelector;