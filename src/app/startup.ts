import { initializeApplication } from '@/lib/startup/init-rbac';

/**
 * Application startup initialization
 * This runs when the Next.js application starts
 */
let isInitialized = false;

export async function startupInit(): Promise<void> {
  // Prevent multiple initializations
  if (isInitialized) {
    return;
  }

  try {
    await initializeApplication();
    isInitialized = true;
  } catch (error) {
    console.error('Startup initialization failed:', error);
    // Don't throw to prevent app crash, RBAC will be seeded on first use if needed
  }
}

// Auto-initialize on import in production
if (process.env.NODE_ENV === 'production') {
  startupInit().catch(console.error);
}