"use client";

import React, { useState } from 'react';
import { 
  X, 
  DollarSign, 
  Calendar, 
  FileText, 
  Clock,
  User,
  Building,
  CheckCircle,
  XCircle,
  AlertCircle,
  Percent,
  Edit
} from 'lucide-react';
import FinalizeEstimateModal from './FinalizeEstimateModal';

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
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'finalized';
  finalized_at?: string;
  approved_by_user: boolean;
  screenshots_urls: string[];
  created_at: string;
  profiles: Profile;
}

interface EstimateDetailsModalProps {
  estimate: Estimate;
  isAdmin: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

const EstimateDetailsModal = ({ estimate, isAdmin, onClose, onUpdate }: EstimateDetailsModalProps) => {
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Calculate price breakdown if finalized
  const preTaxCents = estimate.final_price_cents && estimate.tax_rate 
    ? Math.round(estimate.final_price_cents / (1 + estimate.tax_rate / 100))
    : estimate.final_price_cents || 0;
  
  const taxAmountCents = estimate.final_price_cents && estimate.tax_rate
    ? estimate.final_price_cents - preTaxCents
    : 0;

  // Format currency
  const formatCurrency = (cents: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  // Format price range for non-finalized estimates
  const formatPriceRange = (minCents?: number, maxCents?: number) => {
    if (!minCents && !maxCents) return 'Price TBD';
    if (minCents && maxCents) {
      return `${formatCurrency(minCents)} - ${formatCurrency(maxCents)}`;
    }
    if (minCents) return `From ${formatCurrency(minCents)}`;
    if (maxCents) return `Up to ${formatCurrency(maxCents)}`;
    return 'Price TBD';
  };

  // Get status badge info
  const getStatusBadge = () => {
    switch (estimate.status) {
      case 'draft':
        return { label: 'Draft', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300', icon: FileText };
      case 'pending':
        return { label: 'Pending Review', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400', icon: Clock };
      case 'approved':
        return { label: 'Approved', color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400', icon: CheckCircle };
      case 'rejected':
        return { label: 'Rejected', color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400', icon: XCircle };
      case 'finalized':
        return { label: 'Finalized', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400', icon: CheckCircle };
      default:
        return { label: estimate.status, color: 'bg-gray-100 text-gray-800', icon: AlertCircle };
    }
  };

  const statusBadge = getStatusBadge();
  const StatusIcon = statusBadge.icon;

  // Handle approve/reject actions
  const handleApprove = async () => {
    setApproving(true);
    try {
      const response = await fetch(`/api/estimates/${estimate.id}/approve`, {
        method: 'POST',
      });

      if (response.ok) {
        setNotification({ type: 'success', message: 'Estimate approved successfully!' });
        setTimeout(() => {
          onUpdate?.();
          onClose();
        }, 1500);
      } else {
        const error = await response.json();
        setNotification({ type: 'error', message: error.error || 'Failed to approve estimate' });
      }
    } catch (error) {
      setNotification({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setApproving(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleReject = async () => {
    setRejecting(true);
    try {
      const response = await fetch(`/api/estimates/${estimate.id}/reject`, {
        method: 'POST',
      });

      if (response.ok) {
        setNotification({ type: 'success', message: 'Estimate rejected.' });
        setTimeout(() => {
          onUpdate?.();
          onClose();
        }, 1500);
      } else {
        const error = await response.json();
        setNotification({ type: 'error', message: error.error || 'Failed to reject estimate' });
      }
    } catch (error) {
      setNotification({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setRejecting(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  // Can user take action on this estimate?
  const canUserApprove = !isAdmin && estimate.status === 'finalized' && !estimate.approved_by_user;
  const canAdminFinalize = isAdmin && estimate.status === 'pending';

  // Debug logging
  console.log('EstimateDetailsModal Debug:', {
    isAdmin,
    estimateStatus: estimate.status,
    canAdminFinalize,
    canUserApprove,
    estimateId: estimate.id
  });

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {estimate.title}
              </h2>
              <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${statusBadge.color}`}>
                <StatusIcon className="h-4 w-4" />
                {statusBadge.label}
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Notification */}
          {notification && (
            <div className={`mx-6 mt-4 flex items-center gap-3 rounded-lg border p-4 ${
              notification.type === 'success' 
                ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400'
                : 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400'
            }`}>
              {notification.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
              {notification.message}
            </div>
          )}

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Client Info */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Client Information</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <User className="h-4 w-4" />
                  <span>{estimate.profiles.first_name} {estimate.profiles.last_name}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <FileText className="h-4 w-4" />
                  <span>{estimate.profiles.email}</span>
                </div>
                {estimate.profiles.organization && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Building className="h-4 w-4" />
                    <span>{estimate.profiles.organization}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            {estimate.description && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</h3>
                <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{estimate.description}</p>
              </div>
            )}

            {/* Pricing */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Pricing</h3>
              
              {estimate.status === 'finalized' && estimate.final_price_cents ? (
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-3">
                  {estimate.tax_rate ? (
                    <>
                      <div className="flex justify-between text-gray-600 dark:text-gray-400">
                        <span>Pre-tax amount:</span>
                        <span>{formatCurrency(preTaxCents)}</span>
                      </div>
                      <div className="flex justify-between text-gray-600 dark:text-gray-400">
                        <span>Tax ({estimate.tax_rate}%):</span>
                        <span>{formatCurrency(taxAmountCents)}</span>
                      </div>
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                        <div className="flex justify-between text-lg font-semibold text-gray-900 dark:text-white">
                          <span>Total:</span>
                          <span>{formatCurrency(estimate.final_price_cents)}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-lg font-semibold text-gray-900 dark:text-white">
                      <span>Total:</span>
                      <span>{formatCurrency(estimate.final_price_cents)}</span>
                    </div>
                  )}
                  
                  {canUserApprove && (
                    <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
                      ⚠️ Approving this estimate will generate an invoice for {formatCurrency(estimate.final_price_cents)}
                    </p>
                  )}
                </div>
              ) : (
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                  <div className="text-gray-900 dark:text-white font-medium">
                    {formatPriceRange(estimate.price_min_cents, estimate.price_max_cents)}
                  </div>
                  {estimate.status === 'pending' && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {isAdmin ? 'Click "Finalize" to set final pricing' : 'Awaiting admin to finalize pricing'}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Timeline */}
            {estimate.timeline && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Timeline</h3>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Clock className="h-4 w-4" />
                  <span>{estimate.timeline}</span>
                </div>
              </div>
            )}

            {/* Dates */}
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Created: {new Date(estimate.created_at).toLocaleString()}</span>
              </div>
              {estimate.finalized_at && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Finalized: {new Date(estimate.finalized_at).toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Screenshots */}
            {estimate.screenshots_urls.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Screenshots ({estimate.screenshots_urls.length})
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {estimate.screenshots_urls.map((url, index) => (
                    <img
                      key={index}
                      src={url}
                      alt={`Screenshot ${index + 1}`}
                      className="rounded-lg border border-gray-200 dark:border-gray-700 object-cover"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end p-6 border-t border-gray-200 dark:border-gray-700">
            {canUserApprove ? (
              <>
                <button
                  onClick={handleReject}
                  disabled={rejecting}
                  className="px-6 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {rejecting ? 'Rejecting...' : 'Reject'}
                </button>
                <button
                  onClick={handleApprove}
                  disabled={approving}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {approving ? 'Approving...' : 'Approve & Generate Invoice'}
                </button>
              </>
            ) : canAdminFinalize ? (
              <>
                <button
                  onClick={onClose}
                  className="px-6 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => setShowFinalizeModal(true)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Finalize Estimate
                </button>
              </>
            ) : (
              <button
                onClick={onClose}
                className="px-6 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Finalize Modal */}
      {showFinalizeModal && (
        <FinalizeEstimateModal
          estimate={estimate}
          onClose={() => setShowFinalizeModal(false)}
          onSuccess={() => {
            setShowFinalizeModal(false);
            onUpdate?.();
            onClose();
          }}
        />
      )}
    </>
  );
};

export default EstimateDetailsModal; 