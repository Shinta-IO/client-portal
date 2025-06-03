'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  User, 
  Clock, 
  ExternalLink, 
  RefreshCw,
  Heart,
  MessageCircle,
  TrendingUp
} from 'lucide-react';

// Type definitions for activity items
interface ActivityFeedItem {
  id: string;
  user_id: string;
  activity_type: 'project_created' | 'project_completed' | 'estimate_requested' | 'estimate_finalized' | 'estimate_approved' | 'invoice_created' | 'invoice_paid';
  activity_description: string;
  metadata?: {
    project_id?: string;
    project_title?: string;
    user_name?: string;
    user_avatar?: string;
    estimate_id?: string;
    invoice_id?: string;
    [key: string]: any;
  };
  created_at: string;
  user: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
    organization?: string;
  };
}

const RecentActivityWidget = () => {
  const [activities, setActivities] = useState<ActivityFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchActivities();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchActivities, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchActivities = async () => {
    try {
      const response = await fetch('/api/activity/feed');
      if (response.ok) {
        const data = await response.json();
        setActivities(data);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchActivities();
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'project_created':
        return '🚀';
      case 'project_completed':
        return '🎉';
      case 'estimate_requested':
        return '📝';
      case 'estimate_finalized':
        return '📋';
      case 'estimate_approved':
        return '✅';
      case 'invoice_created':
        return '🧾';
      case 'invoice_paid':
        return '💰';
      default:
        return '📱';
    }
  };

  const getActivityColor = (activityType: string) => {
    switch (activityType) {
      case 'project_created':
        return 'from-blue-500 to-purple-600';
      case 'project_completed':
        return 'from-green-500 to-emerald-600';
      case 'estimate_requested':
        return 'from-yellow-500 to-orange-600';
      case 'estimate_finalized':
        return 'from-blue-500 to-indigo-600';
      case 'estimate_approved':
        return 'from-teal-500 to-cyan-600';
      case 'invoice_created':
        return 'from-purple-500 to-pink-600';
      case 'invoice_paid':
        return 'from-green-500 to-teal-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const generateActivityDescription = (
    activityType: string,
    metadata?: ActivityFeedItem['metadata']
  ): string => {
    switch (activityType) {
      case 'project_created':
        return `started working on "${metadata?.project_title || 'a new project'}"`;
      case 'project_completed':
        return `completed the project "${metadata?.project_title || 'Unknown Project'}" 🎉`;
      case 'estimate_requested':
        return `requested a new project estimate`;
      case 'estimate_finalized':
        return `was sent an estimate`;
      case 'estimate_approved':
        return `approved an estimate for "${metadata?.project_title || 'a project'}"`;
      case 'invoice_created':
        return `received an invoice for "${metadata?.project_title || 'a project'}"`;
      case 'invoice_paid':
        return `paid an invoice for "${metadata?.project_title || 'a project'}"`;
      default:
        return 'had some activity';
    }
  };

  const getUserInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-start gap-3 animate-pulse">
            <div className="w-10 h-10 bg-white/20 dark:bg-gray-800/20 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-white/20 dark:bg-gray-800/20 rounded w-3/4" />
              <div className="h-3 bg-white/20 dark:bg-gray-800/20 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto mb-6 h-16 w-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
          <TrendingUp className="h-8 w-8 text-white" />
        </div>
        <h3 className="text-lg font-semibold text-white dark:text-white mb-2">
          No Activity Yet
        </h3>
        <p className="text-white/80 dark:text-gray-400 mb-6">
          Be the first to create some activity on the platform!
        </p>
        <button
          onClick={handleRefresh}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all duration-200 shadow-lg"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white dark:text-white">
          Community Activity
        </h3>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 rounded-lg bg-white/20 dark:bg-gray-800/20 hover:bg-white/30 dark:hover:bg-gray-800/30 transition-all duration-200 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 text-white/80 dark:text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Activity Feed */}
      <div className="space-y-4 max-h-80 overflow-y-auto">
        {activities.map((activity, index) => {
          const activityIcon = getActivityIcon(activity.activity_type);
          const activityColor = getActivityColor(activity.activity_type);

          return (
            <div key={activity.id} className="group relative">
              {/* Activity Item */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-white/10 dark:bg-gray-800/10 hover:bg-white/20 dark:hover:bg-gray-800/20 transition-all duration-200 border border-white/20 dark:border-gray-700/20">
                {/* User Avatar */}
                <div className="relative">
                  {activity.user.avatar_url ? (
                    <img
                      src={activity.user.avatar_url}
                      alt={`${activity.user.first_name} ${activity.user.last_name}`}
                      className="w-10 h-10 rounded-full object-cover border-2 border-white/30 dark:border-gray-600/30"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold border-2 border-white/30 dark:border-gray-600/30">
                      {getUserInitials(activity.user.first_name, activity.user.last_name)}
                    </div>
                  )}
                  {/* Activity Icon Badge */}
                  <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-r ${activityColor} flex items-center justify-center text-xs border-2 border-white dark:border-gray-800`}>
                    {activityIcon}
                  </div>
                </div>

                {/* Activity Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex-1">
                      <p className="text-sm text-white dark:text-white">
                        <span className="font-semibold">
                          {activity.user.first_name} {activity.user.last_name}
                        </span>
                        <span className="ml-1">
                          {activity.activity_description || generateActivityDescription(
                            activity.activity_type,
                            activity.metadata
                          )}
                        </span>
                      </p>
                      {activity.user.organization && (
                        <p className="text-xs text-white/60 dark:text-gray-500 mt-0.5">
                          at {activity.user.organization}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-white/60 dark:text-gray-500 flex items-center gap-1 ml-2 flex-shrink-0">
                      <Clock className="h-3 w-3" />
                      {getTimeAgo(activity.created_at)}
                    </span>
                  </div>

                  {/* Project Link */}
                  {activity.metadata?.project_id && (
                    <Link
                      href={`/projects/${activity.metadata.project_id}`}
                      className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors mt-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View Project
                    </Link>
                  )}
                </div>
              </div>

              {/* Connection Line (except for last item) */}
              {index < activities.length - 1 && (
                <div className="absolute left-8 top-16 w-px h-4 bg-gradient-to-b from-white/20 to-transparent dark:from-gray-600/30 dark:to-transparent" />
              )}
            </div>
          );
        })}
      </div>

      {/* Load More */}
      {activities.length >= 10 && (
        <div className="pt-4 border-t border-white/20 dark:border-gray-700/30">
          <button
            className="w-full text-sm text-white/80 dark:text-gray-400 hover:text-white dark:hover:text-white transition-colors py-2"
            onClick={() => {
              // TODO: Implement pagination
              console.log('Load more activities');
            }}
          >
            Load more activity...
          </button>
        </div>
      )}

      {/* Activity Stats Footer */}
      <div className="pt-4 border-t border-white/20 dark:border-gray-700/30">
        <div className="flex items-center justify-between text-xs text-white/60 dark:text-gray-500">
          <span>{activities.length} recent activities</span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Live updates
          </span>
        </div>
      </div>
    </div>
  );
};

export default RecentActivityWidget; 