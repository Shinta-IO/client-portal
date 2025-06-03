'use client';

import { usePathname } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import EnzoChat from './EnzoChat';

export default function ConditionalEnzoChat() {
  const pathname = usePathname();
  const { isSignedIn, isLoaded } = useUser();

  // Don't show Enzo on auth pages or if user is not signed in
  if (!isLoaded || !isSignedIn) {
    return null;
  }

  // Hide on auth routes
  if (pathname.startsWith('/auth/') || pathname === '/auth') {
    return null;
  }

  return <EnzoChat />;
} 