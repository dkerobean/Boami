import { connectDB } from '../mongoose-connection';
import Plan from '../models/Plan';

/**
 * Migration to create default subscription plans
 * Creates three tiers: Basic, Pro, and Enterprise
 */
export async function up() {
  await connectDB();

  const defaultPlans = [
    {
      name: 'Basic',
      description: 'Perfect for individuals and small teams getting started',
      price: {
        monthly: 1000, // ₦1,000
        annual: 10000  // ₦10,000 (2 months free)
      },
      currency: 'NGN',
      features: {
        dashboard_access: {
          enabled: true,
          description: 'Access to basic dashboard'
        },
        api_calls: {
          enabled: true,
          limit: 1000,
          description: '1,000 API calls per month'
        },
        storage: {
          enabled: true,
          limit: 1, // 1GB
          description: '1GB storage space'
        },
        users: {
          enabled: true,
          limit: 3,
          description: 'Up to 3 team members'
        },
        email_support: {
          enabled: true,
          description: 'Email support'
        },
        advanced_analytics: {
          enabled: false,
          description: 'Advanced analytics and reporting'
        },
        priority_support: {
          enabled: false,
          description: '24/7 priority support'
        },
        custom_integrations: {
          enabled: false,
          description: 'Custom integrations'
        },
        white_label: {
          enabled: false,
          description: 'White label solution'
        }
      },
      isActive: true,
      sortOrder: 1
    },
    {
      name: 'Pro',
      description: 'Ideal for growing businesses with advanced needs',
      price: {
        monthly: 2500, // ₦2,500
        annual: 25000  // ₦25,000 (2 months free)
      },
      currency: 'NGN',
      features: {
        dashboard_access: {
          enabled: true,
          description: 'Access to advanced dashboard'
        },
        api_calls: {
          enabled: true,
          limit: 10000,
          description: '10,000 API calls per month'
        },
        storage: {
          enabled: true,
          limit: 10, // 10GB
          description: '10GB storage space'
        },
        users: {
          enabled: true,
          limit: 10,
          description: 'Up to 10 team members'
        },
        email_support: {
          enabled: true,
          description: 'Email support'
        },
        advanced_analytics: {
          enabled: true,
          description: 'Advanced analytics and reporting'
        },
        priority_support: {
          enabled: true,
          description: 'Priority support'
        },
        custom_integrations: {
          enabled: true,
          limit: 5,
          description: 'Up to 5 custom integrations'
        },
        white_label: {
          enabled: false,
          description: 'White label solution'
        }
      },
      isActive: true,
      sortOrder: 2
    },
    {
      name: 'Enterprise',
      description: 'For large organizations requiring maximum flexibility',
      price: {
        monthly: 5000, // ₦5,000
        annual: 50000  // ₦50,000 (2 months free)
      },
      currency: 'NGN',
      features: {
        dashboard_access: {
          enabled: true,
          description: 'Access to enterprise dashboard'
        },
        api_calls: {
          enabled: true,
          limit: 100000,
          description: '100,000 API calls per month'
        },
        storage: {
          enabled: true,
          limit: 100, // 100GB
          description: '100GB storage space'
        },
        users: {
          enabled: true,
          description: 'Unlimited team members'
        },
        email_support: {
          enabled: true,
          description: 'Email support'
        },
        advanced_analytics: {
          enabled: true,
          description: 'Advanced analytics and reporting'
        },
        priority_support: {
          enabled: true,
          description: '24/7 priority support'
        },
        custom_integrations: {
          enabled: true,
          description: 'Unlimited custom integrations'
        },
        white_label: {
          enabled: true,
          description: 'White label solution'
        },
        dedicated_manager: {
          enabled: true,
          description: 'Dedicated account manager'
        },
        sla: {
          enabled: true,
          description: '99.9% uptime SLA'
        }
      },
      isActive: true,
      sortOrder: 3
    }
  ];

  // Insert plans if they don't exist
  for (const planData of defaultPlans) {
    const existingPlan = await Plan.findByName(planData.name);
    if (!existingPlan) {
      await Plan.create(planData);
      console.log(`✅ Created plan: ${planData.name}`);
    } else {
      console.log(`⚠️ Plan already exists: ${planData.name}`);
    }
  }

  console.log('✅ Subscription plans migration completed');
}

/**
 * Rollback migration - removes all plans
 */
export async function down() {
  await connectDB();

  await Plan.deleteMany({});
  console.log('✅ Subscription plans migration rolled back');
}

// Run migration if called directly
if (require.main === module) {
  up().catch(console.error);
}