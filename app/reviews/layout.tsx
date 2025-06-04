import React from 'react';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import AppLayout from '@/components/shared/AppLayout';

export default async function ReviewsLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  
  if (!userId) {
    redirect('/auth/login');
  }

  return (
    <AppLayout padding="default">
      {children}
    </AppLayout>
  );
} 