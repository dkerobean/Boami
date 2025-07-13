import { redirect } from 'next/navigation';

export default function ForgotPassword() {
  // Redirect to the complete password reset system
  redirect('/auth/auth1/reset-password');
}
