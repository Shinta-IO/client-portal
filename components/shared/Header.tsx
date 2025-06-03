'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { UserButton, useClerk, useUser } from '@clerk/nextjs';
import { ThemeToggle } from '@/components/theme-toggle';
import { LogOut, Shield } from 'lucide-react';

export default function Header() {
  const { signOut } = useClerk();
  const { user } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const response = await fetch('/api/user/profile');
        
        if (response.ok) {
          const data = await response.json();
          const isAdminUser = data.isAdmin;
          setIsAdmin(isAdminUser);
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
      }
    };

    if (user) {
      checkAdminStatus();
    }
  }, [user]);

  const handleSignOut = () => {
    signOut({ redirectUrl: '/auth/login' });
  };

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-950/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-gray-950/60 px-4 shadow-md">
      {/* Logo and Title on the left */}
      <div className="flex items-center space-x-3 z-10">
        <Link href="/dashboard" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
          <div className="relative w-7 h-7">
            <Image
              src="/logo.png"
              alt="Pixel-Pro Logo"
              width={28}
              height={28}
              className="rounded-full"
              priority
              onError={(e) => {
                // Hide image if it fails to load
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <span className="text-gray-900 dark:text-white font-bold text-xl whitespace-nowrap">Pixel-Pro</span>
        </Link>
      </div>

      {/* Right side controls */}
      <div className="flex items-center gap-4 z-10">
        <ThemeToggle />
        
        {/* Admin Panel Button - Only visible for admins */}
        {isAdmin && (
          <Link
            href="/admin"
            className="relative inline-flex h-10 px-4 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/20 hover:bg-purple-200 dark:hover:bg-purple-900/40 border border-purple-300 dark:border-purple-700 text-purple-900 dark:text-purple-300 transition-all duration-200 text-sm font-medium"
            title="Admin Panel"
          >
            <Shield className="h-4 w-4 mr-2" />
            Admin Panel
          </Link>
        )}
        
        {/* Logout Button */}
        <button
          onClick={handleSignOut}
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 border border-gray-300 dark:border-white/20 text-gray-900 dark:text-white transition-all duration-200"
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut className="h-5 w-5" />
        </button>
        
        <UserButton 
          appearance={{
            elements: {
              avatarBox: "w-8 h-8",
              userButtonPopoverCard: "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-lg",
              userButtonPopoverActionButton: "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100",
              userButtonPopoverActionButtonText: "text-gray-900 dark:text-gray-100",
              userButtonPopoverFooter: "hidden"
            }
          }}
          afterSignOutUrl="/auth/login"
          showName={false}
        />
      </div>
    </header>
  );
} 