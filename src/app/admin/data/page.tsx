'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AdminLayout } from '@/components/layouts/admin-layout';
import {
  DatabaseIcon,
  DownloadIcon,
  UploadIcon,
  TrashIcon,
  RefreshCwIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  InfoIcon
} from 'lucide-react';

interface Operation {
  id: string;
  name: string;
  description: string;
  category: string;
  destructive: boolean;
  options?: any;
}

interface OperationResult {
  success: boolean;
  processed?: number;
  deleted?: number;
  exported?: number;
  errors: number;
  details: string[];
  filePath?: string;
}

export default function AdminDataPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  // State
  const [loading, setLoading] = useState(true);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [selectedOperation, setSelectedOperation] = useState<Operation | null>(null);
  const [operationOptions, setOperationOptions] = useState<any>({});
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<OperationResult | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check authentication
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/admin/data');
    } else if (status === 'authenticated' && session?.user?.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [status, session, router]);

  // Fetch available operations
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role === 'admin') {
      fetchOperations();
    }
  }, [status, session]);

  const fetchOperations = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/data/migration', {
        headers: {
          'Authorization': `Bearer ${session?.accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch operations');
      }

      const data = await response.json();

      if (data.success) {
        setOperations(data.data.operations);
      } else {
        throw new Error(data.error || 'Failed to fetch operations');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOperationSelect = (operation: Operation) => {
    setSelectedOperation(operation);
    setOperationOptions({});
    setResult(null);
  };

  const handleOptionChange = (key: string, value: any) => {
    setOperationOptions(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const executeOperation = async () => {
    if (!selectedOperation) return;

    try {
      setExecuting(true);
      setError(null);
      setResult(null);

      const response = await fetch('/api/admin/data/migration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.accessToken}`
        },
        body: JSON.stringify({
          operation: selectedOperation.id,
          options: operationOptions
        })
      });

      if (!response.ok) {
        throw new Error('Operation failed');
      }

      const data = await response.json();

      if (data.success) {
        setResult(data.data.result);
      } else {
        throw new Error(data.error || 'Operation failed');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setExecuting(false);
      setShowConfirmDialog(false);
    }
  };

  const handleExecuteClick = () => {
    if (selectedOperation?.destructive) {
      setShowConfirmDialog(true);
    } else {
      executeOperation();
    }
  };

  const renderOperationOptions = (operation: Operation) => {
    if (!operation.options) return null;

    return (
      <div className="space-y-4">
        <h4 className="text-sm font-medium">Options</h4>
        {Object.entries(operation.options).map(([key, option]: [string, any]) => (
          <div key={key} className="space-y-2">
            <Label htmlFor={key}>{option.description || key}</Label>
            {option.type === 'select' ? (
              <Select
                value={operationOptions[key] || option.default}
                onValueChange={(value) => handleOptionChange(key, value)}
              >
                <SelectTrigger>
ectValue placeholder={`Select ${key}`} />
                </SelectTrigger>
                <SelectContent>
                  {option.options.map((opt: string) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id={key}
                type={option.type === 'number' ? 'number' : 'text'}
                placeholder={option.default?.toString() || ''}
                value={operationOptions[key] || ''}
                onChange={(e) => handleOptionChange(key, e.target.value)}
                required={option.required}
              />
            )}
            {option.default && (
              <p className="text-xs text-muted-foreground">
                Default: {option.default}
              </p>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderResult = (result: OperationResult) => {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {result.success ? (
              <CheckCircleIcon className="h-5 w-5 text-green-500" />
            ) : (
              <XCircleIcon className="h-5 w-5 text-red-500" />
            )}
            <span>Operation Result</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {result.processed !== undefined && (
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {result.processed}
                </div>
                <div className="text-sm text-muted-foreground">Processed</div>
              </div>
            )}

            {result.deleted !== undefined && (
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {result.deleted}
                </div>
                <div className="text-sm text-muted-foreground">Deleted</div>
              </div>
            )}

            {result.exported !== undefined && (
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {result.exported}
                </div>
                <div className="text-sm text-muted-foreground">Exported</div>
              </div>
            )}

            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {result.errors}
              </div>
              <div className="text-sm text-muted-foreground">Errors</div>
            </div>
          </div>

          {result.filePath && (
            <div className="mt-4 p-3 bg-muted rounded-md">
              <div className="text-sm font-medium">Output File:</div>
              <div className="text-sm text-muted-foreground font-mono">
                {result.filePath}
              </div>
            </div>
          )}

          {result.details.length > 0 && (
            <div className="mt-4">
              <h5 className="text-sm font-medium mb-2">Details:</h5>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {result.details.map((detail, index) => (
                  <div key={index} className="text-sm text-muted-foreground">
                    • {detail}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'migration':
        return <RefreshCwIcon className="h-4 w-4" />;
      case 'cleanup':
        return <TrashIcon className="h-4 w-4" />;
      case 'export':
        return <DownloadIcon className="h-4 w-4" />;
      case 'backup':
        return <DatabaseIcon className="h-4 w-4" />;
      default:
        return <InfoIcon className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'migration':
        return 'bg-blue-100 text-blue-800';
      case 'cleanup':
        return 'bg-red-100 text-red-800';
      case 'export':
        return 'bg-green-100 text-green-800';
      case 'backup':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Data Management</h1>
            <p className="text-muted-foreground">
              Manage subscription data migration, cleanup, and backup operations
            </p>
          </div>
          <Button onClick={fetchOperations} variant="outline" size="icon">
            <RefreshCwIcon className="h-4 w-4" />
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangleIcon className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 md:grid-cols-3">
          {/* Operations List */}
          <div className="md:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Available Operations</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-4">
                    <Spinner />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {operations.map((operation) => (
                      <div
                        key={operation.id}
                        className={`p-3 rounded-md border cursor-pointer transition-colors ${
                          selectedOperation?.id === operation.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:bg-muted'
                        }`}
                        onClick={() => handleOperationSelect(operation)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            {getCategoryIcon(operation.category)}
                            <span className="font-medium text-sm">
                              {operation.name}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Badge
                              variant="secondary"
                              className={getCategoryColor(operation.category)}
                            >
                              {operation.category}
                            </Badge>
                            {operation.destructive && (
                              <Badge variant="destructive" className="text-xs">
                                Destructive
                              </Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {operation.description}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Operation Details */}
          <div className="md:col-span-2">
            {selectedOperation ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    {getCategoryIcon(selectedOperation.category)}
                    <span>{selectedOperation.name}</span>
                    {selectedOperation.destructive && (
                      <Badge variant="destructive">Destructive</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-6">
                    {selectedOperation.description}
                  </p>

                  {selectedOperation.destructive && (
                    <Alert variant="destructive" className="mb-6">
                      <AlertTriangleIcon className="h-4 w-4" />
                      <AlertTitle>Warning</AlertTitle>
                      <AlertDescription>
                        This operation is destructive and may permanently delete data.
                        Make sure you have a backup before proceeding.
                      </AlertDescription>
                    </Alert>
                  )}

                  {renderOperationOptions(selectedOperation)}

                  <div className="mt-6">
                    <Button
                      onClick={handleExecuteClick}
                      disabled={executing}
                      className="w-full"
                    >
                      {executing ? (
                        <>
                          <Spinner size="sm" className="mr-2" />
                          Executing...
                        </>
                      ) : (
                        `Execute ${selectedOperation.name}`
                      )}
                    </Button>
                  </div>

                  {result && renderResult(result)}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <DatabaseIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Select an Operation</h3>
                    <p className="text-muted-foreground">
                      Choose an operation from the list to get started
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <AlertTriangleIcon className="h-5 w-5 text-red-500" />
              <span>Confirm Destructive Operation</span>
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground mb-4">
              You are about to execute a destructive operation that may permanently
              delete or modify data:
            </p>
            <div className="p-3 bg-muted rounded-md">
              <div className="font-medium">{selectedOperation?.name}</div>
              <div className="text-sm text-muted-foreground">
                {selectedOperation?.description}
              </div>
            </div>
            <p className="text-sm text-red-600 mt-4">
              This action cannot be undone. Make sure you have a backup before proceeding.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={executeOperation}
              disabled={executing}
            >
              {executing ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Executing...
                </>
              ) : (
                'Confirm & Execute'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}