'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  FileText, 
  Receipt, 
  FolderOpen, 
  MessageSquare, 
  HeadphonesIcon,
  Star,
  Settings,
  Menu,
  X
} from 'lucide-react';
import { cn } from '../../utils/cn';

// Same navigation items as in Sidebar for consistency
const navItems = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Estimates', href: '/estimates', icon: FileText },
  { title: 'Invoices', href: '/invoices', icon: Receipt },
  { title: 'Projects', href: '/projects', icon: FolderOpen },
  { title: 'Messaging', href: '/messaging', icon: MessageSquare },
  { title: 'Tickets', href: '/tickets', icon: HeadphonesIcon },
  { title: 'Reviews', href: '/reviews', icon: Star },
];

export default function MobileNav() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  // Prevent hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Close menu when pathname changes
  React.useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  // Prevent body scroll when menu is open
  React.useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  if (!mounted) return null;

  // Only show main 4 items in bottom nav, rest go in overlay
  const mainNavItems = navItems.slice(0, 4);
  
  return (
    <>
      {/* Bottom navigation bar - visible only on mobile */}
      <nav className="mobile-nav grid grid-cols-5 pb-safe animate-in slide-in-from-bottom">
        {mainNavItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          // Alternate between different accent styles for a more dynamic look
          const activeClass =
            index % 4 === 0
              ? "text-blue-600 dark:text-blue-400"
              : index % 4 === 1
                ? "text-purple-600 dark:text-purple-400"
                : index % 4 === 2
                  ? "text-green-600 dark:text-green-400"
                  : "text-yellow-600 dark:text-yellow-400";
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "mobile-nav-item transition-all duration-300", 
                isActive && `active ${activeClass}`
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 transition-transform duration-300", 
                  isActive && "scale-110"
                )}
              />
              <span>{item.title}</span>
            </Link>
          );
        })}
        
        {/* Menu button */}
        <button
          onClick={() => setIsMenuOpen(true)}
          className="mobile-nav-item transition-all duration-300"
        >
          <Menu className="h-5 w-5" />
          <span>Menu</span>
        </button>
      </nav>
      
      {/* Full screen menu overlay with backdrop */}
      {isMenuOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-50 bg-black/50 animate-in fade-in-80 md:hidden"
            onClick={() => setIsMenuOpen(false)}
          />
          
          {/* Menu panel */}
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-background border-l border-border animate-in slide-in-from-right md:hidden">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h2 className="text-lg font-semibold">Navigation</h2>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2 rounded-full hover:bg-muted transition-colors"
                >
                  <X className="h-5 w-5" />
                  <span className="sr-only">Close menu</span>
                </button>
              </div>
              
              {/* Menu items */}
              <div className="flex-1 overflow-y-auto py-6">
                <div className="space-y-2 px-4">
                  {navItems.map((item, index) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    
                    // Alternate colors for visual interest
                    const activeClass =
                      index % 4 === 0
                        ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800"
                        : index % 4 === 1
                          ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800"
                          : index % 4 === 2
                            ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-300 dark:border-green-800"
                            : "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/50 dark:text-yellow-300 dark:border-yellow-800";
                    
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center space-x-3 px-4 py-3 rounded-lg border transition-all duration-200",
                          isActive 
                            ? activeClass
                            : "hover:bg-muted border-transparent"
                        )}
                      >
                        <Icon className="h-5 w-5 flex-shrink-0" />
                        <span className="font-medium">{item.title}</span>
                      </Link>
                    );
                  })}
                  
                  {/* Settings link */}
                  <div className="pt-4 mt-4 border-t border-border">
                    <Link
                      href="/settings"
                      className={cn(
                        "flex items-center space-x-3 px-4 py-3 rounded-lg border transition-all duration-200",
                        pathname === '/settings' 
                          ? "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950/50 dark:text-gray-300 dark:border-gray-800"
                          : "hover:bg-muted border-transparent"
                      )}
                    >
                      <Settings className="h-5 w-5 flex-shrink-0" />
                      <span className="font-medium">Settings</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
} 