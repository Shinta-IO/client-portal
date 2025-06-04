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
    <aside className="fixed inset-y-0 left-0 w-56 flex-col z-20 overflow-hidden hidden md:flex">
      {/* Background image with gradient overlay */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/background.png"
          alt="Background"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/90 via-pink-700/30 to-purple-800/40 backdrop-blur-[2px]" />
      </div>
      
      {/* Content */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Navigation */}
        <nav className="flex-1 px-4 py-8 mt-10 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-3.5 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                  isActive 
                    ? 'bg-white/25 text-white backdrop-blur-sm border border-white/40 shadow-lg' 
                    : 'hover:bg-white/15 text-white/90 hover:text-white hover:shadow-md'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-white/80'}`} />
                <span className="text-sm">{item.title}</span>
              </Link>
            );
          })}
        </nav>
        
        {/* Settings link */}
        <div className="px-4 py-3">
          <Link
            href="/settings"
            className={`flex items-center space-x-3.5 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
              pathname === '/settings' 
                ? 'bg-white/25 text-white backdrop-blur-sm border border-white/40 shadow-lg' 
                : 'hover:bg-white/15 text-white/90 hover:text-white hover:shadow-md'
            }`}
          >
            <Settings className={`w-5 h-5 ${pathname === '/settings' ? 'text-white' : 'text-white/80'}`} />
            <span className="text-sm">Settings</span>
          </Link>
        </div>
        
        {/* User profile at bottom */}
        <div className="p-5 mt-auto border-t border-white/30">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 bg-white/30 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/40">
              <span className="text-white font-semibold text-sm">
                {user?.firstName?.charAt(0) || user?.emailAddresses[0]?.emailAddress?.charAt(0) || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm truncate">
                {user?.fullName || user?.firstName || 'User'}
              </p>
              <p className="text-white/80 text-xs mt-0.5">
                {isAdmin ? 'Admin' : 'User'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
} 