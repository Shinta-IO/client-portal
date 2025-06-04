import React from 'react';
import AppLayout from '@/components/shared/AppLayout';

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppLayout padding="reduced">
          {children}
    </AppLayout>
  );
} 