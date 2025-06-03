"use client";

// Projects feature entry point

import React, { Suspense, useState, useEffect } from 'react';
import { Plus, Calendar, ExternalLink, Github, Image, Clock, Users, Folder, Star } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUserProfile, AdminOnly, UserOnly } from '../../utils/auth';
import CreateReviewForm from '@/components/reviews/CreateReviewForm';

// Temporary data structure matching the schema
interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  color?: string;
  created_at: string;
}

interface Project {
  id: string;
  title: string;
  description: string;
  deadline?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  screenshots_urls?: string[];
  live_preview_url?: string;
  repo_url?: string;
  user_id: string;
  created_at: string;
  tasks: Task[];
}

// Mock data for development
const mockProjects: Project[] = [
  {
    id: '1',
    title: 'E-commerce Website Redesign',
    description: 'Complete overhaul of the existing e-commerce platform with modern design and improved user experience.',
    deadline: '2024-03-15',
    status: 'in_progress',
    screenshots_urls: ['/project-screenshot-1.png'],
    live_preview_url: 'https://demo.example.com',
    repo_url: 'https://github.com/user/ecommerce-redesign',
    user_id: 'user_123',
    created_at: '2024-01-15T10:00:00Z',
    tasks: [
      {
        id: '1',
        title: 'Design homepage mockup',
        description: 'Create modern homepage design with focus on user experience',
        status: 'completed',
        color: 'green',
        created_at: '2024-01-15T10:00:00Z'
      },
      {
        id: '2',
        title: 'Implement responsive navigation',
        description: 'Build mobile-first navigation component',
        status: 'in_progress',
        color: 'blue',
        created_at: '2024-01-16T10:00:00Z'
      },
      {
        id: '3',
        title: 'Set up payment gateway',
        description: 'Integration with Stripe payment processing',
        status: 'pending',
        color: 'orange',
        created_at: '2024-01-17T10:00:00Z'
      }
    ]
  }
];

// Custom hook for projects data  
const useProjects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile, isAdmin } = useUserProfile();

  useEffect(() => {
    const fetchProjects = async () => {
      if (!profile) return;

      try {
        let projectsData: any[] = [];

        if (isAdmin) {
          // Admin: fetch all projects
          const response = await fetch('/api/admin/projects');
          if (response.ok) {
            projectsData = await response.json();
          } else {
            console.error('Error fetching admin projects:', response.status);
            setLoading(false);
            return;
          }
        } else {
          // Regular user: fetch own projects
          const response = await fetch('/api/user/projects');
          if (response.ok) {
            projectsData = await response.json();
          } else {
            console.error('Error fetching user projects:', response.status);
            setLoading(false);
            return;
          }
        }

        console.log('Fetched projects:', projectsData);

        if (!projectsData || projectsData.length === 0) {
          setProjects([]);
          setLoading(false);
          return;
        }

        // Fetch tasks for each project
        const projectsWithTasks = await Promise.all(
          projectsData.map(async (project) => {
            try {
              // Use the appropriate API based on user role
              const tasksUrl = isAdmin 
                ? `/api/admin/projects/tasks?project_id=${project.id}`
                : `/api/user/projects/tasks?project_id=${project.id}`;
              
              const tasksResponse = await fetch(tasksUrl);
              let tasks: Task[] = [];
              
              if (tasksResponse.ok) {
                tasks = await tasksResponse.json();
              } else {
                console.error(`Error fetching tasks for project ${project.id}:`, tasksResponse.status, await tasksResponse.text());
              }

              return {
                id: project.id,
                title: project.title,
                description: project.description || '',
                deadline: project.deadline,
                status: project.status,
                screenshots_urls: project.screenshots_urls || [],
                live_preview_url: project.live_preview_url,
                repo_url: project.repo_url,
                user_id: project.user_id,
                created_at: project.created_at,
                tasks: tasks || []
              };
            } catch (error) {
              console.error(`Error processing project ${project.id}:`, error);
              return {
                id: project.id,
                title: project.title,
                description: project.description || '',
                deadline: project.deadline,
                status: project.status,
                screenshots_urls: project.screenshots_urls || [],
                live_preview_url: project.live_preview_url,
                repo_url: project.repo_url,
                user_id: project.user_id,
                created_at: project.created_at,
                tasks: []
              };
            }
          })
        );

        setProjects(projectsWithTasks);
      } catch (error) {
        console.error('Error in fetchProjects:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [profile, isAdmin]);

  return { projects, loading };
};

// Project Card Component
const ProjectCard = ({ project, onReviewCreated }: { project: Project; onReviewCreated?: () => void }) => {
  const [isCreateReviewOpen, setIsCreateReviewOpen] = useState(false);
  const { isAdmin } = useUserProfile();

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          color: '#22C55E',
          bgColor: 'rgba(34, 197, 94, 0.1)',
          variant: 'border-green-500 text-green-500',
          label: 'Completed'
        };
      case 'active':
      case 'in_progress':
        return {
          color: '#3B82F6',
          bgColor: 'rgba(59, 130, 246, 0.1)',
          variant: 'border-blue-500 text-blue-500',
          label: 'Active'
        };
      case 'pending':
        return {
          color: '#EAB308',
          bgColor: 'rgba(234, 179, 8, 0.1)',
          variant: 'border-yellow-500 text-yellow-500',
          label: 'Pending'
        };
      case 'cancelled':
        return {
          color: '#EF4444',
          bgColor: 'rgba(239, 68, 68, 0.1)',
          variant: 'border-red-500 text-red-500',
          label: 'Cancelled'
        };
      default:
        return {
          color: '#6B7280',
          bgColor: 'rgba(107, 114, 128, 0.1)',
          variant: 'border-gray-500 text-gray-500',
          label: 'Unknown'
        };
    }
  };

  const completedTasks = project.tasks.filter(task => task.status === 'completed').length;
  const totalTasks = project.tasks.length;
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  const statusInfo = getStatusInfo(project.status);

  return (
    <div className="relative">
      <Link href={`/projects/${project.id}`}>
        <div style={{ borderTop: `3px solid ${statusInfo.color}` }} className="rounded-lg overflow-hidden">
          <Card 
            className="overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer h-full flex flex-col group glass-card card-3d has-video border-t-0"
            videoSrc="/card.mp4"
            videoOpacity="opacity-50" 
            videoBlendMode="mix-blend-multiply dark:mix-blend-lighten"
            bgColor="bg-slate-500/75 dark:bg-gray-900/80"
            borderColor="border-gray-200 dark:border-gray-700/50"
          >
            <div className="p-6 pb-2">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border-2 mb-3 bg-white/20 backdrop-blur-sm" style={{ borderColor: statusInfo.color, color: statusInfo.color }}>
                    {statusInfo.label}
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-blue-300 transition-colors line-clamp-1">
                    {project.title}
                  </h3>
                  <p className="text-white/80 line-clamp-2 text-sm leading-relaxed">
                    {project.description}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-6 pt-0 flex-grow">
              {/* SVG Progress Ring */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="relative h-14 w-14">
                    {/* Background circle */}
                    <svg className="h-14 w-14 transform -rotate-90" viewBox="0 0 36 36">
                      <circle 
                        cx="18" 
                        cy="18" 
                        r="16" 
                        fill="none" 
                        stroke="rgba(255,255,255,0.3)" 
                        strokeWidth="2"
                      />
                      {/* Progress circle */}
                      <circle
                        cx="18"
                        cy="18"
                        r="16"
                        fill="none"
                        stroke={statusInfo.color}
                        strokeWidth="2"
                        strokeDasharray={`${completionPercentage * 1.005} 100.5`}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-in-out"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-semibold text-white">{completionPercentage}%</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Progress</p>
                    <p className="text-xs text-white/70">
                      {completedTasks} / {totalTasks} tasks
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Project Meta Information */}
              <div className="space-y-3">
                {project.deadline && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-white/70" />
                    <span className="text-sm text-white/70">
                      Due {new Date(project.deadline).toLocaleDateString()}
                    </span>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {totalTasks > 0 && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4 text-white/70" />
                        <span className="text-sm text-white/70">{totalTasks} tasks</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {project.live_preview_url && (
                      <div className="w-2 h-2 rounded-full bg-green-400" title="Live preview available" />
                    )}
                    {project.repo_url && (
                      <div className="w-2 h-2 rounded-full bg-gray-400" title="Repository available" />
                    )}
                  </div>
                </div>
              </div>

              {/* Screenshot Preview */}
              {project.screenshots_urls && project.screenshots_urls.length > 0 && (
                <div className="mt-4">
                  <div className="relative h-32 w-full rounded-lg overflow-hidden bg-white/10 backdrop-blur-sm">
                    <img
                      src={project.screenshots_urls[0]}
                      alt={`${project.title} preview`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    {project.screenshots_urls.length > 1 && (
                      <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
                        +{project.screenshots_urls.length - 1}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </Link>
      
      {/* Review Button for Completed Projects (Non-Admin Users Only) */}
      {project.status === 'completed' && !isAdmin && (
        <div className="absolute bottom-4 right-4">
          <Button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsCreateReviewOpen(true);
            }}
            size="sm"
            className="bg-yellow-500 hover:bg-yellow-600 text-white shadow-lg"
          >
            <Star className="w-4 h-4 mr-1" />
            Review
          </Button>
        </div>
      )}

      {/* Create Review Form Modal */}
      <CreateReviewForm
        isOpen={isCreateReviewOpen}
        onClose={() => setIsCreateReviewOpen(false)}
        onSuccess={() => {
          onReviewCreated?.();
          setIsCreateReviewOpen(false);
        }}
      />
    </div>
  );
};

// Empty State Component
const EmptyState = ({ isAdmin }: { isAdmin: boolean }) => (
  <div className="text-center py-12">
    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/20">
      <Plus className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
    </div>
    <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
      {isAdmin ? 'No projects yet' : 'No projects assigned'}
    </h3>
    <p className="mb-6 text-gray-600 dark:text-gray-400">
      {isAdmin 
        ? 'Get started by creating your first project for a client.' 
        : 'You don\'t have any projects assigned yet. Contact your project manager.'
      }
    </p>
    {isAdmin && (
      <Link
        href="/projects/create"
        className="inline-flex items-center rounded-md bg-yellow-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
      >
        <Plus className="mr-2 h-4 w-4" />
        Create Project
      </Link>
    )}
  </div>
);

// Main Projects Component
const ProjectsContent = () => {
  const { projects, loading } = useProjects();
  const { isAdmin } = useUserProfile();
  const [filter, setFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [refreshKey, setRefreshKey] = useState(0);

  const filteredProjects = projects.filter(project => {
    if (filter === 'all') return true;
    return project.status === filter;
  });

  const handleReviewCreated = () => {
    // Force a refresh of the projects data
    setRefreshKey(prev => prev + 1);
  };

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-96 animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg border" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto">
      <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                Projects
              </h1>
              <p className="text-base text-gray-600 dark:text-gray-300">
                Manage and track your project portfolio
              </p>
            </div>
            
            {/* Filter and View Controls */}
            <div className="flex items-center gap-3">
              <select 
                value={filter} 
                onChange={(e) => setFilter(e.target.value)}
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white/80 dark:bg-gray-800/80 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 backdrop-blur-sm"
              >
                <option value="all">All Projects</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Cancelled</option>
              </select>
              
              <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 bg-white/80 dark:bg-gray-800/80 p-1 backdrop-blur-sm">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Grid
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                    viewMode === 'list'
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  List
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Projects Grid/List */}
        {filteredProjects.length === 0 ? (
          <Card 
            className="glass-card card-3d has-video"
            videoSrc="/card.mp4"
            videoOpacity="opacity-40" 
            videoBlendMode="mix-blend-multiply dark:mix-blend-lighten"
            bgColor="bg-slate-500/75 dark:bg-gray-900/80"
            borderColor="border-gray-200 dark:border-gray-700/50"
          >
            <CardContent className="p-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                <Folder className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">No projects found</h3>
              <p className="text-white/80">
                {filter === 'all' ? 'Get started by creating your first project.' : `No projects match the "${filter}" filter.`}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className={`grid gap-6 ${
            viewMode === 'grid' 
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
              : 'grid-cols-1'
          }`}>
            {filteredProjects.map((project) => (
              <ProjectCard 
                key={`${project.id}-${refreshKey}`} 
                project={project} 
                onReviewCreated={handleReviewCreated}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Main Page Component
export default function ProjectsPage() {
  const { loading } = useUserProfile();
  
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <Suspense fallback={
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-yellow-500 border-t-transparent"></div>
      </div>
    }>
      <ProjectsContent />
    </Suspense>
  );
} 