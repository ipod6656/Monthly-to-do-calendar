'use client';

import { useAuthRedirect } from '@/hooks/use-auth-redirect';
import { useUser } from '@/firebase';
import Loading from './loading';
import { Calendar } from '@/components/calendar';

export default function Home() {
  const { isUserLoading } = useUser();

  // Redirect authenticated users to the main app, unauthenticated to login
  useAuthRedirect({ to: '/login', condition: 'unauthenticated' });

  if (isUserLoading) {
    return <Loading />;
  }

  return <Calendar />;
}
