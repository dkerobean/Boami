/**
 * React Hook for Real-time Synchronization
 * Provides real-time data synchronization capabilities to React components
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import RealTimeSync, { OptimisticUpdate, SyncResult } from '@/lib/utils/real-time-sync';
import { NotificationSystem } from '@/lib/utils/notification-system';

export interface UseRealTimeSyncOptions {
  dataType: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
  onUpdate?: (data: any) => void;
  onError?: (error: string) => void;
}

export interface UseRealTimeSyncReturn<T> {
  // State
  data: T[];
  loading: boolean;
  error: string | null;
  pendingUpdates: OptimisticUpdate<T>[];
  hasPendingUpdates: boolean;

  // Actions
  optimisticCreate: (data: T, apiCall: () => Promise<T>) => Promise<SyncResult<T>>;
  optimisticUpdate: (id: string, data: T, apiCall: () => Promise<T>, originalData?: T) => Promise<SyncResult<T>>;
  optimisticDelete: (id: string, data: T, apiCall: () => Promise<void>) => Promise<SyncResult<void>>;
  refresh: () => Promise<void>;
  setData: (data: T[]) => void;

  // Utilities
  clearError: () => void;
  retryFailedUpdates: () => Promise<void>;
}

export function useRealTimeSync<T extends { _id?: string; id?: string }>(
  options: UseRealTimeSyncOptions
): UseRealTimeSyncReturn<T> {
  const {
    dataType,
    autoRefresh = false,
    refreshInterval = 30000,
    onUpdate,
    onError
  } = options;

  // State
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingUpdates, setPendingUpdates] = useState<OptimisticUpdate<T>[]>([]);

  // Refs
  const refreshIntervalRef = useRef<NodeJS.Timeout>();
  const mountedRef = useRef(true);

  // Update pending updates when they change
  useEffect(() => {
    const updatePendingUpdates = () => {
      if (mountedRef.current) {
        setPendingUpdates(RealTimeSync.getPendingUpdates(dataType));
      }
    };

    // Subscribe to real-time updates
    const unsubscribe = RealTimeSync.subscribe(dataType, (updateData: any) => {
      if (!mountedRef.current) return;

      switch (updateData.type) {
        case 'optimistic_update':
          // Apply optimistic update to local data
          setData(prevData => {
            const existingIndex = prevData.findIndex(item =>
              (item._id || item.id) === (updateData.data._id || updateData.data.id)
            );

            if (existingIndex >= 0) {
              // Update existing item
              const newData = [...prevData];
              newData[existingIndex] = { ...newData[existingIndex], ...updateData.data };
              return newData;
            } else {
              // Add new item
              return [updateData.data, ...prevData];
            }
          });
          break;

        case 'optimistic_delete':
          // Remove item optimistically
          setData(prevData =>
            prevData.filter(item =>
              (item._id || item.id) !== (updateData.data._id || updateData.data.id)
            )
          );
          break;

        case 'update_success':
          // Update with server response
          setData(prevData => {
            const existingIndex = prevData.findIndex(item =>
              (item._id || item.id) === (updateData.data._id || updateData.data.id)
            );

            if (existingIndex >= 0) {
              const newData = [...prevData];
              newData[existingIndex] = updateData.data;
              return newData;
            }
            return prevData;
          });
          break;

        case 'rollback':
          // Rollback to original data
          if (updateData.data) {
            setData(prevData => {
              const existingIndex = prevData.findIndex(item =>
                (item._id || item.id) === (updateData.data._id || updateData.data.id)
              );

              if (existingIndex >= 0) {
                const newData = [...prevData];
                newData[existingIndex] = updateData.data;
                return newData;
              }
              return prevData;
            });
          }
          break;

        case 'restore_deleted':
          // Restore deleted item
          setData(prevData => [updateData.data, ...prevData]);
          break;

        case 'remove_optimistic':
          // Remove optimistically added item
          setData(prevData =>
            prevData.filter(item =>
              (item._id || item.id) !== updateData.id
            )
          );
          break;
      }

      updatePendingUpdates();

      if (onUpdate) {
        onUpdate(updateData);
      }
    });

    // Initial update
    updatePendingUpdates();

    return () => {
      unsubscribe();
    };
  }, [dataType, onUpdate]);

  // Auto refresh setup
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      refreshIntervalRef.current = setInterval(() => {
        if (mountedRef.current && !RealTimeSync.hasPendingUpdates()) {
          // Only refresh if no pending updates
          refresh();
        }
      }, refreshInterval);

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
  }, [autoRefresh, refreshInterval]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  // Actions
  const optimisticCreate = useCallback(async (
    newData: T,
    apiCall: () => Promise<T>
  ): Promise<SyncResult<T>> => {
    const id = `${dataType}-create-${Date.now()}`;

    try {
      const result = await RealTimeSync.optimisticUpdate(
        id,
        dataType,
        newData,
        apiCall
      );

      if (result.success && result.data) {
        // Update local data with server response
        setData(prevData => {
          const filtered = prevData.filter(item =>
            (item._id || item.id) !== (newData._id || newData.id)
          );
          return [result.data!, ...filtered];
        });
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);
      if (onError) onError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [dataType, onError]);

  const optimisticUpdate = useCallback(async (
    id: string,
    updatedData: T,
    apiCall: () => Promise<T>,
    originalData?: T
  ): Promise<SyncResult<T>> => {
    const updateId = `${dataType}-update-${id}-${Date.now()}`;

    try {
      const result = await RealTimeSync.optimisticUpdate(
        updateId,
        dataType,
        updatedData,
        apiCall,
        originalData
      );

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);
      if (onError) onError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [dataType, onError]);

  const optimisticDelete = useCallback(async (
    id: string,
    itemToDelete: T,
    apiCall: () => Promise<void>
  ): Promise<SyncResult<void>> => {
    const deleteId = `${dataType}-delete-${id}-${Date.now()}`;

    try {
      const result = await RealTimeSync.optimisticDelete(
        deleteId,
        dataType,
        itemToDelete,
        apiCall
      );

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);
      if (onError) onError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [dataType, onError]);

  const refresh = useCallback(async (): Promise<void> => {
    // This would typically fetch fresh data from the server
    // Implementation depends on your specific API structure
    setLoading(true);
    try {
      // Placeholder for actual refresh logic
      // In a real implementation, you would call your API here
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh data';
      setError(errorMessage);
      if (onError) onError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [onError]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const retryFailedUpdates = useCallback(async (): Promise<void> => {
    // This would retry any failed optimistic updates
    // Implementation depends on your specific requirements
    NotificationSystem.info({
      title: 'Retrying Failed Updates',
      message: 'Attempting to sync pending changes...'
    });
  }, []);

  return {
    // State
    data,
    loading,
    error,
    pendingUpdates,
    hasPendingUpdates: pendingUpdates.length > 0,

    // Actions
    optimisticCreate,
    optimisticUpdate,
    optimisticDelete,
    refresh,
    setData,

    // Utilities
    clearError,
    retryFailedUpdates
  };
}

export default useRealTimeSync;