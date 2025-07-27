'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  CircularProgress,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  IconPlus,
  IconRefresh,
  IconSettings,
  IconTrash,
  IconCheck,
  IconX,
  IconClock,
  IconExternalLink,
  IconDotsVertical
} from '@tabler/icons-react';

interface Connection {
  _id: string;
  name: string;
  siteUrl: string;
  isActive: boolean;
  testResult?: {
    success: boolean;
    message: string;
    testedAt: Date;
  };
  importStats: {
    totalProducts: number;
    lastImportDate?: Date;
    totalSynced: number;
    totalErrors: number;
  };
}

interface WordPressConnectionManagerProps {
  connections: Connection[];
  selectedConnection: Connection | null;
  onConnectionSelect: (connection: Connection) => void;
  onConnectionUpdate: () => void;
  loading: boolean;
}

interface NewConnectionForm {
  name: string;
  siteUrl: string;
  consumerKey: string;
  consumerSecret: string;
  version: string;
  isWooCommerce: boolean;
  isActive: boolean;
}

const WordPressConnectionManager: React.FC<WordPressConnectionManagerProps> = ({
  connections,
  selectedConnection,
  onConnectionSelect,
  onConnectionUpdate,
  loading
}) => {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [testingConnection, setTestingConnection] = useState<string | null>(null);
  const [connectionToEdit, setConnectionToEdit] = useState<Connection | null>(null);
  const [connectionToDelete, setConnectionToDelete] = useState<Connection | null>(null);
  const [actionMenuAnchor, setActionMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedConnectionForMenu, setSelectedConnectionForMenu] = useState<Connection | null>(null);
  const [formData, setFormData] = useState<NewConnectionForm>({
    name: '',
    siteUrl: '',
    consumerKey: '',
    consumerSecret: '',
    version: 'wc/v3',
    isWooCommerce: true,
    isActive: true
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleAddConnection = () => {
    setFormData({
      name: '',
      siteUrl: '',
      consumerKey: '',
      consumerSecret: '',
      version: 'wc/v3',
      isWooCommerce: true,
      isActive: true
    });
    setFormError(null);
    setAddDialogOpen(true);
  };

  const handleEditConnection = (connection: Connection) => {
    setConnectionToEdit(connection);
    setFormData({
      name: connection.name,
      siteUrl: connection.siteUrl,
      consumerKey: '',
      consumerSecret: '',
      version: 'wc/v3',
      isWooCommerce: true,
      isActive: connection.isActive
    });
    setFormError(null);
    setEditDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteConnection = (connection: Connection) => {
    setConnectionToDelete(connection);
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, connection: Connection) => {
    setActionMenuAnchor(event.currentTarget);
    setSelectedConnectionForMenu(connection);
  };

  const handleMenuClose = () => {
    setActionMenuAnchor(null);
    setSelectedConnectionForMenu(null);
  };

  const handleTestConnection = async (connectionId: string) => {
    setTestingConnection(connectionId);
    
    try {
      const response = await fetch(`/api/wordpress/connections/${connectionId}/test`, {
        method: 'POST',
      });
      
      const result = await response.json();
      
      if (result.success) {
        onConnectionUpdate();
      }
    } catch (error) {
      console.error('Error testing connection:', error);
    } finally {
      setTestingConnection(null);
    }
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setFormError('Connection name is required');
      return false;
    }
    if (!formData.siteUrl.trim()) {
      setFormError('Site URL is required');
      return false;
    }
    if (!formData.consumerKey.trim()) {
      setFormError('Consumer Key is required');
      return false;
    }
    if (!formData.consumerSecret.trim()) {
      setFormError('Consumer Secret is required');
      return false;
    }

    // Validate URL format
    try {
      new URL(formData.siteUrl);
    } catch {
      setFormError('Please enter a valid URL');
      return false;
    }

    setFormError(null);
    return true;
  };

  const handleSaveConnection = async () => {
    if (!validateForm()) return;

    setSaving(true);
    
    try {
      const url = connectionToEdit 
        ? `/api/wordpress/connections/${connectionToEdit._id}`
        : '/api/wordpress/connections';
      
      const method = connectionToEdit ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        setAddDialogOpen(false);
        setEditDialogOpen(false);
        setConnectionToEdit(null);
        onConnectionUpdate();
      } else {
        setFormError(result.error || 'Failed to save connection');
      }
    } catch (error) {
      setFormError('Failed to save connection');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!connectionToDelete) return;

    setSaving(true);
    
    try {
      const response = await fetch(`/api/wordpress/connections/${connectionToDelete._id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        setDeleteDialogOpen(false);
        setConnectionToDelete(null);
        onConnectionUpdate();
      }
    } catch (error) {
      console.error('Error deleting connection:', error);
    } finally {
      setSaving(false);
    }
  };

  const getConnectionStatusColor = (connection: Connection) => {
    if (!connection.isActive) return 'default';
    if (!connection.testResult) return 'warning';
    return connection.testResult.success ? 'success' : 'error';
  };

  const getConnectionStatusText = (connection: Connection) => {
    if (!connection.isActive) return 'Inactive';
    if (!connection.testResult) return 'Not Tested';
    return connection.testResult.success ? 'Connected' : 'Connection Failed';
  };

  const formatDate = (date?: Date) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString();
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" gutterBottom>
            WordPress Connections
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Select a WordPress/WooCommerce connection to import products from
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<IconPlus />}
          onClick={handleAddConnection}
        >
          Add Connection
        </Button>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : connections.length === 0 ? (
        <Alert severity="info">
          No WordPress connections found. Add a connection to start importing products.
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {connections.map((connection) => (
            <Grid item xs={12} md={6} lg={4} key={connection._id}>
              <Card 
                sx={{ 
                  cursor: 'pointer',
                  border: selectedConnection?._id === connection._id ? 2 : 1,
                  borderColor: selectedConnection?._id === connection._id ? 'primary.main' : 'divider',
                  '&:hover': {
                    boxShadow: 3
                  }
                }}
                onClick={() => onConnectionSelect(connection)}
              >
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Box flex={1}>
                      <Typography variant="h6" gutterBottom>
                        {connection.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {connection.siteUrl}
                      </Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Chip
                        label={getConnectionStatusText(connection)}
                        color={getConnectionStatusColor(connection)}
                        size="small"
                      />
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMenuClick(e, connection);
                        }}
                      >
                        <IconDotsVertical size={18} />
                      </IconButton>
                    </Box>
                  </Box>

                  <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Products: {connection.importStats.totalProducts.toLocaleString()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Last Import: {formatDate(connection.importStats.lastImportDate)}
                      </Typography>
                    </Box>
                    <Box>
                      <Tooltip title="Test Connection">
                        <span>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTestConnection(connection._id);
                            }}
                            disabled={testingConnection === connection._id}
                          >
                            {testingConnection === connection._id ? (
                              <CircularProgress size={16} />
                            ) : (
                              <IconRefresh size={18} />
                            )}
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Action Menu */}
      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => selectedConnectionForMenu && handleEditConnection(selectedConnectionForMenu)}>
          <ListItemIcon>
            <IconSettings size={18} />
          </ListItemIcon>
          <ListItemText>Edit Connection</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => selectedConnectionForMenu && handleTestConnection(selectedConnectionForMenu._id)}>
          <ListItemIcon>
            <IconRefresh size={18} />
          </ListItemIcon>
          <ListItemText>Test Connection</ListItemText>
        </MenuItem>
        <MenuItem 
          onClick={() => selectedConnectionForMenu && handleDeleteConnection(selectedConnectionForMenu)}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <IconTrash size={18} color="red" />
          </ListItemIcon>
          <ListItemText>Delete Connection</ListItemText>
        </MenuItem>
      </Menu>

      {/* Add/Edit Connection Dialog */}
      <Dialog 
        open={addDialogOpen || editDialogOpen} 
        onClose={() => {
          setAddDialogOpen(false);
          setEditDialogOpen(false);
          setConnectionToEdit(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {connectionToEdit ? 'Edit Connection' : 'Add WordPress Connection'}
        </DialogTitle>
        <DialogContent>
          <Box mt={2}>
            {formError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {formError}
              </Alert>
            )}
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="Connection Name"
                  fullWidth
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="My WooCommerce Store"
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  label="Site URL"
                  fullWidth
                  value={formData.siteUrl}
                  onChange={(e) => setFormData({ ...formData, siteUrl: e.target.value })}
                  placeholder="https://yourstore.com"
                  helperText="Enter the full URL of your WordPress/WooCommerce site"
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  label="Consumer Key"
                  fullWidth
                  value={formData.consumerKey}
                  onChange={(e) => setFormData({ ...formData, consumerKey: e.target.value })}
                  placeholder="ck_..."
                  helperText="WooCommerce REST API Consumer Key"
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  label="Consumer Secret"
                  fullWidth
                  type="password"
                  value={formData.consumerSecret}
                  onChange={(e) => setFormData({ ...formData, consumerSecret: e.target.value })}
                  placeholder="cs_..."
                  helperText="WooCommerce REST API Consumer Secret"
                />
              </Grid>
              
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.isWooCommerce}
                      onChange={(e) => setFormData({ ...formData, isWooCommerce: e.target.checked })}
                    />
                  }
                  label="WooCommerce Store"
                />
              </Grid>
              
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    />
                  }
                  label="Active Connection"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setAddDialogOpen(false);
              setEditDialogOpen(false);
              setConnectionToEdit(null);
            }}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSaveConnection}
            variant="contained"
            disabled={saving}
          >
            {saving ? <CircularProgress size={20} /> : connectionToEdit ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={deleteDialogOpen} 
        onClose={() => {
          setDeleteDialogOpen(false);
          setConnectionToDelete(null);
        }}
      >
        <DialogTitle>Delete Connection</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the connection "{connectionToDelete?.name}"? 
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setDeleteDialogOpen(false);
              setConnectionToDelete(null);
            }}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={saving}
          >
            {saving ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WordPressConnectionManager;