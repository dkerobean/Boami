/**
 * Real-time Data Synchronization Utilities
 * Handles optimistic updates, error rollback, and real-time inventory updates
 */

import React from 'react';
import { toast } from 'react-hot-toast';

export interface OptimisticUpdate<T> {
  id: string;
  type: 'create' | 'update' | 'delete';
  data: T;
  originalData?: T;
  timestamp: number;
}

export interface SyncResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  shouldRollback?: boolean;
}

export class RealTimeSync {
  private static pendingUpdates = new Map<string, OptimisticUpdate<any>>();
  private static subscribers = new Map<string, Set<(data: any) => void>>();

  /**
   * Subscribe to real-time updates for a specific data type
   */
  static subscribe<T>(dataType: string, callback: (data: T) => void): () => void {
    if (!this.subscribers.has(dataType)) {
      this.subscribers.set(dataType, new Set());
    }

    this.subscribers.get(dataType)!.add(callback);

    // Return unsubscribe function
    return () => {
      const subscribers = this.subscribers.get(dataType);
      if (subscribers) {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
          this.subscribers.delete(dataType);
        }
      }
    };
  }

  /**
   * Notify all subscribers of data changes
   */
  static notify<T>(dataType: string, data: T): void {
    const subscribers = this.subscribers.get(dataType);
    if (subscribers) {
      subscribers.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in subscriber callback:', error);
        }
      });
    }
  }

  /**
   * Perform optimistic update with automatic rollback on failure
   */
  static async optimisticUpdate<T>(
    updateId: string,
    dataType: string,
    optimisticData: T,
    apiCall: () => Promise<T>,
    originalData?: T
  ): Promise<SyncResult<T>> {
    const update: OptimisticUpdate<T> = {
      id: updateId,
      type: originalData ? 'update' : 'create',
      data: optimisticData,
      originalData,
      timestamp: Date.now()
    };

    try {
      // Store pending update
      this.pendingUpdates.set(updateId, update);

      // Apply optimistic update immediately
      this.notify(dataType, {
        type: 'optimistic_update',
        id: updateId,
        data: optimisticData
      });

      // Show optimistic feedback
      toast.loading('Saving changes...', { id: updateId });

      // Perform actual API call
      const result = await apiCall();

      // Remove pending update on success
      this.pendingUpdates.delete(updateId);

      // Notify subscribers of successful update
      this.notify(dataType, {
        type: 'update_success',
        id: updateId,
        data: result
      });

      // Show success feedback
      toast.success('Changes saved successfully', { id: updateId });

      return { success: true, data: result };

    } catch (error) {
      console.error('Optimistic update failed:', error);

      // Remove pending update
      this.pendingUpdates.delete(updateId);

      // Rollback to original data if available
      if (originalData) {
        this.notify(dataType, {
          type: 'rollback',
          id: updateId,
          data: originalData
        });
      } else {
        // For create operations, notify removal
        this.notify(dataType, {
          type: 'remove_optimistic',
          id: updateId
        });
      }

      // Show error feedback
      const errorMessage = error instanceof Error ? error.message : 'Failed to save changes';
      toast.error(errorMessage, { id: updateId });

      return {
        success: false,
        error: errorMessage,
        shouldRollback: true
      };
    }
  }

  /**
   * Perform optimistic delete with rollback capability
   */
  static async optimisticDelete<T>(
    deleteId: string,
    dataType: string,
    itemToDelete: T,
    apiCall: () => Promise<void>
  ): Promise<SyncResult<void>> {
    const update: OptimisticUpdate<T> = {
      id: deleteId,
      type: 'delete',
      data: itemToDelete,
      originalData: itemToDelete,
      timestamp: Date.now()
    };

    try {
      // Store pending update
      this.pendingUpdates.set(deleteId, update);

      // Apply optimistic delete immediately
      this.notify(dataType, {
        type: 'optimistic_delete',
        id: deleteId,
        data: itemToDelete
      });

      // Show optimistic feedback
      toast.loading('Deleting...', { id: deleteId });

      // Perform actual API call
      await apiCall();

      // Remove pending update on success
      this.pendingUpdates.delete(deleteId);

      // Notify subscribers of successful delete
      this.notify(dataType, {
        type: 'delete_success',
        id: deleteId,
        data: itemToDelete
      });

      // Show success feedback
      toast.success('Item deleted successfully', { id: deleteId });

      return { success: true };

    } catch (error) {
      console.error('Optimistic delete failed:', error);

      // Remove pending update
      this.pendingUpdates.delete(deleteId);

      // Rollback - restore the deleted item
      this.notify(dataType, {
        type: 'restore_deleted',
        id: deleteId,
        data: itemToDelete
      });

      // Show error feedback
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete item';
      toast.error(errorMessage, { id: deleteId });

      return {
        success: false,
        error: errorMessage,
        shouldRollback: true
      };
    }
  }

  /**
   * Get pending updates for a specific data type
   */
  static getPendingUpdates(dataType?: string): OptimisticUpdate<any>[] {
    const updates = Array.from(this.pendingUpdates.values());
    return dataType
      ? updates.filter(update => update.id.startsWith(dataType))
      : updates;
  }

  /**
   * Clear all pending updates (useful for cleanup)
   */
  static clearPendingUpdates(): void {
    this.pendingUpdates.clear();
  }

  /**
   * Check if there are any pending updates
   */
  static hasPendingUpdates(): boolean {
    return this.pendingUpdates.size > 0;
  }
}

/**
 * Hook for managing optimistic updates in React components
 */
export function useOptimisticUpdates<T>(dataType: string) {
  const [pendingUpdates, setPendingUpdates] = React.useState<OptimisticUpdate<T>[]>([]);

  React.useEffect(() => {
    const updatePendingUpdates = () => {
      setPendingUpdates(RealTimeSync.getPendingUpdates(dataType));
    };

    // Subscribe to changes
    const unsubscribe = RealTimeSync.subscribe(dataType, updatePendingUpdates);

    // Initial load
    updatePendingUpdates();

    return unsubscribe;
  }, [dataType]);

  return {
    pendingUpdates,
    hasPendingUpdates: pendingUpdates.length > 0,
    optimisticUpdate: (id: string, data: T, apiCall: () => Promise<T>, originalData?: T) =>
      RealTimeSync.optimisticUpdate(id, dataType, data, apiCall, originalData),
    optimisticDelete: (id: string, data: T, apiCall: () => Promise<void>) =>
      RealTimeSync.optimisticDelete(id, dataType, data, apiCall)
  };
}

export default RealTimeSync;