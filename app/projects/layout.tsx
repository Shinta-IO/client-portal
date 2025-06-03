import React from 'react';
import Header from '@/components/shared/Header';
import Sidebar from '@/components/shared/Sidebar';

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 ml-56 mt-16 p-4 pt-2">{/* ml-56 for sidebar, mt-16 for header, reduced padding */}
          {children}
        </main>
      </div>
    </div>
  );
} 