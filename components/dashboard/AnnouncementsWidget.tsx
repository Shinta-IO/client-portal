'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';

interface Announcement {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  expires_at: string | null;
  created_at: string;
  profiles: {
    first_name: string;
    last_name: string;
  } | null;
}

// Icon mapping based on announcement type/content
const getAnnouncementIcon = (title: string, content: string) => {
  const titleLower = title.toLowerCase();
  const contentLower = content.toLowerCase();
  
  if (titleLower.includes('feature') || titleLower.includes('new') || contentLower.includes('feature')) {
    return '🚀';
  }
  if (titleLower.includes('maintenance') || contentLower.includes('maintenance')) {
    return '🔧';
  }
  if (titleLower.includes('integration') || titleLower.includes('stripe') || contentLower.includes('payment')) {
    return '🔗';
  }
  if (titleLower.includes('update') || contentLower.includes('update')) {
    return '📱';
  }
  if (titleLower.includes('security') || contentLower.includes('security')) {
    return '🔒';
  }
  return '📢'; // Default announcement icon
};

// Generate a placeholder color based on the announcement type
const getPlaceholderColor = (title: string, content: string) => {
  const titleLower = title.toLowerCase();
  const contentLower = content.toLowerCase();
  
  if (titleLower.includes('timeline') || titleLower.includes('project')) {
    return 'from-blue-500 to-blue-600';
  }
  if (titleLower.includes('maintenance')) {
    return 'from-orange-500 to-orange-600';
  }
  if (titleLower.includes('stripe') || titleLower.includes('payment') || titleLower.includes('integration')) {
    return 'from-purple-500 to-purple-600';
  }
  // Default gradient
  return 'from-indigo-500 to-indigo-600';
};

export default function AnnouncementsWidget() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/announcements');
      if (!response.ok) {
        throw new Error('Failed to fetch announcements');
      }
      const data = await response.json();
      setAnnouncements(data);
    } catch (err) {
      console.error('Error fetching announcements:', err);
      setError('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  if (announcements.length === 0) {
    return (
      <div className="space-y-6">
        <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">No announcements at this time.</p>
        <div className="h-24 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl border-2 border-dashed border-blue-300 dark:border-blue-600 flex items-center justify-center">
          <div className="text-center">
            <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">Announcements will appear here</span>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-medium">Stay tuned for updates</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {announcements.map((announcement) => (
        <div key={announcement.id} className="flex gap-4 p-4 bg-white/90 dark:bg-gray-800/70 rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-white/95 dark:hover:bg-gray-800/80 transition-all duration-200 shadow-sm hover:shadow-md">
          {/* Enhanced Image/Icon */}
          <div className="flex-shrink-0">
            <div className="w-16 h-16 rounded-xl overflow-hidden border border-gray-300 dark:border-gray-600">
              {announcement.image_url ? (
                <img 
                  src={announcement.image_url}
                  alt={announcement.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to gradient with emoji if image fails to load
                    const target = e.target as HTMLImageElement;
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = `
                        <div class="w-full h-full bg-gradient-to-br ${getPlaceholderColor(announcement.title, announcement.content)} flex items-center justify-center">
                          <span class="text-2xl">${getAnnouncementIcon(announcement.title, announcement.content)}</span>
                        </div>
                      `;
                    }
                  }}
                />
              ) : (
                // Enhanced default gradient background with emoji icon when no image is provided
                <div className={`w-full h-full bg-gradient-to-br ${getPlaceholderColor(announcement.title, announcement.content)} flex items-center justify-center`}>
                  <span className="text-2xl">
                    {getAnnouncementIcon(announcement.title, announcement.content)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Enhanced Content */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white text-base mb-2">
              {announcement.title}
            </h3>
            <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed mb-3 font-medium">
              {announcement.content}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                {formatDate(announcement.created_at)}
              </span>
              {announcement.expires_at && (
                <span className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                  Expires {formatDate(announcement.expires_at)}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}

      {announcements.length > 3 && (
        <div className="text-center pt-4 border-t border-gray-300 dark:border-gray-600">
          <button className="text-sm text-blue-700 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200 font-semibold py-2 px-4 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors">
            View all announcements →
          </button>
        </div>
      )}
    </div>
  );
} 