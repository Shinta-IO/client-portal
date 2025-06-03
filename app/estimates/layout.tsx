import React from 'react';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Header from '@/components/shared/Header';
import Sidebar from '@/components/shared/Sidebar';

export default async function EstimatesLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  
  if (!userId) {
    redirect('/auth/login');
  }

  return (
    <div className="min-h-screen">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 ml-56 mt-16 p-4 pt-2 min-h-screen">
          {/* ml-56 for sidebar, mt-16 for header, reduced padding */}
          {children}
        </main>
      </div>
    </div>
  );
} 