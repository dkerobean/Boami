'use server'

/**
 * Server actions for stock restock operations using MongoDB
 * These actions can be called from client components
 */

interface RestockResult {
  success: boolean;
  message: string;
  data?: {
    previousStock: number;
    quantityAdded: number;
    newStock: number;
    isAboveThreshold: boolean;
    alertRemoved: boolean;
  };
  error?: string;
}

/**
 * Perform restock operation using direct MongoDB operations
 */
export async function performRestockAction(
  alertId: string,
  quantity: number,
  reason: string
): Promise<RestockResult> {
  try {
    console.log('Server action: performRestockAction called', { alertId, quantity, reason });

    // Validate inputs
    if (!alertId || quantity <= 0 || !reason) {
      return {
        success: false,
        error: 'Invalid input parameters',
        message: 'Alert ID, quantity, and reason are required'
      };
    }

    // Validate ObjectId format
    if (!/^[0-9a-fA-F]{24}$/.test(alertId)) {
      return {
        success: false,
        error: 'Invalid alert ID format',
        message: 'Alert ID must be a valid ObjectId'
      };
    }

    // Since server actions can't directly use MCP tools, we'll need to use MongoDB connection
    // For now, return a structured response that indicates MongoDB MCP operations are needed
    return {
      success: false,
      error: 'MongoDB MCP operations needed',
      message: 'This server action requires direct MongoDB MCP tool integration'
    };

  } catch (error) {
    console.error('Server action error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Restock operation failed'
    };
  }
}