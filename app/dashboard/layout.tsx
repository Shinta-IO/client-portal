import React from 'react';
import AppLayout from '@/components/shared/AppLayout';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppLayout padding="default">
          {children}
    </AppLayout>
  );
} 