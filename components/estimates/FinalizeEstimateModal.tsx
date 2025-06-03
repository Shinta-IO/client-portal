import React, { useState } from 'react';
import { DollarSign, Percent, X, Calculator } from 'lucide-react';

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

interface FinalizeEstimateModalProps {
  estimate: Estimate;
  onClose: () => void;
  onSuccess: () => void;
}

const FinalizeEstimateModal = ({ estimate, onClose, onSuccess }: FinalizeEstimateModalProps) => {
  const [formData, setFormData] = useState({
    final_price_cents: '',
    tax_rate: '8.5', // Default tax rate
  });
  
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Parse currency input (remove non-numeric characters except decimal)
  const parseCurrency = (value: string): number => {
    const cleanValue = value.replace(/[^0-9.]/g, '');
    const numberValue = parseFloat(cleanValue);
    return isNaN(numberValue) ? 0 : Math.round(numberValue * 100);
  };

  // Format currency for display
  const formatCurrency = (cents: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  // Calculate tax breakdown
  const preTaxCents = parseCurrency(formData.final_price_cents || '0');
  const taxRate = parseFloat(formData.tax_rate) || 0;
  const taxAmountCents = Math.round(preTaxCents * (taxRate / 100));
  const totalWithTaxCents = preTaxCents + taxAmountCents;

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = (): string | null => {
    if (!formData.final_price_cents) {
      return 'Final price is required';
    }
    
    const finalPrice = parseCurrency(formData.final_price_cents);
    if (finalPrice <= 0) {
      return 'Final price must be greater than $0';
    }

    const taxRate = parseFloat(formData.tax_rate);
    if (taxRate < 0 || taxRate > 100) {
      return 'Tax rate must be between 0% and 100%';
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setNotification({ type: 'error', message: validationError });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    setLoading(true);
    
    try {
      const payload = {
        final_price_cents: totalWithTaxCents, // Store total (including tax) in database
        tax_rate: taxRate,
        status: 'finalized',
      };

      const response = await fetch(`/api/estimates/${estimate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to finalize estimate');
      }

      setNotification({ 
        type: 'success', 
        message: 'Estimate finalized successfully! User can now approve or reject it.'
      });
      
      setTimeout(() => {
        onSuccess();
      }, 1500);

    } catch (error) {
      console.error('Error finalizing estimate:', error);
      setNotification({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Failed to finalize estimate. Please try again.' 
      });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Format price range for display
  const formatPriceRange = (minCents?: number, maxCents?: number) => {
    if (!minCents && !maxCents) return 'Price TBD';
    if (minCents && maxCents) {
      return `${formatCurrency(minCents)} - ${formatCurrency(maxCents)}`;
    }
    if (minCents) return `From ${formatCurrency(minCents)}`;
    if (maxCents) return `Up to ${formatCurrency(maxCents)}`;
    return 'Price TBD';
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Finalize Estimate
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Set final pricing for {estimate.profiles.first_name} {estimate.profiles.last_name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Notification */}
        {notification && (
          <div className={`mx-6 mt-6 p-4 rounded-lg border ${
            notification.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400'
              : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400'
          }`}>
            {notification.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Estimate Overview */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Estimate Request</h3>
            <div className="space-y-2">
              <div>
                <span className="text-lg font-semibold text-gray-900 dark:text-white">{estimate.title}</span>
              </div>
              {estimate.description && (
                <p className="text-gray-600 dark:text-gray-400 text-sm">{estimate.description}</p>
              )}
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <span>Budget:</span>
                <span className="font-medium">{formatPriceRange(estimate.price_min_cents, estimate.price_max_cents)}</span>
              </div>
              {estimate.timeline && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span>Timeline:</span>
                  <span className="font-medium">{estimate.timeline}</span>
                </div>
              )}
            </div>
          </div>

          {/* Pricing Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Final Pricing</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Final Price (Pre-tax) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Price (before tax) *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={formData.final_price_cents}
                    onChange={(e) => handleInputChange('final_price_cents', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="5000.00"
                    required
                  />
                </div>
              </div>

              {/* Tax Rate */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tax Rate *
                </label>
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={formData.tax_rate}
                    onChange={(e) => handleInputChange('tax_rate', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="8.5"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Price Breakdown */}
            {preTaxCents > 0 && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-3">
                  <Calculator className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Price Breakdown</h4>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>Pre-tax amount:</span>
                    <span>{formatCurrency(preTaxCents)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>Tax ({taxRate}%):</span>
                    <span>{formatCurrency(taxAmountCents)}</span>
                  </div>
                  <div className="border-t border-blue-200 dark:border-blue-700 mt-2 pt-2">
                    <div className="flex justify-between font-semibold text-gray-900 dark:text-white">
                      <span>Total (to be charged):</span>
                      <span>{formatCurrency(totalWithTaxCents)}</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  This total amount will be charged when the user approves the estimate.
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
            >
              {loading && (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {loading ? 'Finalizing...' : 'Finalize Estimate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FinalizeEstimateModal; 