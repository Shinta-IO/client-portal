import React from 'react';
import AppLayout from '@/components/shared/AppLayout';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppLayout padding="default">
      {children}
    </AppLayout>
  );
} 