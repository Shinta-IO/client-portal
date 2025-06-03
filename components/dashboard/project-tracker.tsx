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
            <div key={i} className="h-16 bg-white/10 dark:bg-gray-800/20 rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-white/10 dark:bg-gray-800/20 rounded-lg animate-pulse" />
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
          <h3 className="text-lg font-semibold text-white dark:text-white mb-2">
            No Active Projects
          </h3>
          <p className="text-white/70 dark:text-gray-400 mb-4 text-sm">
            {isAdmin ? 'Create a new project to get started.' : 'You don\'t have any active projects yet.'}
          </p>
          <Link
            href={isAdmin ? "/projects/create" : "/projects"}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg text-sm"
          >
            <Layers className="h-4 w-4" />
            {isAdmin ? 'Create Project' : 'View Projects'}
          </Link>
        </div>

        {/* Show completed projects for admins with reactivation option */}
        {isAdmin && completedProjects.length > 0 && (
          <div className="border-t border-white/10 dark:border-gray-700/20 pt-6">
            <h4 className="text-sm font-medium text-white/80 dark:text-gray-300 mb-3">
              Completed Projects (Click to Reactivate)
            </h4>
            <div className="space-y-2">
              {completedProjects.slice(0, 3).map((project) => (
                <button
                  key={project.id}
                  onClick={() => reactivateProject(project.id)}
                  className="w-full text-left bg-white/5 dark:bg-gray-800/10 backdrop-blur-sm rounded-lg p-3 border border-white/10 dark:border-gray-700/20 hover:bg-white/10 dark:hover:bg-gray-800/20 transition-all duration-200 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white/70 text-sm group-hover:text-white transition-colors truncate">
                        {project.title}
                      </p>
                      <p className="text-xs text-white/50 dark:text-gray-500">
                        Completed • Click to reactivate
                      </p>
                    </div>
                    <CheckCircle2 className="h-4 w-4 text-green-400 group-hover:text-green-300 transition-colors" />
                  </div>
                </button>
              ))}
              {completedProjects.length > 3 && (
                <p className="text-xs text-white/50 dark:text-gray-500 text-center pt-2">
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
      {/* Simplified Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white/10 dark:bg-gray-800/20 backdrop-blur-sm rounded-lg p-3 border border-white/20 dark:border-gray-700/30">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-400" />
            <div>
              <p className="text-xs text-white/70 dark:text-gray-400">Active</p>
              <p className="text-lg font-bold text-white">{stats.totalActive}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/10 dark:bg-gray-800/20 backdrop-blur-sm rounded-lg p-3 border border-white/20 dark:border-gray-700/30">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-400" />
            <div>
              <p className="text-xs text-white/70 dark:text-gray-400">Tasks</p>
              <p className="text-lg font-bold text-white">{stats.completedTasks}/{stats.totalTasks}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/10 dark:bg-gray-800/20 backdrop-blur-sm rounded-lg p-3 border border-white/20 dark:border-gray-700/30">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-purple-400" />
            <div>
              <p className="text-xs text-white/70 dark:text-gray-400">Progress</p>
              <p className="text-lg font-bold text-white">
                {stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white/10 dark:bg-gray-800/20 backdrop-blur-sm rounded-lg p-3 border border-white/20 dark:border-gray-700/30">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <div>
              <p className="text-xs text-white/70 dark:text-gray-400">Overdue</p>
              <p className="text-lg font-bold text-white">{stats.overdue}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Quick Actions */}
      {isAdmin && (
        <div className="flex items-center justify-between bg-white/5 dark:bg-gray-800/10 backdrop-blur-sm rounded-lg p-3 border border-white/10 dark:border-gray-700/20">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-blue-400" />
            <span className="text-sm font-medium text-white/80">Admin Actions</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/projects/create"
              className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs transition-colors"
            >
              <Plus className="h-3 w-3" />
              New Project
            </Link>
            <Link
              href="/projects"
              className="inline-flex items-center gap-1 px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded-md text-xs transition-colors"
            >
              Manage All
            </Link>
          </div>
        </div>
      )}

      {/* Simplified Projects List */}
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {projects.slice(0, 5).map((project) => {
          const progress = getProjectProgress(project);
          const daysUntil = getDaysUntilDeadline(project.deadline);
          const overdue = isOverdue(project.deadline);

          return (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <div className="group bg-white/10 dark:bg-gray-800/20 backdrop-blur-sm rounded-lg p-3 border border-white/20 dark:border-gray-700/30 hover:bg-white/20 dark:hover:bg-gray-800/30 transition-all duration-200 cursor-pointer">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-white text-sm group-hover:text-blue-200 transition-colors truncate">
                      {project.title}
                    </h4>
                    <p className="text-xs text-white/60 dark:text-gray-500 truncate">
                      {project.tasks.length} tasks • {progress}% complete
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {overdue && (
                      <AlertCircle className="h-3 w-3 text-red-400" />
                    )}
                    {project.live_preview_url && (
                      <ExternalLink className="h-3 w-3 text-green-400" />
                    )}
                    <ArrowRight className="h-3 w-3 text-white/50 group-hover:text-white group-hover:translate-x-0.5 transition-all duration-200" />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  {/* Progress Bar */}
                  <div className="flex-1 mr-3">
                    <div className="w-full bg-white/20 dark:bg-gray-700/50 rounded-full h-1.5">
                      <div 
                        className="bg-gradient-to-r from-blue-400 to-purple-500 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Deadline */}
                  {project.deadline && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-white/50" />
                      <span className={`text-xs ${overdue ? 'text-red-400' : 'text-white/70'}`}>
                        {daysUntil !== null && daysUntil >= 0 ? `${daysUntil}d` : `${Math.abs(daysUntil!)}d overdue`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* View All Link */}
      {projects.length > 0 && (
        <div className="pt-2 border-t border-white/10 dark:border-gray-700/20">
          <Link
            href="/projects"
            className="flex items-center justify-center gap-2 text-sm text-white/70 dark:text-gray-400 hover:text-white dark:hover:text-white transition-colors group py-2"
          >
            <span>View all projects</span>
            <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform duration-200" />
          </Link>
        </div>
      )}
    </div>
  );
};

export default ProjectTracker; 