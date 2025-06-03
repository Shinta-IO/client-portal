"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, Calendar, Github, ExternalLink, Upload, Users, ChevronDown, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useUserProfile } from '../../../utils/auth';
import { createClerkSupabaseClient } from '../../../utils/supabase';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  created_at: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
}

interface ProjectFormData {
  title: string;
  description: string;
  userId: string; // Client to assign project to
  deadline: string;
  status: 'pending' | 'active' | 'completed';
  livePreviewUrl: string;
  repoUrl: string;
  tasks: Task[];
  screenshots: File[];
}

const CreateProjectPage = () => {
  const router = useRouter();
  const { isAdmin, loading, user } = useUserProfile();
  const supabase = createClerkSupabaseClient();
  const [formData, setFormData] = useState<ProjectFormData>({
    title: '',
    description: '',
    userId: '',
    deadline: '',
    status: 'pending',
    livePreviewUrl: '',
    repoUrl: '',
    tasks: [],
    screenshots: [],
  });

  const [newTask, setNewTask] = useState({ title: '', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Load available clients/users
  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      console.log('Fetching users from /api/admin/users...');
      const response = await fetch('/api/admin/users');
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Users data received:', data);
        setUsers(data.users || []);
      } else {
        const errorData = await response.json();
        console.error('Failed to fetch users:', response.status, errorData);
        // Show error to user
        if (response.status === 401) {
          alert('Not authenticated. Please sign in again.');
        } else if (response.status === 403) {
          alert('Access denied. You need admin privileges.');
        } else {
          alert(`Failed to fetch users: ${errorData.error || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      alert(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Redirect non-admins
  if (!loading && !isAdmin) {
    router.push('/projects');
    return null;
  }

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-yellow-500 border-t-transparent"></div>
      </div>
    );
  }

  const handleInputChange = (field: keyof ProjectFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addTask = () => {
    if (newTask.title.trim()) {
      const task: Task = {
        id: Date.now().toString(),
        title: newTask.title,
        description: newTask.description,
        status: 'pending',
      };
      setFormData(prev => ({ ...prev, tasks: [...prev.tasks, task] }));
      setNewTask({ title: '', description: '' });
    }
  };

  const removeTask = (taskId: string) => {
    setFormData(prev => ({
      ...prev,
      tasks: prev.tasks.filter(task => task.id !== taskId)
    }));
  };

  const updateTaskStatus = (taskId: string, status: Task['status']) => {
    setFormData(prev => ({
      ...prev,
      tasks: prev.tasks.map(task =>
        task.id === taskId ? { ...task, status } : task
      )
    }));
  };

  const handleScreenshotUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setFormData(prev => ({ ...prev, screenshots: [...prev.screenshots, ...files] }));
  };

  const removeScreenshot = (index: number) => {
    setFormData(prev => ({
      ...prev,
      screenshots: prev.screenshots.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // TEMPORARY DEBUG: Check user data and admin status
      console.log('=== USER DEBUG ===');
      console.log('isAdmin from hook:', isAdmin);
      console.log('User public metadata:', user?.publicMetadata);
      console.log('User role:', user?.publicMetadata?.role);
      console.log('=== END DEBUG ===');

      // Prepare project data
      const projectData = {
        user_id: formData.userId,
        title: formData.title,
        description: formData.description,
        status: formData.status,
        deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null,
        live_preview_url: formData.livePreviewUrl || null,
        repo_url: formData.repoUrl || null,
        screenshots_urls: [], // TODO: Handle file uploads later
      };

      console.log('Creating project with data:', projectData);

      // Use admin API endpoint instead of direct Supabase
      const response = await fetch('/api/admin/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(projectData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to create project: ${errorData.error || 'Unknown error'}`);
      }

      const { project } = await response.json();
      console.log('Project created successfully:', project);

      // If tasks were added, insert them using admin API
      if (formData.tasks.length > 0 && project) {
        console.log('Creating tasks for project:', project.id);
        
        for (const task of formData.tasks) {
          try {
            const taskResponse = await fetch('/api/admin/projects/tasks', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                project_id: project.id,
                title: task.title,
                description: task.description,
                status: task.status,
              }),
            });

            if (!taskResponse.ok) {
              const errorData = await taskResponse.json();
              console.error('Task creation error:', errorData);
            } else {
              console.log('Task created successfully:', task.title);
            }
          } catch (taskError) {
            console.error('Error creating task:', task.title, taskError);
          }
        }
      }
      
      // Show success message and redirect
      alert('Project created successfully!');
      router.push('/projects');
    } catch (error) {
      console.error('Error creating project:', error);
      alert(`Failed to create project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
          Create New Project
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2 text-lg">
          Set up a new project with tasks, deadlines, and client assignment
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Project Information */}
        <Card 
          className="p-6"
          bgColor="bg-white dark:bg-gray-900"
          borderColor="border-gray-200 dark:border-gray-700"
        >
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Project Details
          </h2>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Project Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="Enter project title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Users className="inline w-4 h-4 mr-1" />
                Assign to Client *
              </label>
              <select
                required
                value={formData.userId}
                onChange={(e) => handleInputChange('userId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                disabled={loadingUsers}
              >
                <option value="">
                  {loadingUsers ? 'Loading clients...' : 'Select a client'}
                </option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.first_name} {user.last_name} ({user.email})
                  </option>
                ))}
              </select>
              {users.length === 0 && !loadingUsers && (
                <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                  No clients available. Users need to sign up first.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Deadline
              </label>
              <input
                type="date"
                value={formData.deadline}
                onChange={(e) => handleInputChange('deadline', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="pending">Not Started</option>
                <option value="active">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Describe the project"
            />
          </div>
        </Card>

        {/* URLs Section */}
        <Card 
          className="p-6"
          bgColor="bg-white dark:bg-gray-900"
          borderColor="border-gray-200 dark:border-gray-700"
        >
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Project Links
          </h2>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <ExternalLink className="inline w-4 h-4 mr-1" />
                Live Preview URL
              </label>
              <input
                type="url"
                value={formData.livePreviewUrl}
                onChange={(e) => handleInputChange('livePreviewUrl', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="https://preview.example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Github className="inline w-4 h-4 mr-1" />
                GitHub Repository URL
              </label>
              <input
                type="url"
                value={formData.repoUrl}
                onChange={(e) => handleInputChange('repoUrl', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="https://github.com/username/repo"
              />
            </div>
          </div>
        </Card>

        {/* Tasks Section */}
        <Card 
          className="p-6"
          bgColor="bg-white dark:bg-gray-900"
          borderColor="border-gray-200 dark:border-gray-700"
        >
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Project Tasks
          </h2>
          
          {/* Add new task */}
          <div className="space-y-3 mb-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-lg border border-blue-200 dark:border-gray-600">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Add New Task</h3>
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="Task title"
                />
              </div>
              <div>
                <input
                  type="text"
                  value={newTask.description}
                  onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="Task description"
                />
              </div>
              <div>
                <button
                  type="button"
                  onClick={addTask}
                  disabled={!newTask.title.trim()}
                  className="w-full flex items-center justify-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg transition-all duration-200 shadow-sm disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Task
                </button>
              </div>
            </div>
          </div>

          {/* Tasks list */}
          <div className="space-y-3">
            {formData.tasks.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No tasks yet</h3>
                <p className="text-gray-500 dark:text-gray-400">Add tasks to help track project progress.</p>
              </div>
            ) : (
              formData.tasks.map((task, index) => (
                <div key={task.id} className="group flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-500 transition-all duration-200 shadow-sm">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 dark:text-white truncate">{task.title}</h4>
                      {task.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{task.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      value={task.status}
                      onChange={(e) => updateTaskStatus(task.id, e.target.value as Task['status'])}
                      className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="pending">📋 Pending</option>
                      <option value="in_progress">⚡ In Progress</option>
                      <option value="completed">✅ Completed</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => removeTask(task.id)}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Screenshots Section */}
        <Card 
          className="p-6"
          bgColor="bg-white dark:bg-gray-900"
          borderColor="border-gray-200 dark:border-gray-700"
        >
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Screenshots
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Upload Screenshots
              </label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleScreenshotUpload}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>

            {formData.screenshots.length > 0 && (
              <div className="grid gap-3 md:grid-cols-3">
                {formData.screenshots.map((file, index) => (
                  <div key={index} className="relative p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {file.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeScreenshot(index)}
                        className="p-1 text-red-500 hover:text-red-700"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end pt-6">
          <button
            type="submit"
            disabled={isSubmitting || !formData.title || !formData.userId}
            className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl disabled:cursor-not-allowed disabled:shadow-none transform hover:scale-105 disabled:hover:scale-100"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                Creating Project...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Create Project
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateProjectPage; 