"use client";

import React, { useState, useEffect } from 'react';
import { Save, User, Mail, Bell, CheckCircle, AlertCircle, Camera, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useUserProfile } from '../../utils/auth';

interface UserSettings {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  organization?: string;
  avatarUrl?: string;
  emailNotifications: boolean;
  inAppNotifications: boolean;
}

const SettingsPage = () => {
  const { profile, loading } = useUserProfile();
  const [settings, setSettings] = useState<UserSettings>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    organization: '',
    avatarUrl: '',
    emailNotifications: true,
    inAppNotifications: true,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  useEffect(() => {
    if (profile) {
      setSettings(prev => ({
        ...prev,
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        email: profile.email || '',
        phone: profile.phone || '',
        organization: profile.organization || '',
        avatarUrl: profile.avatarUrl || '',
      }));

      // Fetch email preferences for notifications toggle
      const fetchEmailPreferences = async () => {
        try {
          const response = await fetch('/api/user/profile/email-preferences');
          if (response.ok) {
            const emailPrefs = await response.json();
            // Set email notifications to true if ANY email preference is enabled
            const hasAnyEmailEnabled = Object.values(emailPrefs).some(value => value === true);
            setSettings(prev => ({
              ...prev,
              emailNotifications: hasAnyEmailEnabled
            }));
          }
        } catch (error) {
          console.error('Error fetching email preferences:', error);
        }
      };

      fetchEmailPreferences();
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: settings.firstName,
          lastName: settings.lastName,
          email: settings.email,
          phone: settings.phone,
          organization: settings.organization,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      setNotification({ type: 'success', message: 'Profile updated successfully!' });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setNotification({ type: 'error', message: 'Failed to update profile. Please try again.' });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailNotificationsToggle = async (enabled: boolean) => {
    try {
      // Update all email preferences to the same value
      const emailPreferences = {
        projectUpdates: enabled,
        estimateNotifications: enabled,
        invoiceReminders: enabled,
        marketingEmails: false, // Keep marketing emails separate
        systemNotifications: enabled,
      };

      const response = await fetch('/api/user/profile/email-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailPreferences),
      });

      if (!response.ok) {
        throw new Error('Failed to update email preferences');
      }

      setSettings(prev => ({ ...prev, emailNotifications: enabled }));
      setNotification({ 
        type: 'success', 
        message: `Email notifications ${enabled ? 'enabled' : 'disabled'} successfully!` 
      });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error('Error updating email preferences:', error);
      setNotification({ type: 'error', message: 'Failed to update email preferences. Please try again.' });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleInAppNotificationsToggle = (enabled: boolean) => {
    // For now, just update the state - in-app notifications can be implemented later
    setSettings(prev => ({ ...prev, inAppNotifications: enabled }));
    setNotification({ 
      type: 'success', 
      message: `In-app notifications ${enabled ? 'enabled' : 'disabled'} successfully!` 
    });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch('/api/user/profile/avatar', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload avatar');
      }

      const result = await response.json();
      setSettings(prev => ({ ...prev, avatarUrl: result.avatarUrl }));
      setNotification({ type: 'success', message: 'Avatar updated successfully!' });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      setNotification({ type: 'error', message: error instanceof Error ? error.message : 'Failed to upload avatar. Please try again.' });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setIsUploadingAvatar(false);
      // Reset the input
      event.target.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    setIsUploadingAvatar(true);
    try {
      const response = await fetch('/api/user/profile/avatar', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to remove avatar');
      }

      setSettings(prev => ({ ...prev, avatarUrl: '' }));
      setNotification({ type: 'success', message: 'Avatar removed successfully!' });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error('Error removing avatar:', error);
      setNotification({ type: 'error', message: 'Failed to remove avatar. Please try again.' });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          Settings
        </h1>
        <p className="text-base text-gray-600 dark:text-gray-300 mt-2">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`flex items-center gap-3 rounded-lg border p-4 ${
          notification.type === 'success' 
            ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400'
            : 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400'
        }`}>
          {notification.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          {notification.message}
        </div>
      )}

      {/* Profile Information */}
      <Card className="p-8">
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Profile Information
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Update your personal information and contact details.
            </p>
          </div>

          {/* Avatar Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
              Profile Avatar
            </label>
            <div className="flex items-center gap-6">
              {/* Avatar Display */}
              <div className="relative">
                <div className="h-20 w-20 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700">
                  {settings.avatarUrl ? (
                    <img
                      src={settings.avatarUrl}
                      alt="Profile avatar"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                      <User className="h-8 w-8" />
                    </div>
                  )}
                </div>
                {isUploadingAvatar && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  </div>
                )}
              </div>

              {/* Upload Controls */}
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <label
                    htmlFor="avatar-upload"
                    className="inline-flex items-center gap-2 cursor-pointer rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-4 py-2 text-sm font-medium text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors disabled:opacity-50"
                  >
                    <Camera className="h-4 w-4" />
                    {settings.avatarUrl ? 'Change Avatar' : 'Upload Avatar'}
                  </label>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    disabled={isUploadingAvatar}
                    className="hidden"
                  />
                  {settings.avatarUrl && (
                    <button
                      onClick={handleRemoveAvatar}
                      disabled={isUploadingAvatar}
                      className="inline-flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-2 text-sm font-medium text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
                    >
                      <X className="h-4 w-4" />
                      Remove
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  JPG, PNG or GIF. Max size 5MB.
                </p>
              </div>
            </div>
          </div>

          {/* Profile Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                First Name
              </label>
              <input
                type="text"
                value={settings.firstName}
                onChange={(e) => setSettings(prev => ({ ...prev, firstName: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="Enter your first name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Last Name
              </label>
              <input
                type="text"
                value={settings.lastName}
                onChange={(e) => setSettings(prev => ({ ...prev, lastName: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="Enter your last name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={settings.email}
                onChange={(e) => setSettings(prev => ({ ...prev, email: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="Enter your email address"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={settings.phone || ''}
                onChange={(e) => setSettings(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="Enter your phone number"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Organization
              </label>
              <input
                type="text"
                value={settings.organization || ''}
                onChange={(e) => setSettings(prev => ({ ...prev, organization: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="Enter your organization or company name"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSaveProfile}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="h-4 w-4" />
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </Card>

      {/* Notification Preferences */}
      <Card className="p-8">
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Notification Preferences
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Choose how you'd like to receive notifications.
            </p>
          </div>

          <div className="space-y-4">
            {/* Email Notifications */}
            <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    Email Notifications
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Receive notifications about projects, estimates, and invoices via email
                  </div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.emailNotifications}
                  onChange={(e) => handleEmailNotificationsToggle(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* In-App Notifications */}
            <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <Bell className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    In-App Notifications
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Show notifications within the application interface
                  </div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.inAppNotifications}
                  onChange={(e) => handleInAppNotificationsToggle(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
              </label>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SettingsPage; 