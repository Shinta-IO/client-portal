import React from 'react';
import { useUserProfile } from '@/utils/auth';

interface RoleBasedProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

// Component that only shows content to admins
export const AdminOnly: React.FC<RoleBasedProps> = ({ children, fallback = null }) => {
  const { isAdmin, loading } = useUserProfile();

  if (loading) {
    return <div className="animate-pulse h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>;
  }

  return isAdmin ? <>{children}</> : <>{fallback}</>;
};

// Component that only shows content to regular users (non-admins)
export const UserOnly: React.FC<RoleBasedProps> = ({ children, fallback = null }) => {
  const { isAdmin, loading } = useUserProfile();

  if (loading) {
    return <div className="animate-pulse h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>;
  }

  return !isAdmin ? <>{children}</> : <>{fallback}</>;
};

// Component that shows different content based on role
interface ConditionalRenderProps {
  adminContent: React.ReactNode;
  userContent: React.ReactNode;
  loadingContent?: React.ReactNode;
}

export const ConditionalRender: React.FC<ConditionalRenderProps> = ({ 
  adminContent, 
  userContent, 
  loadingContent 
}) => {
  const { isAdmin, loading } = useUserProfile();

  if (loading) {
    return loadingContent || <div className="animate-pulse h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>;
  }

  return isAdmin ? <>{adminContent}</> : <>{userContent}</>;
}; 