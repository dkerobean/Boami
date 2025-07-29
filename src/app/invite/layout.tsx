import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Accept Invitation',
  description: 'Complete your account setup to join the platform',
};

export default function InviteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
}