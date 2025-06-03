'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { 
  LayoutDashboard, 
  FileText, 
  Receipt, 
  FolderOpen, 
  MessageSquare, 
  HeadphonesIcon,
  Star,
  Settings,
  ChevronLeft,
  Shield,
  Users,
  Ticket
} from 'lucide-react';

const navItems = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Estimates', href: '/estimates', icon: FileText },
  { title: 'Invoices', href: '/invoices', icon: Receipt },
  { title: 'Projects', href: '/projects', icon: FolderOpen },
  { title: 'Messaging', href: '/messaging', icon: MessageSquare },
  { title: 'Support Tickets', href: '/tickets', icon: HeadphonesIcon },
  { title: 'Reviews', href: '/reviews', icon: Star },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        console.log('🔍 Checking admin status...');
        const response = await fetch('/api/user/profile');
        console.log('📡 Profile response:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('👤 Profile data:', data);
          const isAdminUser = data.isAdmin;
          console.log('🛡️ Is admin:', isAdminUser);
          setIsAdmin(isAdminUser);
        }
      } catch (error) {
        console.error('💥 Error checking admin status:', error);
      }
    };

    if (user) {
      checkAdminStatus();
    }
  }, [user]);
  
  return (
    <aside className="fixed inset-y-0 left-0 w-56 flex flex-col z-20 overflow-hidden">
      {/* Background image with gradient overlay */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/background.png"
          alt="Background"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/80 via-pink-700/15 via-red-700/15 via-orange-500/15 to-yellow-500/15" />
      </div>
      
      {/* Content */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Navigation */}
        <nav className="flex-1 px-2 py-12 mt-8 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg font-medium transition-all duration-200 ${
                  pathname === item.href 
                    ? 'bg-white/20 text-white backdrop-blur-sm border border-white/30 shadow-lg' 
                    : 'hover:bg-white/10 text-white/90 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm">{item.title}</span>
              </Link>
            );
          })}
        </nav>
        
        {/* Settings link */}
        <div className="px-2 py-2">
          <Link
            href="/settings"
            className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg font-medium transition-all duration-200 ${
              pathname === '/settings' 
                ? 'bg-white/20 text-white backdrop-blur-sm border border-white/30 shadow-lg' 
                : 'hover:bg-white/10 text-white/90 hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span className="text-sm">Settings</span>
          </Link>
        </div>
        
        {/* User profile at bottom */}
        <div className="p-4 border-t border-white/20">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <span className="text-white font-semibold text-sm">
                {user?.firstName?.charAt(0) || user?.emailAddresses[0]?.emailAddress?.charAt(0) || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm truncate">
                {user?.fullName || user?.firstName || 'User'}
              </p>
              <p className="text-white/70 text-xs">
                {isAdmin ? 'Admin' : 'User'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
} 