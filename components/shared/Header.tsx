'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { UserButton, useClerk, useUser } from '@clerk/nextjs';
import { ThemeToggle } from '@/components/theme-toggle';
import { LogOut, Shield, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Header() {
  const { signOut } = useClerk();
  const { user } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);

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

  const handleMobileChatToggle = () => {
    // Trigger the mobile chat through a custom event
    window.dispatchEvent(new CustomEvent('toggleMobileChat'));
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-gray-300 dark:border-gray-800 bg-white dark:bg-gray-950/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:supports-[backdrop-filter]:bg-gray-950/80 px-4 md:px-8 shadow-sm pt-safe">
      {/* Logo and Title on the left */}
      <div className="flex items-center space-x-3 z-10">        
        <Link href="/dashboard" className="flex items-center space-x-2.5 hover:opacity-80 transition-opacity">
          <div className="relative w-9 h-9">
            <Image
              src="/logo.png"
              alt="Pixel-Pro Logo"
              width={36}
              height={36}
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
      <div className="flex items-center gap-2 md:gap-4 z-10">
        {/* Mobile Chat Button - Only visible on mobile */}
        <Button
          onClick={handleMobileChatToggle}
          variant="outline"
          size="icon-sm"
          className="md:hidden"
          aria-label="Open chat"
          title="Chat with Enzo"
        >
          <MessageCircle className="h-4 w-4" />
        </Button>

        <ThemeToggle />
        
        {/* Admin Panel Button - Only visible for admins and hidden on mobile */}
        {isAdmin && (
          <Button
            asChild
            variant="outline"
            size="sm"
            className="hidden md:inline-flex bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-900/50 border-purple-400 dark:border-purple-700 text-purple-800 dark:text-purple-200"
          >
            <Link href="/admin" title="Admin Panel">
            <Shield className="h-4 w-4 mr-2" />
            Admin Panel
          </Link>
          </Button>
        )}
        
        {/* Logout Button - Hidden on small mobile */}
        <Button
          onClick={handleSignOut}
          variant="outline"
          size="icon-sm"
          className="hidden sm:inline-flex"
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </Button>
        
        <UserButton 
          appearance={{
            elements: {
              avatarBox: "w-9 h-9",
              userButtonPopoverCard: "bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 shadow-lg backdrop-blur-sm",
              userButtonPopoverActionButton: "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100 transition-colors duration-200",
              userButtonPopoverActionButtonText: "text-gray-900 dark:text-gray-100 font-medium",
              userButtonPopoverActionButtonIcon: "text-gray-700 dark:text-gray-300",
              userButtonPopoverFooter: "hidden",
              userPreviewTextContainer: "text-gray-900 dark:text-gray-900",
              userPreviewMainIdentifier: "text-gray-900 dark:text-gray-900 font-semibold",
              userPreviewSecondaryIdentifier: "text-gray-600 dark:text-gray-700 font-medium",
              userButtonPopoverActions: "bg-white dark:bg-gray-900",
              userButtonPopover: "bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700"
            }
          }}
          afterSignOutUrl="/auth/login"
          showName={false}
        />
      </div>
    </header>
  );
} 