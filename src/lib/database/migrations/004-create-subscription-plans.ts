import { connectDB } from '../mongoose-connection';
import Plan from '../models/Plan';

/**
 * Migration to create default subscription plans
 * Creates Free, Professional, and Enterprise plans with comprehensive features
 */
export async function createSubscriptionPlans() {
  console.log('🔄 Starting subscription plans migration...');
  
  try {
    await connectDB();

    // Check if plans already exist
    const existingPlans = await Plan.find({});
    if (existingPlans.length > 0) {
      console.log('✅ Subscription plans already exist, skipping migration');
      return;
    }

    // Define the three subscription plans
    const plans = [
      {
        name: 'Free',
        description: 'Perfect for small businesses just getting started with inventory management',
        price: {
          monthly: 0,
          annual: 0
        },
        currency: 'GHS',
        features: {
          products: {
            enabled: true,
            limit: 50,
            description: 'Manage up to 50 products'
          },
          inventory_tracking: {
            enabled: true,
            limit: -1,
            description: 'Basic inventory tracking'
          },
          basic_reports: {
            enabled: true,
            limit: 5,
            description: 'Up to 5 basic reports per month'
          },
          email_support: {
            enabled: true,
            limit: -1,
            description: 'Email support'
          },
          mobile_access: {
            enabled: true,
            limit: -1,
            description: 'Mobile app access'
          }
        },
        isActive: true,
        sortOrder: 1
      },
      {
        name: 'Professional',
        description: 'Everything you need to scale your business with advanced features and analytics',
        price: {
          monthly: 90,
          annual: 900 // 17% savings (12 * 90 = 1080, savings = 180)
        },
        currency: 'GHS',
        features: {
          products: {
            enabled: true,
            limit: -1,
            description: 'Unlimited products'
          },
          inventory_tracking: {
            enabled: true,
            limit: -1,
            description: 'Advanced inventory tracking with alerts'
          },
          advanced_reports: {
            enabled: true,
            limit: -1,
            description: 'Unlimited advanced reports and analytics'
          },
          bulk_operations: {
            enabled: true,
            limit: -1,
            description: 'Bulk import/export operations'
          },
          priority_support: {
            enabled: true,
            limit: -1,
            description: 'Priority email and chat support'
          },
          mobile_access: {
            enabled: true,
            limit: -1,
            description: 'Full mobile app access'
          },
          low_stock_alerts: {
            enabled: true,
            limit: -1,
            description: 'Automated low stock alerts'
          },
          sales_analytics: {
            enabled: true,
            limit: -1,
            description: 'Detailed sales analytics and insights'
          },
          multi_location: {
            enabled: true,
            limit: 5,
            description: 'Manage up to 5 locations'
          }
        },
        isActive: true,
        sortOrder: 2
      },
      {
        name: 'Enterprise',
        description: 'Advanced solution for large businesses with custom integrations and dedicated support',
        price: {
          monthly: 210,
          annual: 2100 // 17% savings (12 * 210 = 2520, savings = 420)
        },
        currency: 'GHS',
        features: {
          products: {
            enabled: true,
            limit: -1,
            description: 'Unlimited products'
          },
          inventory_tracking: {
            enabled: true,
            limit: -1,
            description: 'Enterprise-grade inventory management'
          },
          advanced_reports: {
            enabled: true,
            limit: -1,
            description: 'Unlimited reports with custom dashboards'
          },
          bulk_operations: {
            enabled: true,
            limit: -1,
            description: 'Advanced bulk operations and automation'
          },
          dedicated_support: {
            enabled: true,
            limit: -1,
            description: 'Dedicated account manager and phone support'
          },
          mobile_access: {
            enabled: true,
            limit: -1,
            description: 'Full mobile app with offline capabilities'
          },
          api_access: {
            enabled: true,
            limit: -1,
            description: 'Full API access for custom integrations'
          },
          custom_integrations: {
            enabled: true,
            limit: -1,
            description: 'Custom third-party integrations'
          },
          multi_location: {
            enabled: true,
            limit: -1,
            description: 'Unlimited locations'
          },
          advanced_security: {
            enabled: true,
            limit: -1,
            description: 'Advanced security features and audit logs'
          },
          white_labeling: {
            enabled: true,
            limit: -1,
            description: 'White-label branding options'
          },
          custom_workflows: {
            enabled: true,
            limit: -1,
            description: 'Custom workflow automation'
          }
        },
        isActive: true,
        sortOrder: 3
      }
    ];

    // Create plans in the database
    console.log('📝 Creating subscription plans...');
    
    for (const planData of plans) {
      const plan = new Plan(planData);
      await plan.save();
      console.log(`✅ Created ${planData.name} plan`);
    }

    console.log('🎉 Subscription plans migration completed successfully!');
    console.log(`📊 Created ${plans.length} subscription plans:`);
    plans.forEach(plan => {
      console.log(`   - ${plan.name}: GH₵${plan.price.monthly.toLocaleString()}/month`);
    });

  } catch (error) {
    console.error('❌ Subscription plans migration failed:', error);
    throw error;
  }
}

/**
 * Rollback function to remove created plans
 */
export async function rollbackSubscriptionPlans() {
  console.log('🔄 Rolling back subscription plans migration...');
  
  try {
    await connectDB();
    
    const deletedPlans = await Plan.deleteMany({
      name: { $in: ['Free', 'Professional', 'Enterprise'] }
    });
    
    console.log(`✅ Rollback completed. Deleted ${deletedPlans.deletedCount} plans.`);
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    throw error;
  }
}

// Export for direct execution
if (require.main === module) {
  createSubscriptionPlans()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}