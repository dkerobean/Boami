import { connectToDatabase } from '../database/mongoose-connection';
import { seedRBAC } from '../database/seeders/rbac-seeder';

/**
 * Initialize RBAC system on application startup
 * This ensures RBAC is ready before any user operations
 */
export async function initializeRBAC(): Promise<void> {
  try {
    console.log('🚀 Initializing RBAC system...');
    
    // Connect to database
    await connectToDatabase();
    
    // Seed RBAC if not already done
    await seedRBAC();
    
    console.log('✅ RBAC system initialization complete');
  } catch (error) {
    console.error('❌ RBAC initialization failed:', error);
    throw error;
  }
}

/**
 * Initialize all startup processes
 */
export async function initializeApplication(): Promise<void> {
  try {
    console.log('🔄 Starting application initialization...');
    
    await initializeRBAC();
    
    console.log('🎉 Application initialization complete');
  } catch (error) {
    console.error('💥 Application initialization failed:', error);
    // Don't throw here to prevent app from crashing
    // Log the error and continue, RBAC will be seeded on first registration if needed
  }
}