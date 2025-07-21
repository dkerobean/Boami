import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

/**
 * Utility functions for file cleanup operations
 */
export class FileCleanup {
  /**
   * Delete an uploaded product image file
   * @param imageUrl - The image URL (e.g., "/uploads/products/image.jpg")
   * @returns Promise<boolean> - true if deleted successfully, false if file doesn't exist
   */
  static async deleteProductImage(imageUrl: string): Promise<boolean> {
    try {
      // Skip if no URL provided or if it's an external URL
      if (!imageUrl || imageUrl.startsWith('http') || !imageUrl.startsWith('/uploads/products/')) {
        return false;
      }

      // Convert public URL to file system path
      const filePath = path.join(process.cwd(), 'public', imageUrl);
      
      // Check if file exists
      if (!existsSync(filePath)) {
        console.warn(`File not found for cleanup: ${filePath}`);
        return false;
      }

      // Delete the file
      await unlink(filePath);
      console.log(`Successfully deleted image: ${filePath}`);
      return true;

    } catch (error) {
      console.error('Error deleting image:', error);
      return false;
    }
  }

  /**
   * Clean up old product images when updating
   * @param oldImageUrl - The old image URL to delete
   * @param newImageUrl - The new image URL (to avoid accidentally deleting the new one)
   */
  static async cleanupOldProductImage(oldImageUrl?: string, newImageUrl?: string): Promise<void> {
    if (!oldImageUrl || oldImageUrl === newImageUrl) {
      return;
    }

    try {
      await this.deleteProductImage(oldImageUrl);
    } catch (error) {
      // Don't fail the entire operation if cleanup fails
      console.warn('Image cleanup failed:', error);
    }
  }
}