import React from 'react';
import Image from 'next/image';
import { ThemeProvider } from '@/components/theme-provider';
import { ThemeToggle } from '@/components/theme-toggle';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 relative p-4">
        {/* Background */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/login.png"
            alt="Background"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black/40" />
        </div>
        
        {/* Theme toggle */}
        <div className="absolute top-4 right-4 z-20">
          <ThemeToggle />
        </div>
        
        {/* Content */}
        <div className="relative z-10 w-full max-w-sm">
          {children}
        </div>
        
        {/* Hidden CAPTCHA container for Clerk */}
        <div id="clerk-captcha" className="hidden"></div>
      </div>
    </ThemeProvider>
  );
} 