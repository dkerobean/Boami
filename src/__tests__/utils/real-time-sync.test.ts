import RealTimeSync, { OptimisticUpdate, SyncResult } from '@/lib/utils/real-time-sync';

// Mock toast notifications
jest.mock('react-hot-toast', () => ({
  toast: {
    loading: jest.fn((message, options) => options?.id || 'loading-id'),
    success: jest.fn((message, options) => options?.id || 'success-id'),
    error: jest.fn((message, options) => options?.id || 'error-id'),
  }
}));

describe('RealTimeSync', () => {
  beforeEach(() => {
    // Clear any existing state
    RealTimeSync.clearPendingUpdates();
    jest.clearAllMocks();
  });

  describe('Subscription Management', () => {
    it('should allow subscribing to data type updates', () => {
      const callback = jest.fn();
      const unsubscribe = RealTimeSync.subscribe('test-data', callback);

      expect(typeof unsubscribe).toBe('function');

      // Test notification
      RealTimeSync.notify('test-data', { test: 'data' });
      expect(callback).toHaveBeenCalledWith({ test: 'data' });

      // Test unsubscribe
      unsubscribe();
      RealTimeSync.notify('test-data', { test: 'data2' });
      expect(callback).toHaveBeenCalledTimes(1); // Should not be called again
    });

    it('should handle multiple subscribers for the same data type', () => {
      const callback1fn();
      const callback2 = jest.fn();

      RealTimeSync.subscribe('test-data', callback1);
      RealTimeSync.subscribe('test-data', callback2);

      RealTimeSync.notify('test-data', { test: 'data' });

      expect(callback1).toHaveBeenCalledWith({ test: 'data' });
      expect(callback2).toHaveBeenCalledWith({ test: 'data' });
    });

    it('should handle subscriber callback errors gracefully', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Callback error');
      });
      const normalCallback = jest.fn();

      RealTimeSync.subscribe('test-data', errorCallback);
      RealTimeSync.subscribe('test-data', normalCallback);

      // Should not throw and should still call the normal callback
      expect(() => {
        RealTimeSync.notify('test-data', { test: 'data' });
      }).not.toThrow();

      expect(errorCallback).toHaveBeenCalled();
      expect(normalCallback).toHaveBeenCalled();
    });
  });

  describe('Optimistic Updates', () => {
    it('should perform successful optimistic update', async () => {
      const mockApiCall = jest.fn().mockResolvedValue({ id: '1', name: 'Updated Item' });
      const optimisticData = { id: '1', name: 'Optimistic Item' };
      const originalData = { id: '1', name: 'Original Item' };

      const callback = jest.fn();
      RealTimeSync.subscribe('test-items', callback);

      const result = await RealTimeSync.optimisticUpdate(
        'update-1',
        'test-items',
        optimisticData,
        mockApiCall,
        originalData
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: '1', name: 'Updated Item' });
      expect(mockApiCall).toHaveBeenCalled();

      // Should have notified subscribers twice (optimistic + success)
      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenNthCalledWith(1, {
        type: 'optimistic_update',
        id: 'update-1',
        data: optimisticData
      });
      expect(callback).toHaveBeenNthCalledWith(2, {
        type: 'update_success',
        id: 'update-1',
        data: { id: '1', name: 'Updated Item' }
      });
    });

    it('should handle failed optimistic update with rollback', async () => {
      const mockApiCall = jest.fn().mockRejectedValue(new Error('API Error'));
      const optimisticData = { id: '1', name: 'Optimistic Item' };
      const originalData = { id: '1', name: 'Original Item' };

      const callback = jest.fn();
      RealTimeSync.subscribe('test-items', callback);

      const result = await RealTimeSync.optimisticUpdate(
        'update-1',
        'test-items',
        optimisticData,
        mockApiCall,
        originalData
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('API Error');
      expect(result.shouldRollback).toBe(true);

      // Should have notified subscribers twice (optimistic + rollback)
      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenNthCalledWith(2, {
        type: 'rollback',
        id: 'update-1',
        data: originalData
      });
    });

    it('should handle create operation failure', async () => {
      const mockApiCall = jest.fn().mockRejectedValue(new Error('Create failed'));
      const optimisticData = { name: 'New Item' };

      const callback = jest.fn();
      RealTimeSync.subscribe('test-items', callback);

      const result = await RealTimeSync.optimisticUpdate(
        'create-1',
        'test-items',
        optimisticData,
        mockApiCall
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Create failed');

      // Should notify removal of optimistic item
      expect(callback).toHaveBeenNthCalledWith(2, {
        type: 'remove_optimistic',
        id: 'create-1'
      });
    });
  });

  describe('Optimistic Delete', () => {
    it('should perform successful optimistic delete', async () => {
      const mockApiCall = jest.fn().mockResolvedValue(undefined);
      const itemToDelete = { id: '1', name: 'Item to Delete' };

      const callback = jest.fn();
      RealTimeSync.subscribe('test-items', callback);

      const result = await RealTimeSync.optimisticDelete(
        'delete-1',
        'test-items',
        itemToDelete,
        mockApiCall
      );

      expect(result.success).toBe(true);
      expect(mockApiCall).toHaveBeenCalled();

      // Should have notified subscribers twice (optimistic delete + success)
      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenNthCalledWith(1, {
        type: 'optimistic_delete',
        id: 'delete-1',
        data: itemToDelete
      });
      expect(callback).toHaveBeenNthCalledWith(2, {
        type: 'delete_success',
        id: 'delete-1',
        data: itemToDelete
      });
    });

    it('should handle failed optimistic delete with restore', async () => {
      const mockApiCall = jest.fn().mockRejectedValue(new Error('Delete failed'));
      const itemToDelete = { id: '1', name: 'Item to Delete' };

      const callback = jest.fn();
      RealTimeSync.subscribe('test-items', callback);

      const result = await RealTimeSync.optimisticDelete(
        'delete-1',
        'test-items',
        itemToDelete,
        mockApiCall
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Delete failed');
      expect(result.shouldRollback).toBe(true);

      // Should have notified subscribers twice (optimistic delete + restore)
      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenNthCalledWith(2, {
        type: 'restore_deleted',
        id: 'delete-1',
        data: itemToDelete
      });
    });
  });

  describe('Pending Updates Management', () => {
    it('should track pending updates', async () => {
      const mockApiCall = jest.fn().mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ id: '1' }), 100))
      );

      expect(RealTimeSync.hasPendingUpdates()).toBe(false);

      // Start an update (don't await)
      const updatePromise = RealTimeSync.optimisticUpdate(
        'update-1',
        'test-items',
        { id: '1', name: 'Test' },
        mockApiCall
      );

      // Should have pending update
      expect(RealTimeSync.hasPendingUpdates()).toBe(true);
      expect(RealTimeSync.getPendingUpdates()).toHaveLength(1);

      // Wait for completion
      await updatePromise;

      // Should no longer have pending updates
      expect(RealTimeSync.hasPendingUpdates()).toBe(false);
      expect(RealTimeSync.getPendingUpdates()).toHaveLength(0);
    });

    it('should filter pending updates by data type', async () => {
      const mockApiCall1 = jest.fn().mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ id: '1' }), 100))
      );
      const mockApiCall2 = jest.fn().mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ id: '2' }), 100))
      );

      // Start updates for different data types
      const update1Promise = RealTimeSync.optimisticUpdate(
        'items-update-1',
        'items',
        { id: '1' },
        mockApiCall1
      );
      const update2Promise = RealTimeSync.optimisticUpdate(
        'users-update-1',
        'users',
        { id: '2' },
        mockApiCall2
      );

      // Check filtered pending updates
      const itemsUpdates = RealTimeSync.getPendingUpdates('items');
      const usersUpdates = RealTimeSync.getPendingUpdates('users');

      expect(itemsUpdates).toHaveLength(1);
      expect(usersUpdates).toHaveLength(1);
      expect(itemsUpdates[0].id).toBe('items-update-1');
      expect(usersUpdates[0].id).toBe('users-update-1');

      // Wait for completion
      await Promise.all([update1Promise, update2Promise]);
    });

    it('should clear all pending updates', () => {
      // This is tested indirectly through other tests, but let's be explicit
      RealTimeSync.clearPendingUpdates();
      expect(RealTimeSync.hasPendingUpdates()).toBe(false);
      expect(RealTimeSync.getPendingUpdates()).toHaveLength(0);
    });
  });
});