import React from 'react';
import AppLayout from '@/components/shared/AppLayout';

export default function InvoicesLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppLayout padding="none">
      {children}
    </AppLayout>
  );
} 