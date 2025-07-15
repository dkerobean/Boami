import PageContainer from '@/app/components/container/PageContainer';
import SimpleProfilePage from '@/app/components/profile/SimpleProfilePage';

const UserProfile = () => {
  return (
    <PageContainer title="Profile" description="Edit your profile information">
      <SimpleProfilePage />
    </PageContainer>
  );
};

export default UserProfile;
