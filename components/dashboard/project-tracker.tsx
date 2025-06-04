'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  ExternalLink, 
  TrendingUp,
  Layers,
  ArrowRight,
  Zap,
  AlertCircle,
  Plus
} from 'lucide-react';
import { useUserProfile } from '../../utils/auth';

interface Task {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed';
  color?: string;
  created_at: string;
}

interface Project {
  id: string;
  title: string;
  description: string;
  deadline?: string;
  status: 'pending' | 'active' | 'completed';
  screenshots_urls?: string[];
  live_preview_url?: string;
  repo_url?: string;
  tasks: Task[];
  created_at: string;
  user_id: string;
}

const ProjectTracker = () => {
  const { isAdmin, profile } = useUserProfile();
  const [projects, setProjects] = useState<Project[]>([]);
  const [completedProjects, setCompletedProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalActive: 0,
    totalTasks: 0,
    completedTasks: 0,
    overdue: 0
  });

  useEffect(() => {
    fetchProjects();
  }, [isAdmin, profile]);

  const fetchProjects = async () => {
    if (!profile) {
      console.log('No profile available, skipping project fetch');
      return;
    }

    console.log('Fetching projects for profile:', profile.id, 'isAdmin:', isAdmin);

    try {
      let projectsData: Project[] = [];

      if (isAdmin) {
        // Admin sees all projects
        console.log('Fetching admin projects...');
        const response = await fetch('/api/admin/projects');
        console.log('Admin projects response status:', response.status);
        
        if (response.ok) {
          projectsData = await response.json();
          console.log('Admin projects fetched:', projectsData.length);
        } else {
          const errorText = await response.text();
          console.error('Failed to fetch admin projects:', response.status, errorText);
        }
      } else {
        // Regular users see only their projects
        console.log('Fetching user projects...');
        const response = await fetch('/api/user/projects');
        console.log('User projects response status:', response.status);
        
        if (response.ok) {
          projectsData = await response.json();
          console.log('User projects fetched:', projectsData.length);
        } else {
          const errorText = await response.text();
          console.error('Failed to fetch user projects:', response.status, errorText);
        }
      }

      // Filter out completed projects for the tracker (but keep them for admin view)
      const activeProjects = projectsData.filter((project: Project) => 
        project.status !== 'completed'
      );

      // For admins, also get completed projects for quick reactivation
      const completedProjects = isAdmin ? projectsData.filter((project: Project) => 
        project.status === 'completed'
      ) : [];

      console.log('Active projects after filtering:', activeProjects.length);
      console.log('Completed projects (admin only):', completedProjects.length);

      // Fetch tasks for each active project
      const projectsWithTasks = await Promise.all(
        activeProjects.map(async (project: Project) => {
          try {
            const endpoint = isAdmin 
              ? `/api/admin/projects/tasks?project_id=${project.id}`
              : `/api/user/projects/tasks?project_id=${project.id}`;
            
            const tasksResponse = await fetch(endpoint);
            if (tasksResponse.ok) {
              const tasks = await tasksResponse.json();
              return { ...project, tasks: tasks || [] };
            } else {
              console.error(`Failed to fetch tasks for project ${project.id}:`, tasksResponse.status);
            }
            return { ...project, tasks: [] };
          } catch (error) {
            console.error(`Error fetching tasks for project ${project.id}:`, error);
            return { ...project, tasks: [] };
          }
        })
      );

      console.log('Final projects with tasks:', projectsWithTasks.length);
      setProjects(projectsWithTasks);
      
      // Store completed projects for admin display
      if (isAdmin && completedProjects.length > 0) {
        setCompletedProjects(completedProjects);
      }
      
      calculateStats(projectsWithTasks);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (projects: Project[]) => {
    const totalActive = projects.length;
    const allTasks = projects.flatMap(p => p.tasks);
    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter(t => t.status === 'completed').length;
    const overdue = projects.filter(p => 
      p.deadline && new Date(p.deadline) < new Date()
    ).length;

    setStats({ totalActive, totalTasks, completedTasks, overdue });
  };

  const getProjectProgress = (project: Project) => {
    if (project.tasks.length === 0) return 0;
    const completed = project.tasks.filter(task => task.status === 'completed').length;
    return Math.round((completed / project.tasks.length) * 100);
  };

  const getDaysUntilDeadline = (deadline?: string) => {
    if (!deadline) return null;
    const days = Math.ceil((new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const isOverdue = (deadline?: string) => {
    if (!deadline) return false;
    return new Date(deadline) < new Date();
  };

  const reactivateProject = async (projectId: string) => {
    if (!isAdmin) return;
    
    try {
      const response = await fetch('/api/admin/projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: projectId,
          status: 'active'
        })
      });

      if (response.ok) {
        // Refresh projects after reactivation
        fetchProjects();
      } else {
        console.error('Failed to reactivate project');
      }
    } catch (error) {
      console.error('Error reactivating project:', error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-300/70 dark:bg-gray-700/50 rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-300/70 dark:bg-gray-700/50 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
            <Layers className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No Active Projects
          </h3>
          <p className="text-gray-700 dark:text-gray-300 mb-4 text-sm">
            {isAdmin ? 'Create a new project to get started.' : 'You don\'t have any active projects yet.'}
          </p>
          <Link
            href={isAdmin ? "/projects/create" : "/projects"}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg text-sm font-medium"
          >
            <Layers className="h-4 w-4" />
            {isAdmin ? 'Create Project' : 'View Projects'}
          </Link>
        </div>

        {/* Show completed projects for admins with reactivation option */}
        {isAdmin && completedProjects.length > 0 && (
          <div className="border-t border-gray-300 dark:border-gray-600 pt-6">
            <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
              Completed Projects (Click to Reactivate)
            </h4>
            <div className="space-y-2">
              {completedProjects.slice(0, 3).map((project) => (
                <button
                  key={project.id}
                  onClick={() => reactivateProject(project.id)}
                  className="w-full text-left bg-gray-200/90 dark:bg-gray-700/80 backdrop-blur-sm rounded-lg p-3 border border-gray-300 dark:border-gray-600 hover:bg-gray-300/90 dark:hover:bg-gray-700/90 transition-all duration-200 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-gray-100 text-sm group-hover:text-gray-800 dark:group-hover:text-white transition-colors truncate">
                        {project.title}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Completed • Click to reactivate
                      </p>
                    </div>
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 group-hover:text-green-700 dark:group-hover:text-green-300 transition-colors" />
                  </div>
                </button>
              ))}
              {completedProjects.length > 3 && (
                <p className="text-xs text-gray-600 dark:text-gray-400 text-center pt-2">
                  +{completedProjects.length - 3} more completed projects
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Enhanced Stats with Better Visibility */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white/95 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg p-4 border border-gray-300 dark:border-gray-600 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
              <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">Active</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalActive}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/95 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg p-4 border border-gray-300 dark:border-gray-600 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">Tasks</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.completedTasks}/{stats.totalTasks}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/95 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg p-4 border border-gray-300 dark:border-gray-600 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
              <Zap className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">Progress</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white/95 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg p-4 border border-gray-300 dark:border-gray-600 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">Overdue</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.overdue}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Quick Actions with Enhanced Visibility */}
      {isAdmin && (
        <div className="flex items-center justify-between bg-white/95 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg p-4 border border-gray-300 dark:border-gray-600 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
              <Layers className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Admin Actions</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/projects/create"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              <Plus className="h-3 w-3" />
              New Project
            </Link>
            <Link
              href="/projects"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              Manage All
            </Link>
          </div>
        </div>
      )}

      {/* Enhanced Projects List */}
      <div className="space-y-3">
        {projects.slice(0, 5).map((project) => {
          const progress = getProjectProgress(project);
          const daysUntil = getDaysUntilDeadline(project.deadline);
          const overdue = isOverdue(project.deadline);

          return (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <div className="group bg-white/95 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg p-4 border border-gray-300 dark:border-gray-600 hover:bg-gray-50/95 dark:hover:bg-gray-700/90 hover:border-gray-400 dark:hover:border-gray-500 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 dark:text-white text-base group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors truncate">
                      {project.title}
                    </h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                      {project.tasks.length} tasks • {progress}% complete
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {overdue && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 rounded-md">
                        <AlertCircle className="h-3 w-3 text-red-600 dark:text-red-400" />
                        <span className="text-xs font-medium text-red-700 dark:text-red-300">Overdue</span>
                      </div>
                    )}
                    {project.live_preview_url && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded-md">
                        <ExternalLink className="h-3 w-3 text-green-600 dark:text-green-400" />
                        <span className="text-xs font-medium text-green-700 dark:text-green-300">Live</span>
                      </div>
                    )}
                    <ArrowRight className="h-4 w-4 text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200 group-hover:translate-x-1 transition-all duration-200" />
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Enhanced Progress Bar */}
                  <div className="flex-1">
                    <div className="w-full bg-gray-300 dark:bg-gray-600 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Enhanced Deadline */}
                  {project.deadline && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      <span className={`text-sm font-medium ${
                        overdue 
                          ? 'text-red-600 dark:text-red-400' 
                          : 'text-gray-700 dark:text-gray-300'
                      }`}>
                        {daysUntil !== null && daysUntil >= 0 ? `${daysUntil} days` : `${Math.abs(daysUntil!)} days overdue`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Enhanced View All Link */}
      {projects.length > 0 && (
        <div className="pt-4 border-t border-gray-300 dark:border-gray-600">
          <Link
            href="/projects"
            className="flex items-center justify-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors group py-3 px-4 rounded-lg hover:bg-gray-100/80 dark:hover:bg-gray-800/50"
          >
            <span>View all projects</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
          </Link>
        </div>
      )}
    </div>
  );
};

export default ProjectTracker; 