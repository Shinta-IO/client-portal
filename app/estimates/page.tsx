"use client";

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Filter, 
  Search, 
  FileText, 
  Clock, 
  DollarSign, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Calendar,
  User,
  Building
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useUserProfile } from '../../utils/auth';
import CreateEstimateModal from '../../components/estimates/CreateEstimateModal';
import EstimateDetailsModal from '../../components/estimates/EstimateDetailsModal';

type EstimateStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'finalized';

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  organization?: string;
}

interface Estimate {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  price_min_cents?: number;
  price_max_cents?: number;
  final_price_cents?: number;
  tax_rate?: number;
  timeline?: string;
  status: EstimateStatus;
  finalized_at?: string;
  approved_by_user: boolean;
  screenshots_urls: string[];
  created_at: string;
  profiles: Profile;
}

// Helper function to get status info
const getStatusInfo = (status: EstimateStatus) => {
  switch (status) {
    case 'draft':
      return { 
        label: 'Draft', 
        color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
        icon: FileText 
      };
    case 'pending':
      return { 
        label: 'Pending', 
        color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
        icon: Clock 
      };
    case 'approved':
      return { 
        label: 'Approved', 
        color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
        icon: CheckCircle 
      };
    case 'rejected':
      return { 
        label: 'Rejected', 
        color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
        icon: XCircle 
      };
    case 'finalized':
      return { 
        label: 'Finalized', 
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
        icon: CheckCircle 
      };
    default:
      return { 
        label: status, 
        color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
        icon: AlertCircle 
      };
  }
};

const EstimatesPage = () => {
  const { profile, isAdmin, loading: authLoading } = useUserProfile();
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | EstimateStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEstimate, setSelectedEstimate] = useState<Estimate | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      fetchEstimates();
    }
  }, [authLoading]);

  const fetchEstimates = async () => {
    try {
      const response = await fetch('/api/estimates');
      if (response.ok) {
        const data = await response.json();
        setEstimates(data);
      } else {
        console.error('Failed to fetch estimates');
      }
    } catch (error) {
      console.error('Error fetching estimates:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEstimates = estimates.filter(estimate => {
    const matchesFilter = filter === 'all' || estimate.status === filter;
    const matchesSearch = estimate.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         estimate.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         `${estimate.profiles.first_name} ${estimate.profiles.last_name}`.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (authLoading || loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Estimates
          </h1>
          <p className="text-gray-700 dark:text-gray-300 mt-2">
            {isAdmin 
              ? 'Manage project estimates and quotes for clients' 
              : 'View and manage your project estimates'
            }
          </p>
        </div>
        
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors w-full sm:w-auto justify-center"
        >
          <Plus className="h-4 w-4" />
          {isAdmin ? 'New Estimate' : 'Request Estimate'}
        </button>
      </div>

      {/* Filters and Search */}
      <Card 
        className="glass-card card-3d"
        videoSrc="/card.mp4"
        videoOpacity="opacity-50" 
        videoBlendMode="mix-blend-multiply dark:mix-blend-lighten"
        bgColor="bg-white dark:bg-gray-900/90"
        borderColor="border-gray-200 dark:border-gray-700"
        hybridMode={true}
      >
        <div className="p-4 md:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as 'all' | EstimateStatus)}
                  className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-black dark:text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="all">All Estimates</option>
                  <option value="draft">Draft</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="finalized">Finalized</option>
                </select>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search estimates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full sm:w-80 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-black dark:text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Estimates Grid */}
      {filteredEstimates.length === 0 ? (
        <Card 
          className="glass-card card-3d"
          videoSrc="/card.mp4"
          videoOpacity="opacity-50" 
          videoBlendMode="mix-blend-multiply dark:mix-blend-lighten"
          bgColor="bg-white dark:bg-gray-900/90"
          borderColor="border-gray-200 dark:border-gray-700"
          hybridMode={true}
        >
          <div className="text-center py-12 p-6">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
              <FileText className="h-8 w-8 text-gray-600 dark:text-gray-300" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-black dark:text-white">
              {filter === 'all' ? 'No estimates yet' : `No ${filter} estimates`}
            </h3>
            <p className="mb-6 text-gray-600 dark:text-gray-300">
              {filter === 'all' 
                ? 'Get started by creating your first estimate.'
                : `No estimates match the "${filter}" filter.`
              }
            </p>
            {filter === 'all' && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                <Plus className="h-4 w-4" />
                {isAdmin ? 'New Estimate' : 'Request Estimate'}
              </button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredEstimates.map((estimate) => (
            <EstimateCard 
              key={estimate.id} 
              estimate={estimate} 
              isAdmin={isAdmin}
              onView={() => {
                setSelectedEstimate(estimate);
                setShowDetailModal(true);
              }}
            />
          ))}
        </div>
      )}

      {/* Create Estimate Modal */}
      {showCreateModal && (
        <CreateEstimateModal
          isAdmin={isAdmin}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchEstimates();
          }}
        />
      )}

      {/* Estimate Details Modal */}
      {showDetailModal && selectedEstimate && (
        <EstimateDetailsModal
          estimate={selectedEstimate}
          isAdmin={isAdmin}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedEstimate(null);
          }}
          onUpdate={fetchEstimates}
        />
      )}
    </div>
  );
};

// Estimate Card Component
const EstimateCard = ({ 
  estimate, 
  isAdmin, 
  onView
}: { 
  estimate: Estimate; 
  isAdmin: boolean; 
  onView: () => void;
}) => {
  const statusInfo = getStatusInfo(estimate.status);
  const StatusIcon = statusInfo.icon;

  const formatPriceRange = (minCents?: number, maxCents?: number) => {
    if (!minCents && !maxCents) return 'Price TBD';
    if (minCents && maxCents && minCents === maxCents) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(minCents / 100);
    }
    if (minCents && maxCents) {
      return `${new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(minCents / 100)} - ${new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(maxCents / 100)}`;
    }
    if (minCents) {
      return `From ${new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(minCents / 100)}`;
    }
    if (maxCents) {
      return `Up to ${new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(maxCents / 100)}`;
    }
    return 'Price TBD';
  };

  return (
    <div 
      className="cursor-pointer" 
      onClick={onView}
    >
      <Card 
        className="glass-card card-3d hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
        videoSrc="/card.mp4"
        videoOpacity="opacity-50" 
        videoBlendMode="mix-blend-multiply dark:mix-blend-lighten"
        bgColor="bg-white dark:bg-gray-900/90"
        borderColor="border-gray-200 dark:border-gray-700"
        hybridMode={true}
      >
        <div className="p-6 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-black dark:text-white line-clamp-1">
                {estimate.title}
              </h3>
              {estimate.description && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                  {estimate.description}
                </p>
              )}
            </div>
            
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${statusInfo.color} ml-2 flex-shrink-0`}>
              <StatusIcon className="h-3 w-3" />
              <span className="hidden sm:inline">{statusInfo.label}</span>
            </span>
          </div>

          {/* Client Info (for admin) */}
          {isAdmin && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <User className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{estimate.profiles.first_name} {estimate.profiles.last_name}</span>
              {estimate.profiles.organization && (
                <>
                  <span className="hidden sm:inline">•</span>
                  <div className="hidden sm:flex items-center gap-1">
                    <Building className="h-3 w-3" />
                    <span className="truncate">{estimate.profiles.organization}</span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Price */}
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
            <span className="font-medium text-black dark:text-white truncate">
              {estimate.final_price_cents 
                ? new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                  }).format(estimate.final_price_cents / 100)
                : formatPriceRange(estimate.price_min_cents, estimate.price_max_cents)
              }
            </span>
          </div>

          {/* Timeline */}
          {estimate.timeline && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <Clock className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{estimate.timeline}</span>
            </div>
          )}

          {/* Created Date */}
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <Calendar className="h-3 w-3 flex-shrink-0" />
            <span>
              Created {new Date(estimate.created_at).toLocaleDateString()}
            </span>
          </div>

          {/* Screenshots indicator */}
          {estimate.screenshots_urls.length > 0 && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              📷 {estimate.screenshots_urls.length} screenshot{estimate.screenshots_urls.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default EstimatesPage; 