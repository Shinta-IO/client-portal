import React from 'react';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Header from '@/components/shared/Header';
import Sidebar from '@/components/shared/Sidebar';

export default async function ReviewsLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  
  if (!userId) {
    redirect('/auth/login');
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 ml-56 mt-16 p-4 pt-2 bg-gray-50 dark:bg-gray-950 min-h-screen">
          {/* ml-56 for sidebar, mt-16 for header, reduced padding */}
          {children}
        </main>
      </div>
    </div>
  );
} 