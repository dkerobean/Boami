import PageContainer from '@/app/components/container/PageContainer';
import { SubscriptionBillingPage } from '@/components/subscription';

const SubscriptionPage = () => {
  return (
    <PageContainer title="Subscription & Billing" description="Manage your subscription and billing">
      <SubscriptionBillingPage />
    </PageContainer>
  );
};

export default SubscriptionPage;