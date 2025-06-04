"use client";

import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Calendar, 
  ExternalLink, 
  Github, 
  Image, 
  Users, 
  CheckCircle2, 
  XCircle, 
  Clock,
  X,
  Edit3,
  Save,
  Plus,
  Monitor,
  Tablet,
  Smartphone,
  Maximize2,
  Edit,
  Trash2,
  Upload,
  TrendingUp,
  Layers,
  ArrowRight,
  Zap,
  AlertCircle
} from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { useUserProfile, AdminOnly } from '../../../utils/auth';
import { useRouter } from 'next/navigation';

// Types matching the schema
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
  description?: string;
  deadline?: string;
  status: 'pending' | 'active' | 'completed';
  screenshots_urls: string[];
  live_preview_url?: string;
  repo_url?: string;
  user_id: string;
  created_at: string;
  tasks: Task[];
}

// Mock project data - will be replaced with API call
const mockProject: Project = {
  id: '1',
  title: 'E-commerce Website Redesign',
  description: 'Complete overhaul of the client\'s online store with modern design and improved UX. This project involves rebuilding the entire frontend with React and implementing a new design system.',
  deadline: '2024-07-15T00:00:00Z',
  status: 'active',
  screenshots_urls: [],
  live_preview_url: 'https://example.com',
  repo_url: 'https://github.com/example/ecommerce',
  user_id: 'user-123',
  created_at: '2024-05-01T00:00:00Z',
  tasks: [
    { id: '1', title: 'Design mockups', status: 'completed', color: '#10b981', created_at: '2024-05-01T00:00:00Z' },
    { id: '2', title: 'Frontend development', status: 'in_progress', color: '#f59e0b', created_at: '2024-05-02T00:00:00Z' },
    { id: '3', title: 'Backend integration', status: 'pending', color: '#ef4444', created_at: '2024-05-03T00:00:00Z' },
    { id: '4', title: 'Testing & deployment', status: 'pending', color: '#6b7280', created_at: '2024-05-04T00:00:00Z' },
    { id: '5', title: 'Performance optimization', status: 'pending', color: '#8b5cf6', created_at: '2024-05-05T00:00:00Z' },
  ]
};

// Device view options
type DeviceView = 'desktop' | 'tablet' | 'mobile';

const deviceDimensions = {
  desktop: { width: '100%', height: '600px' },
  tablet: { width: '768px', height: '1024px' },
  mobile: { width: '375px', height: '667px' }
};

// Progress Ring Component
const ProgressRing = ({ percentage, size = 60 }: { percentage: number, size?: number }) => {
  const radius = (size - 8) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = `${circumference} ${circumference}`;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth="4"
          fill="transparent"
          className="text-gray-300 dark:text-gray-600"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth="4"
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          className="text-green-500 transition-all duration-300 ease-in-out"
        />
      </svg>
      <span className="absolute text-sm font-semibold text-gray-900 dark:text-white">
        {percentage}%
      </span>
    </div>
  );
};

// Task Status Badge
const TaskStatusBadge = ({ status }: { status: Task['status'] }) => {
  const statusConfig = {
    pending: { label: 'Pending', bgColor: 'bg-gray-100 dark:bg-gray-700', textColor: 'text-gray-800 dark:text-gray-200' },
    in_progress: { label: 'In Progress', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30', textColor: 'text-yellow-800 dark:text-yellow-200' },
    completed: { label: 'Completed', bgColor: 'bg-green-100 dark:bg-green-900/30', textColor: 'text-green-800 dark:text-green-200' }
  };

  const config = statusConfig[status];

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.bgColor} ${config.textColor}`}>
      {config.label}
    </span>
  );
};

// Responsive Preview Component
const ResponsivePreview = ({ url, isFullscreen, onClose }: { 
  url: string;
  isFullscreen: boolean;
  onClose: () => void;
}) => {
  // Mobile-first: default to mobile view
  const [deviceView, setDeviceView] = useState<DeviceView>('mobile');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Check if user is on mobile device
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobileDevice(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleIframeLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  // Enhanced keyboard and touch controls for fullscreen mode
  useEffect(() => {
    if (!isFullscreen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case '1':
          setDeviceView('desktop');
          break;
        case '2':
          setDeviceView('tablet');
          break;
        case '3':
          setDeviceView('mobile');
          break;
      }
    };

    // Add touch event for mobile escape
    const handleTouchStart = (e: TouchEvent) => {
      if (isMobileDevice && e.touches.length === 2) {
        // Two-finger tap to close on mobile
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('touchstart', handleTouchStart);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('touchstart', handleTouchStart);
    };
  }, [isFullscreen, onClose, isMobileDevice]);

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex flex-col">
        {/* Mobile-optimized Fullscreen Header */}
        <div className="bg-gray-900 text-white p-2 sm:p-4 flex items-center justify-between border-b border-gray-700">
          <div className="flex items-center gap-2 sm:gap-6 flex-1 min-w-0">
            <h3 className="text-lg sm:text-xl font-semibold truncate">Live Preview</h3>
            
            {/* Mobile-optimized device controls */}
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              {!isMobileDevice && (
                <span className="text-xs sm:text-sm text-gray-400 mr-1 sm:mr-2 hidden sm:block">Device:</span>
              )}
              <button
                onClick={() => setDeviceView('desktop')}
                className={`flex items-center gap-1 px-2 sm:px-4 py-1 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                  deviceView === 'desktop' 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }`}
                title="Desktop View"
              >
                <Monitor className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Desktop</span>
              </button>
              <button
                onClick={() => setDeviceView('tablet')}
                className={`flex items-center gap-1 px-2 sm:px-4 py-1 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                  deviceView === 'tablet' 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }`}
                title="Tablet View"
              >
                <Tablet className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Tablet</span>
              </button>
              <button
                onClick={() => setDeviceView('mobile')}
                className={`flex items-center gap-1 px-2 sm:px-4 py-1 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                  deviceView === 'mobile' 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }`}
                title="Mobile View"
              >
                <Smartphone className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Mobile</span>
              </button>
            </div>
          </div>
          
          {/* Close button - larger and more accessible on mobile */}
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            {!isMobileDevice && (
              <span className="text-xs sm:text-sm text-gray-400 hidden lg:block">
                {deviceView === 'desktop' ? 'Full Screen' : `${deviceDimensions[deviceView].width} × ${deviceDimensions[deviceView].height}`}
              </span>
            )}
            <button
              onClick={onClose}
              className="p-2 sm:p-2 hover:bg-gray-700 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              title="Close Preview"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        {/* Mobile-optimized Fullscreen Preview */}
        <div className="flex-1 flex items-center justify-center p-2 sm:p-8 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-hidden">
          <div 
            className="relative bg-white rounded-lg sm:rounded-2xl shadow-2xl overflow-hidden mx-auto transition-all duration-500 ease-in-out"
            style={{
              width: deviceView === 'desktop' ? (isMobileDevice ? '100vw' : '95vw') : 
                     deviceView === 'tablet' ? (isMobileDevice ? '100vw' : deviceDimensions[deviceView].width) :
                     isMobileDevice ? '100vw' : deviceDimensions[deviceView].width,
              height: isMobileDevice ? 'calc(100vh - 120px)' : 
                      deviceView === 'desktop' ? '85vh' : 
                      '80vh',
              maxWidth: isMobileDevice ? '100vw' : (deviceView === 'desktop' ? 'none' : deviceDimensions[deviceView].width),
              margin: isMobileDevice ? '0' : 'auto'
            }}
          >
            {isLoading && (
              <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 flex items-center justify-center z-10">
                <div className="text-center px-4">
                  <div className="h-8 w-8 sm:h-12 sm:w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
                  <p className="text-sm sm:text-lg text-gray-600 dark:text-gray-400">Loading {deviceView} preview...</p>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-500 mt-2">
                    {deviceView === 'desktop' ? 'Full screen experience' : `Simulating ${deviceView} viewport`}
                  </p>
                </div>
              </div>
            )}
            {hasError && (
              <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 flex items-center justify-center z-10">
                <div className="text-center px-4">
                  <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-6">
                    <X className="h-6 w-6 sm:h-8 sm:w-8 text-red-500" />
                  </div>
                  <h3 className="text-sm sm:text-lg font-medium text-gray-900 dark:text-white mb-2">Failed to load preview</h3>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-4">The preview couldn't be loaded in {deviceView} mode</p>
                  <div className="space-y-2">
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs sm:text-sm transition-colors"
                    >
                      <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4" />
                      Open in new tab
                    </a>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Try switching to desktop view for better compatibility
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <iframe
              key={`${deviceView}-${url}`}
              src={url}
              className="w-full h-full border-0"
              title={`Live Preview - ${deviceView} (Fullscreen)`}
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              allow="fullscreen"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
              style={{
                width: '100%',
                height: '100%'
              }}
            />
          </div>
        </div>

        {/* Mobile-optimized Footer */}
        <div className="bg-gray-900 border-t border-gray-700 px-2 sm:px-4 py-2">
          <div className="flex items-center justify-between text-xs sm:text-sm text-gray-400">
            <div className="flex items-center gap-2 sm:gap-6 min-w-0 flex-1">
              {isMobileDevice ? (
                <span className="truncate">Two-finger tap to exit</span>
              ) : (
                <>
                  <span>Press <kbd className="px-1 sm:px-2 py-1 bg-gray-800 rounded text-xs">ESC</kbd> to exit</span>
                  <span className="text-xs hidden sm:inline">Shortcuts: <kbd className="px-1 bg-gray-800 rounded">1</kbd> Desktop, <kbd className="px-1 bg-gray-800 rounded">2</kbd> Tablet, <kbd className="px-1 bg-gray-800 rounded">3</kbd> Mobile</span>
                </>
              )}
            </div>
            <span className="flex-shrink-0">
              <span className="text-blue-400 font-medium">{deviceView.charAt(0).toUpperCase() + deviceView.slice(1)}</span>
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Regular embedded view - Mobile optimized with mobile as default
  return (
    <div className="w-full">
      {/* Mobile-first Preview Container */}
      <div className="relative bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 h-64 sm:h-96">
        {isLoading && (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center z-10">
            <div className="text-center px-4">
              <div className="h-6 w-6 sm:h-8 sm:w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mx-auto mb-2"></div>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Loading mobile preview...</p>
            </div>
          </div>
        )}
        {hasError && (
          <div className="absolute inset-0 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 flex items-center justify-center z-10">
            <div className="text-center px-4">
              <div className="h-8 w-8 sm:h-12 sm:w-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
                <X className="h-4 w-4 sm:h-6 sm:w-6 text-red-500" />
              </div>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-3">Unable to load preview</p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs sm:text-sm transition-colors"
              >
                <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4" />
                Open in new tab
              </a>
            </div>
          </div>
        )}
        <iframe
          src={url}
          className="w-full h-full border-0"
          title="Live Preview (Mobile Optimized)"
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          loading="lazy"
        />
      </div>
    </div>
  );
};

// Project Status Badge Component
const ProjectStatusBadge = ({ status }: { status: string }) => {
  const statusConfig = {
    'pending': { 
      color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200',
      label: 'Pending'
    },
    'active': { 
      color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
      label: 'Active'
    },
    'completed': { 
      color: 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-200',
      label: 'Completed'
    },
    'on_hold': { 
      color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200',
      label: 'On Hold'
    },
    // Legacy support for 'planning' status
    'planning': { 
      color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200',
      label: 'Planning'
    }
  };

  // Default to pending if status is not recognized
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
      {config.label}
    </span>
  );
};

// Enhanced Task Card Component
const TaskCard = ({ task, onUpdate, onDelete }: { task: Task, onUpdate?: () => void, onDelete?: (id: string) => void }) => {
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          color: '#22C55E',
          bgColor: 'rgba(34, 197, 94, 0.1)',
          variant: 'border-green-500 text-green-500',
          label: 'Completed'
        };
      case 'in_progress':
        return {
          color: '#3B82F6',
          bgColor: 'rgba(59, 130, 246, 0.1)',
          variant: 'border-blue-500 text-blue-500',
          label: 'In Progress'
        };
      case 'pending':
        return {
          color: '#EAB308',
          bgColor: 'rgba(234, 179, 8, 0.1)',
          variant: 'border-yellow-500 text-yellow-500',
          label: 'Pending'
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

  const statusInfo = getStatusInfo(task.status);

  return (
    <div 
      className="group relative overflow-hidden rounded-lg border transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
      style={{ 
        borderLeft: `4px solid ${task.color || statusInfo.color}`,
        background: `linear-gradient(to right, ${task.color ? `${task.color}20` : statusInfo.bgColor} 0%, rgba(255,255,255,0) 40px)` 
      }}
    >
      <Card className="border-0 bg-transparent shadow-none">
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: task.color || statusInfo.color }}
                />
                <span 
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusInfo.variant}`}
                >
                  {statusInfo.label}
                </span>
              </div>
              
              <h4 className="font-semibold text-gray-900 dark:text-white mb-1 line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {task.title}
              </h4>
              
              {task.description && (
                <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">
                  {task.description}
                </p>
              )}
            </div>
            
            <AdminOnly>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onUpdate && onUpdate()}
                  className="h-8 w-8 p-0 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center justify-center"
                >
                  <Edit className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => onDelete && onDelete(task.id)}
                  className="h-8 w-8 p-0 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 hover:text-red-700 transition-colors flex items-center justify-center"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </AdminOnly>
          </div>
        </div>
      </Card>
    </div>
  );
};

// Enhanced Progress Ring Component
const ProjectProgressRing = ({ 
  completedTasks, 
  totalTasks, 
  className = "" 
}: { 
  completedTasks: number, 
  totalTasks: number, 
  className?: string 
}) => {
  const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const strokeDasharray = `${percentage * 2.83} 283`;
  
  return (
    <div className={`relative ${className}`}>
      <svg className="h-24 w-24 transform -rotate-90" viewBox="0 0 100 100">
        {/* Background circle */}
        <circle 
          cx="50" 
          cy="50" 
          r="45" 
          fill="none" 
          stroke="#e5e7eb" 
          strokeWidth="8"
        />
        {/* Progress circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="#3B82F6"
          strokeWidth="8"
          strokeDasharray={strokeDasharray}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-in-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-gray-900 dark:text-white">{percentage}%</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">Complete</span>
      </div>
    </div>
  );
};

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const { profile, isAdmin, loading: userLoading } = useUserProfile();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProject, setEditedProject] = useState<Project | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTask, setNewTask] = useState({ title: '', description: '', status: 'pending' as Task['status'], color: '' });
  const router = useRouter();

  // Define available colors from tailwind config
  const taskColors = [
    { name: 'Brand Primary', value: '#8c52ff', class: 'bg-brand-primary' },
    { name: 'Brand Accent', value: '#ff6ec7', class: 'bg-brand-accent' },
    { name: 'Brand Secondary', value: '#00e0ff', class: 'bg-brand-secondary' },
    { name: 'Brand Yellow', value: '#ffd166', class: 'bg-brand-yellow' },
    { name: 'Brand Orange', value: '#ff9671', class: 'bg-brand-orange' },
    { name: 'Neon Purple', value: '#c084fc', class: 'bg-neon-purple' },
    { name: 'Neon Magenta', value: '#f472b6', class: 'bg-neon-magenta' },
    { name: 'Neon Cyan', value: '#67e8f9', class: 'bg-neon-cyan' },
  ];

  // Mock user permissions
  const isProjectOwner = profile?.id === project?.user_id;

  useEffect(() => {
    const fetchProject = async () => {
      try {
        if (isAdmin) {
          const response = await fetch(`/api/admin/projects?id=${params.id}`);
          if (response.ok) {
            const projects = await response.json();
            if (projects.length > 0) {
              const projectData = { ...projects[0], tasks: [] }; // Initialize tasks as empty array
              setProject(projectData);
              
              // Fetch tasks for this project
              const tasksResponse = await fetch(`/api/admin/projects/tasks?project_id=${params.id}`);
              if (tasksResponse.ok) {
                const tasks = await tasksResponse.json();
                setProject(prev => prev ? { ...prev, tasks: tasks || [] } : null);
              }
            }
          }
        } else {
          // Regular users - fetch their own projects and find the specific one
          const response = await fetch('/api/user/projects');
          if (response.ok) {
            const projects = await response.json();
            const userProject = projects.find((p: Project) => p.id === params.id);
            
            if (userProject) {
              const projectData = { ...userProject, tasks: [] }; // Initialize tasks as empty array
              setProject(projectData);
              
              // Fetch tasks for this project
              const tasksResponse = await fetch(`/api/user/projects/tasks?project_id=${params.id}`);
              if (tasksResponse.ok) {
                const tasks = await tasksResponse.json();
                setProject(prev => prev ? { ...prev, tasks: tasks || [] } : null);
              }
            } else {
              // Project not found or user doesn't have access
              setProject(null);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching project:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [params.id, isAdmin]);

  const completedTasks = project?.tasks?.filter(task => task.status === 'completed').length || 0;
  const totalTasks = project?.tasks?.length || 0;
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const handleScreenshotUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('project_id', params.id);
      files.forEach(file => formData.append('files', file));

      const response = await fetch('/api/admin/projects/screenshots', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      
      // Update project with new screenshots
      setProject(prev => prev ? {
        ...prev,
        screenshots_urls: result.project.screenshots_urls
      } : null);
      
      alert('Screenshots uploaded successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload screenshots');
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const removeScreenshot = async (screenshotUrl: string, index: number) => {
    try {
      const response = await fetch(`/api/admin/projects/screenshots?project_id=${params.id}&screenshot_url=${encodeURIComponent(screenshotUrl)}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to remove screenshot');
      }

      const result = await response.json();
      
      // Update project with remaining screenshots
      setProject(prev => prev ? {
        ...prev,
        screenshots_urls: result.updatedUrls
      } : null);
    } catch (error) {
      console.error('Error removing screenshot:', error);
      alert('Failed to remove screenshot');
    }
  };

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;

    try {
      if (editingTask) {
        // Update existing task
        const response = await fetch('/api/admin/projects/tasks', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingTask.id,
            title: newTask.title,
            description: newTask.description,
            status: newTask.status,
            color: newTask.color
          })
        });

        if (!response.ok) throw new Error('Failed to update task');
        
        const { task } = await response.json();
        setProject(prev => prev ? {
          ...prev,
          tasks: prev.tasks.map(t => t.id === task.id ? task : t)
        } : null);
      } else {
        // Create new task
        const response = await fetch('/api/admin/projects/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: project.id,
            title: newTask.title,
            description: newTask.description,
            status: newTask.status,
            color: newTask.color
          })
        });

        if (!response.ok) throw new Error('Failed to create task');
        
        const { task } = await response.json();
        setProject(prev => prev ? {
          ...prev,
          tasks: [...prev.tasks, task]
        } : null);
      }

      // Reset form and close modal
      setNewTask({ title: '', description: '', status: 'pending', color: '' });
      setEditingTask(null);
      setShowTaskModal(false);
    } catch (error) {
      console.error('Error saving task:', error);
      alert('Failed to save task');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const response = await fetch(`/api/admin/projects/tasks?id=${taskId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete task');

      setProject(prev => prev ? {
        ...prev,
        tasks: prev.tasks.filter(t => t.id !== taskId)
      } : null);
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Failed to delete task');
    }
  };

  const openTaskModal = (task?: Task) => {
    if (task) {
      setEditingTask(task);
      setNewTask({
        title: task.title,
        description: task.description || '',
        status: task.status,
        color: task.color || ''
      });
    } else {
      setEditingTask(null);
      setNewTask({ title: '', description: '', status: 'pending', color: '' });
    }
    setShowTaskModal(true);
  };

  const handleEditProject = () => {
    if (project) {
      setEditedProject({ ...project });
      setIsEditing(true);
    }
  };

  const handleSaveProject = async () => {
    if (!editedProject) return;

    try {
      const response = await fetch('/api/admin/projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editedProject.id,
          title: editedProject.title,
          description: editedProject.description,
          status: editedProject.status,
          deadline: editedProject.deadline,
          live_preview_url: editedProject.live_preview_url,
          repo_url: editedProject.repo_url
        })
      });

      if (!response.ok) throw new Error('Failed to update project');
      
      const { project: updatedProject } = await response.json();
      setProject(prev => prev ? { ...prev, ...updatedProject } : null);
      setIsEditing(false);
      setEditedProject(null);
      alert('Project updated successfully!');
    } catch (error) {
      console.error('Error updating project:', error);
      alert('Failed to update project');
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedProject(null);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-yellow-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Project not found</h2>
        <Link href="/projects" className="text-yellow-600 hover:text-yellow-700">
          ← Back to Projects
        </Link>
      </div>
    );
  }

  const isOverdue = project.deadline && new Date(project.deadline) < new Date();

  return (
    <div className="p-5 md:p-8 space-y-8 max-w-[1600px] mx-auto">
      <div className="max-w-7xl mx-auto">
        {/* Enhanced Header Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Link 
                href="/projects" 
                className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm flex-shrink-0"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </Link>
              <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {project?.title}
                </h1>
                <p className="text-gray-600 dark:text-gray-300 text-base sm:text-lg leading-relaxed">
                  {project?.description}
                </p>
              </div>
            </div>
            <AdminOnly>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {!project?.live_preview_url && (
                  <button
                    onClick={handleEditProject}
                    className="inline-flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors shadow-sm text-sm flex-1 sm:flex-none justify-center"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span className="hidden sm:inline">Add Live Preview</span>
                    <span className="sm:hidden">Add Preview</span>
                  </button>
                )}
                <button
                  onClick={handleEditProject}
                  className="inline-flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm text-sm flex-1 sm:flex-none justify-center"
                >
                  <Edit className="w-4 h-4" />
                  <span className="hidden sm:inline">Edit Project</span>
                  <span className="sm:hidden">Edit</span>
                </button>
              </div>
            </AdminOnly>
          </div>

          {/* Project Meta Info with Status - Mobile optimized */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
            {/* Status Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Status</p>
                  <ProjectStatusBadge status={project?.status || 'pending'} />
                </div>
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>

            {/* Progress Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Progress</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{completionPercentage}%</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{completedTasks} / {totalTasks} tasks</p>
                </div>
                <ProjectProgressRing completedTasks={completedTasks} totalTasks={totalTasks} className="shrink-0" />
              </div>
            </div>

            {/* Deadline Card */}
            {project?.deadline && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6 shadow-sm sm:col-span-2 lg:col-span-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Deadline</p>
                    <p className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                      {new Date(project.deadline).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {Math.ceil((new Date(project.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days left
                    </p>
                  </div>
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 flex items-center justify-center flex-shrink-0">
                    <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600 dark:text-yellow-400" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Admin Alert for Missing Elements - Mobile optimized */}
          <AdminOnly>
            {(!project?.live_preview_url || !project?.repo_url || !project?.screenshots_urls?.length) && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-8">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">
                      Project Setup Incomplete
                    </h3>
                    <div className="text-sm text-amber-700 dark:text-amber-300">
                      <p className="mb-2">Consider adding the following to improve the project presentation:</p>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        {!project?.live_preview_url && <li>Live preview URL for client demonstration</li>}
                        {!project?.repo_url && <li>GitHub repository link for code access</li>}
                        {!project?.screenshots_urls?.length && <li>Screenshots to showcase the project visually</li>}
                      </ul>
                      <button
                        onClick={handleEditProject}
                        className="inline-flex items-center gap-1 mt-3 text-xs bg-amber-100 dark:bg-amber-800/30 text-amber-800 dark:text-amber-200 px-3 py-1 rounded-md hover:bg-amber-200 dark:hover:bg-amber-800/50 transition-colors"
                      >
                        <Edit className="w-3 h-3" />
                        Complete Setup
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </AdminOnly>
        </div>

        {/* Main Content Grid - Mobile optimized */}
        <div className="space-y-6 sm:space-y-8">
          {/* Live Preview and Tasks Row - Stack on mobile */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8">
            {/* Live Preview Section */}
            {project?.live_preview_url ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="border-b border-gray-200 dark:border-gray-700 p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center flex-shrink-0">
                        <ExternalLink className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Live Preview</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Mobile-optimized view</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      {project?.repo_url && (
                        <a
                          href={project.repo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors flex-1 sm:flex-none justify-center"
                        >
                          <Github className="w-4 h-4" />
                          <span className="hidden sm:inline">GitHub Repo</span>
                          <span className="sm:hidden">GitHub</span>
                        </a>
                      )}
                      <button
                        onClick={() => setIsFullscreen(true)}
                        className="p-2 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors flex-shrink-0"
                        title="Fullscreen Preview"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 sm:p-6">
                  <ResponsivePreview 
                    url={project.live_preview_url} 
                    isFullscreen={isFullscreen}
                    onClose={() => setIsFullscreen(false)}
                  />
                </div>
              </div>
            ) : (
              <AdminOnly>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                  <div className="border-b border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-gray-50 dark:bg-gray-900/20 flex items-center justify-center">
                        <ExternalLink className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Live Preview</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Add a live preview URL to showcase the project</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <div className="text-center py-12">
                      <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        <ExternalLink className="h-6 w-6 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Live Preview</h3>
                      <p className="text-gray-500 dark:text-gray-400 mb-4">
                        Add a live preview URL to let clients see the project in action.
                      </p>
                      <button
                        onClick={handleEditProject}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Add Live Preview URL
                      </button>
                    </div>
                  </div>
                </div>
              </AdminOnly>
            )}

            {/* Tasks Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="border-b border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Tasks</h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Project milestones and deliverables</p>
                    </div>
                  </div>
                  
                  <AdminOnly>
                    <button
                      onClick={() => openTaskModal()}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Add Task
                    </button>
                  </AdminOnly>
                </div>
              </div>
              
              <div className="p-6">
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {(project?.tasks || []).map((task) => (
                    <TaskCard key={task.id} task={task} onUpdate={() => openTaskModal(task)} onDelete={handleDeleteTask} />
                  ))}
                  
                  {(!project?.tasks || project.tasks.length === 0) && (
                    <div className="text-center py-12">
                      <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        <CheckCircle2 className="h-6 w-6 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No tasks yet</h3>
                      <p className="text-gray-500 dark:text-gray-400">Add your first task to start tracking progress.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Screenshots Section - Full Width */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="border-b border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                    <Image className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Screenshots</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Project visual documentation</p>
                  </div>
                </div>
                
                <AdminOnly>
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleScreenshotUpload}
                      className="hidden"
                      id="screenshot-upload"
                      disabled={isUploading}
                    />
                    <label
                      htmlFor="screenshot-upload"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white transition-colors shadow-sm cursor-pointer"
                    >
                      {isUploading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          Upload Screenshots
                        </>
                      )}
                    </label>
                  </div>
                </AdminOnly>
              </div>
            </div>
            
            <div className="p-6">
              {/* Screenshot Grid */}
              {project?.screenshots_urls && project.screenshots_urls.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {project.screenshots_urls.map((url, index) => (
                    <div key={index} className="group relative aspect-video rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 shadow-sm">
                      <img
                        src={url}
                        alt={`Screenshot ${index + 1}`}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity duration-300" />
                      <AdminOnly>
                        <button
                          onClick={() => removeScreenshot(url, index)}
                          className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-red-700"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </AdminOnly>
                      
                      {/* Click to expand overlay */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="bg-black bg-opacity-50 rounded-full p-2">
                          <Maximize2 className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <Image className="h-6 w-6 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No screenshots yet</h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    {isAdmin ? 'Upload screenshots to document project progress.' : 'Screenshots will appear here when available.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {editingTask ? 'Edit Task' : 'Add New Task'}
                </h3>
                <button
                  onClick={() => setShowTaskModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleTaskSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Task Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTask.title}
                    onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="Enter task title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={newTask.description}
                    onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="Enter task description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Status
                  </label>
                  <select
                    value={newTask.status}
                    onChange={(e) => setNewTask(prev => ({ ...prev, status: e.target.value as Task['status'] }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="pending">📋 Pending</option>
                    <option value="in_progress">⚡ In Progress</option>
                    <option value="completed">✅ Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Color Theme
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {taskColors.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setNewTask(prev => ({ ...prev, color: color.value }))}
                        className={`h-10 rounded-lg border-2 transition-all ${
                          newTask.color === color.value 
                            ? 'border-gray-900 dark:border-white scale-110' 
                            : 'border-gray-300 dark:border-gray-600 hover:scale-105'
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowTaskModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    {editingTask ? 'Update Task' : 'Create Task'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Project Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Edit Project
                </h3>
                <button
                  onClick={handleCancelEdit}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleSaveProject(); }} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Project Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={editedProject?.title || ''}
                      onChange={(e) => setEditedProject(prev => prev ? { ...prev, title: e.target.value } : null)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      placeholder="Enter project title"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Description
                    </label>
                    <textarea
                      value={editedProject?.description || ''}
                      onChange={(e) => setEditedProject(prev => prev ? { ...prev, description: e.target.value } : null)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      placeholder="Enter project description"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Status
                    </label>
                    <select
                      value={editedProject?.status || 'pending'}
                      onChange={(e) => setEditedProject(prev => prev ? { ...prev, status: e.target.value as Project['status'] } : null)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      <option value="pending">📋 Pending</option>
                      <option value="active">⚡ Active</option>
                      <option value="completed">✅ Completed</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Deadline
                    </label>
                    <input
                      type="date"
                      value={editedProject?.deadline ? new Date(editedProject.deadline).toISOString().split('T')[0] : ''}
                      onChange={(e) => setEditedProject(prev => prev ? { ...prev, deadline: e.target.value ? new Date(e.target.value).toISOString() : undefined } : null)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Live Preview URL
                    </label>
                    <div className="space-y-2">
                      <input
                        type="url"
                        value={editedProject?.live_preview_url || ''}
                        onChange={(e) => setEditedProject(prev => prev ? { ...prev, live_preview_url: e.target.value } : null)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        placeholder="https://example.com"
                      />
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="text-gray-500 dark:text-gray-400">Quick suggestions:</span>
                        <button
                          type="button"
                          onClick={() => setEditedProject(prev => prev ? { ...prev, live_preview_url: `https://${prev.title?.toLowerCase().replace(/\s+/g, '-')}.vercel.app` } : null)}
                          className="px-2 py-1 bg-black text-white rounded text-xs hover:bg-gray-800 transition-colors"
                        >
                          Vercel
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditedProject(prev => prev ? { ...prev, live_preview_url: `https://${prev.title?.toLowerCase().replace(/\s+/g, '-')}.netlify.app` } : null)}
                          className="px-2 py-1 bg-teal-600 text-white rounded text-xs hover:bg-teal-700 transition-colors"
                        >
                          Netlify
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditedProject(prev => prev ? { ...prev, live_preview_url: `https://${prev.title?.toLowerCase().replace(/\s+/g, '-')}.herokuapp.com` } : null)}
                          className="px-2 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700 transition-colors"
                        >
                          Heroku
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditedProject(prev => prev ? { ...prev, live_preview_url: `https://${prev.title?.toLowerCase().replace(/\s+/g, '-')}.github.io` } : null)}
                          className="px-2 py-1 bg-gray-800 text-white rounded text-xs hover:bg-gray-900 transition-colors"
                        >
                          GitHub Pages
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      GitHub Repository URL
                    </label>
                    <input
                      type="url"
                      value={editedProject?.repo_url || ''}
                      onChange={(e) => setEditedProject(prev => prev ? { ...prev, repo_url: e.target.value } : null)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      placeholder="https://github.com/username/repo"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 