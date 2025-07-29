import PermissionDeniedError from '@/app/components/errors/PermissionDeniedError';

export default function UnauthorizedPage() {
  return (
    <PermissionDeniedError
      title="Unauthorized Access"
      message="You don't have permission to access this page. Please contact your administrator if you believe this is an error."
    />
  );
}