import { createClient } from '@supabase/supabase-js';

// Initialize Supabase with service role for activity operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing required Supabase environment variables for activity service');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface ActivityEvent {
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
}

export interface ActivityFeedItem extends ActivityEvent {
  user: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
    organization?: string;
  };
}

export class RecentActivityService {
  private static instance: RecentActivityService;

  private constructor() {}

  public static getInstance(): RecentActivityService {
    if (!RecentActivityService.instance) {
      RecentActivityService.instance = new RecentActivityService();
    }
    return RecentActivityService.instance;
  }

  /**
   * Record a project creation activity
   */
  async recordProjectCreated(
    userId: string,
    projectId: string,
    projectTitle: string,
    userName: string,
    userAvatar?: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('recent_activity')
        .insert({
          user_id: userId,
          activity_type: 'project_created',
          activity_description: `New project "${projectTitle}" has been created`,
          metadata: {
            project_id: projectId,
            project_title: projectTitle,
            user_name: userName,
            user_avatar: userAvatar
          }
        });

      if (error) {
        console.error('Error recording project created activity:', error);
        return false;
      }

      console.log(`Activity recorded: Project created - ${projectTitle}`);
      return true;
    } catch (error) {
      console.error('Error recording project created activity:', error);
      return false;
    }
  }

  /**
   * Record a project completion activity
   */
  async recordProjectCompleted(
    userId: string,
    projectId: string,
    projectTitle: string,
    userName: string,
    userAvatar?: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('recent_activity')
        .insert({
          user_id: userId,
          activity_type: 'project_completed',
          activity_description: `Project "${projectTitle}" has been completed! 🎉`,
          metadata: {
            project_id: projectId,
            project_title: projectTitle,
            user_name: userName,
            user_avatar: userAvatar
          }
        });

      if (error) {
        console.error('Error recording project completed activity:', error);
        return false;
      }

      console.log(`Activity recorded: Project completed - ${projectTitle}`);
      return true;
    } catch (error) {
      console.error('Error recording project completed activity:', error);
      return false;
    }
  }

  /**
   * Get recent activity feed (all users can see all activity)
   */
  async getActivityFeed(limit: number = 20, offset: number = 0): Promise<ActivityFeedItem[]> {
    try {
      // First, get the activities
      const { data: activities, error } = await supabase
        .from('recent_activity')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching activity feed:', error);
        return [];
      }

      if (!activities || activities.length === 0) {
        return [];
      }

      // Get unique user IDs from activities
      const userIds = [...new Set(activities.map(activity => activity.user_id))];

      // Fetch user profiles separately
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url, organization')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles for activity feed:', profilesError);
        // Return activities without user data as fallback
        return activities.map(activity => ({
          ...activity,
          user: {
            id: activity.user_id,
            first_name: activity.metadata?.user_name?.split(' ')[0] || 'Unknown',
            last_name: activity.metadata?.user_name?.split(' ').slice(1).join(' ') || '',
            avatar_url: activity.metadata?.user_avatar || null,
            organization: null
          }
        }));
      }

      // Create a map of profiles for quick lookup
      const profileMap = new Map(profiles.map(profile => [profile.id, profile]));

      // Transform the data to match our interface
      const feedItems: ActivityFeedItem[] = activities.map(activity => {
        const profile = profileMap.get(activity.user_id);
        
        return {
          id: activity.id,
          user_id: activity.user_id,
          activity_type: activity.activity_type,
          activity_description: activity.activity_description,
          metadata: activity.metadata || {},
          created_at: activity.created_at,
          user: {
            id: activity.user_id,
            first_name: profile?.first_name || activity.metadata?.user_name?.split(' ')[0] || 'Unknown',
            last_name: profile?.last_name || activity.metadata?.user_name?.split(' ').slice(1).join(' ') || '',
            avatar_url: profile?.avatar_url || activity.metadata?.user_avatar || null,
            organization: profile?.organization || null
          }
        };
      });

      return feedItems;
    } catch (error) {
      console.error('Error fetching activity feed:', error);
      return [];
    }
  }

  /**
   * Get activity stats for dashboard
   */
  async getActivityStats(): Promise<{
    totalActivities: number;
    recentProjectsCreated: number;
    recentProjectsCompleted: number;
    activeUsers: number;
  }> {
    try {
      // Get total activities in last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: totalActivities, error: totalError } = await supabase
        .from('recent_activity')
        .select('id', { count: 'exact' })
        .gte('created_at', thirtyDaysAgo.toISOString());

      const { data: projectsCreated, error: createdError } = await supabase
        .from('recent_activity')
        .select('id', { count: 'exact' })
        .eq('activity_type', 'project_created')
        .gte('created_at', thirtyDaysAgo.toISOString());

      const { data: projectsCompleted, error: completedError } = await supabase
        .from('recent_activity')
        .select('id', { count: 'exact' })
        .eq('activity_type', 'project_completed')
        .gte('created_at', thirtyDaysAgo.toISOString());

      const { data: activeUsers, error: usersError } = await supabase
        .from('recent_activity')
        .select('user_id')
        .gte('created_at', thirtyDaysAgo.toISOString());

      const uniqueUsers = new Set(activeUsers?.map(activity => activity.user_id) || []);

      return {
        totalActivities: totalActivities?.length || 0,
        recentProjectsCreated: projectsCreated?.length || 0,
        recentProjectsCompleted: projectsCompleted?.length || 0,
        activeUsers: uniqueUsers.size
      };
    } catch (error) {
      console.error('Error fetching activity stats:', error);
      return {
        totalActivities: 0,
        recentProjectsCreated: 0,
        recentProjectsCompleted: 0,
        activeUsers: 0
      };
    }
  }

  /**
   * Generate activity description based on type and metadata
   */
  static generateActivityDescription(
    activityType: ActivityEvent['activity_type'],
    metadata: ActivityEvent['metadata']
  ): string {
    switch (activityType) {
      case 'project_created':
        return `started working on "${metadata?.project_title || 'a new project'}"`;
      case 'project_completed':
        return `completed the project "${metadata?.project_title || 'Unknown Project'}" 🎉`;
      case 'estimate_requested':
        return `requested a new project estimate`;
      case 'estimate_approved':
        return `approved an estimate for "${metadata?.project_title || 'a project'}"`;
      case 'invoice_paid':
        return `paid an invoice for "${metadata?.project_title || 'a project'}"`;
      default:
        return 'had some activity';
    }
  }

  /**
   * Get activity icon based on type
   */
  static getActivityIcon(activityType: ActivityEvent['activity_type']): string {
    switch (activityType) {
      case 'project_created':
        return '🚀';
      case 'project_completed':
        return '🎉';
      case 'estimate_requested':
        return '📝';
      case 'estimate_approved':
        return '✅';
      case 'invoice_paid':
        return '💰';
      default:
        return '📱';
    }
  }

  /**
   * Get activity color based on type
   */
  static getActivityColor(activityType: ActivityEvent['activity_type']): string {
    switch (activityType) {
      case 'project_created':
        return 'from-blue-500 to-purple-600';
      case 'project_completed':
        return 'from-green-500 to-emerald-600';
      case 'estimate_requested':
        return 'from-yellow-500 to-orange-600';
      case 'estimate_approved':
        return 'from-teal-500 to-cyan-600';
      case 'invoice_paid':
        return 'from-green-500 to-teal-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  }
}

export const activityService = RecentActivityService.getInstance(); 