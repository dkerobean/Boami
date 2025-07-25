/**
 * Database models index file
 * Exports all models for easy importing throughout the application
 */

// Existing models
export { default as User } from './User';
export { default as Product } from './Product';
export { default as ProductVariant } from './ProductVariant';
export { default as Sale } from './Sale';
export { default as Expense } from './Expense';
export { default as ExpenseCategory } from './ExpenseCategory';
export { default as Income } from './Income';
export { default as IncomeCategory } from './IncomeCategory';
export { default as InventoryLog } from './InventoryLog';
export { default as KanbanBoard } from './KanbanBoard';
export { default as KanbanTask } from './KanbanTask';
export { default as Note } from './Note';
export { default as RecurringPayment } from './RecurringPayment';
export { default as StockAlert } from './StockAlert';
export { default as Vendor } from './Vendor';
export { default as VerificationCode } from './VerificationCode';
export { default as WordPressConnection } from './WordPressConnection';
export { default as WordPressImportJob } from './WordPressImportJob';
export { default as CalendarEvent } from './CalendarEvent';

// New subscription system models
export { default as Plan } from './Plan';
export { default as Subscription } from './Subscription';
export { default as Transaction } from './Transaction';

// Type exports for subscription models
export type { IPlan, IPlanDocument, IPlanModel, IFeatureConfig } from './Plan';
export type { ISubscription, ISubscriptionDocument, ISubscriptionModel, SubscriptionStatus } from './Subscription';
export type { ITransaction, ITransactionDocument, ITransactionModel, TransactionStatus, TransactionType } from './Transaction';