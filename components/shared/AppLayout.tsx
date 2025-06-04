import React from 'react';
import Header from '@/components/shared/Header';
import Sidebar from '@/components/shared/Sidebar';
import MobileNav from '@/components/shared/MobileNav';

interface AppLayoutProps {
  children: React.ReactNode;
  padding?: 'default' | 'reduced' | 'none';
}

export default function AppLayout({ children, padding = 'default' }: AppLayoutProps) {
  // Determine padding based on the prop
  const paddingClass = 
    padding === 'default' ? 'p-4 sm:p-6 md:p-8' : 
    padding === 'reduced' ? 'p-4 sm:p-5 pt-3' : 
    'p-0';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className={`flex-1 ml-0 md:ml-56 mt-16 ${paddingClass} pb-20 md:pb-10`}>
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
      <MobileNav />
    </div>
  );
} 