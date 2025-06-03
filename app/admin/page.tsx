'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Ticket, 
  Users, 
  Shield, 
  Settings,
  BarChart3,
  FileText,
  ChevronRight,
  Clock
} from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { toast } from 'sonner';

interface AdminPageInfo {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<any>;
  status: 'active' | 'coming-soon';
  category: string;
}

const adminPages: AdminPageInfo[] = [
  {
    title: 'Admin Messages',
    description: 'Manage user conversations and support requests through direct messaging',
    href: '/admin/messaging',
    icon: MessageSquare,
    status: 'active',
    category: 'Communication'
  },
  {
    title: 'Manage Tickets',
    description: 'View and respond to user support tickets and technical issues',
    href: '/admin/tickets',
    icon: Ticket,
    status: 'active',
    category: 'Support'
  },
  {
    title: 'User Management',
    description: 'View and manage user accounts, permissions, and profile information',
    href: '#',
    icon: Users,
    status: 'coming-soon',
    category: 'Administration'
  },
  {
    title: 'Analytics Dashboard',
    description: 'View system metrics, user activity, and performance analytics',
    href: '#',
    icon: BarChart3,
    status: 'coming-soon',
    category: 'Analytics'
  },
  {
    title: 'System Settings',
    description: 'Configure application settings, integrations, and system preferences',
    href: '#',
    icon: Settings,
    status: 'coming-soon',
    category: 'Configuration'
  },
  {
    title: 'Reports',
    description: 'Generate and export detailed reports on various system activities',
    href: '#',
    icon: FileText,
    status: 'coming-soon',
    category: 'Reporting'
  }
];

const categories = ['Communication', 'Support', 'Administration', 'Analytics', 'Configuration', 'Reporting'];

export default function AdminDirectory() {
  const { user } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check admin status
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const response = await fetch('/api/user/profile');
        if (response.ok) {
          const data = await response.json();
          setIsAdmin(data.isAdmin);
          if (!data.isAdmin) {
            toast.error('Access denied. Admin privileges required.');
            window.location.href = '/dashboard';
          }
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        toast.error('Failed to verify admin access');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      checkAdminStatus();
    }
  }, [user]);

  const handlePageClick = (page: AdminPageInfo) => {
    if (page.status === 'coming-soon') {
      toast.info(`${page.title} is coming soon!`);
    } else {
      window.location.href = page.href;
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'active') {
      return <Badge className="bg-green-100 text-green-800">Active</Badge>;
    } else {
      return <Badge className="bg-yellow-100 text-yellow-800 flex items-center gap-1">
        <Clock className="w-3 h-3" />
        Coming Soon
      </Badge>;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-600" />
            Admin Control Panel
          </h1>
          <p className="text-gray-600 mt-2">
            Central hub for all administrative functions and system management
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            Welcome, {user?.firstName || 'Admin'}
          </span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">2</p>
                <p className="text-gray-600 text-sm">Active Features</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-yellow-50 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">4</p>
                <p className="text-gray-600 text-sm">Coming Soon</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center">
                <Shield className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">6</p>
                <p className="text-gray-600 text-sm">Total Features</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin Pages by Category */}
      {categories.map(category => {
        const categoryPages = adminPages.filter(page => page.category === category);
        
        return (
          <div key={category} className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">{category}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {categoryPages.map((page) => {
                const IconComponent = page.icon;
                return (
                  <div 
                    key={page.title}
                    className="cursor-pointer"
                    onClick={() => handlePageClick(page)}
                  >
                    <Card 
                      className={`transition-all duration-200 h-full ${
                        page.status === 'active' 
                          ? 'hover:shadow-lg hover:border-blue-300 hover:scale-[1.02]' 
                          : 'opacity-75 hover:opacity-90'
                      }`}
                    >
                      <CardHeader className="pb-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                              page.status === 'active' 
                                ? 'bg-blue-50 text-blue-600' 
                                : 'bg-gray-50 text-gray-400'
                            }`}>
                              <IconComponent className="w-6 h-6" />
                            </div>
                            <div>
                              <CardTitle className="text-lg">{page.title}</CardTitle>
                              {getStatusBadge(page.status)}
                            </div>
                          </div>
                          <ChevronRight className={`w-5 h-5 ${
                            page.status === 'active' ? 'text-blue-600' : 'text-gray-400'
                          }`} />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-600 text-sm leading-relaxed">
                          {page.description}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Footer Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold mb-2">Administrator Access</h3>
              <p className="text-gray-700 text-sm mb-4">
                You have full administrative access to the Pixel Portal system. Use these tools responsibly 
                to manage users, monitor system health, and provide support to your customers.
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Full Access</Badge>
                <Badge variant="secondary">All Permissions</Badge>
                <Badge variant="secondary">Support Tools</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 