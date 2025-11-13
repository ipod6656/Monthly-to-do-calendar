'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';

interface UseAuthRedirectOptions {
  to: string;
  condition: 'authenticated' | 'unauthenticated';
}

export function useAuthRedirect({ to, condition }: UseAuthRedirectOptions) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    // Wait until the initial authentication check is complete
    if (isUserLoading) {
      return;
    }

    const isAuthenticated = !!user;

    if (condition === 'authenticated' && isAuthenticated) {
      router.push(to);
    }

    if (condition === 'unauthenticated' && !isAuthenticated) {
      router.push(to);
    }
  }, [user, isUserLoading, router, to, condition]);
}
