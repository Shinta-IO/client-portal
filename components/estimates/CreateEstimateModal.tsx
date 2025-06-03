"use client";

import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  DollarSign, 
  Calendar, 
  FileText, 
  Save,
  AlertCircle,
  CheckCircle,
  Plus,
  Percent
} from 'lucide-react';

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  organization?: string;
}

interface CreateEstimateModalProps {
  isAdmin: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateEstimateModal = ({ isAdmin, onClose, onSuccess }: CreateEstimateModalProps) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price_min_cents: '',
    price_max_cents: '',
    final_price_cents: '',
    tax_rate: '8.5', // Default tax rate as a string for input
    timeline: '',
    selected_user_id: '',
    screenshots_urls: [] as string[],
  });
  
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Fetch users for admin dropdown
  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
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
        if (response.status === 401) {
          setNotification({ type: 'error', message: 'Not authenticated. Please sign in again.' });
        } else if (response.status === 403) {
          setNotification({ type: 'error', message: 'Access denied. You need admin privileges.' });
        } else {
          setNotification({ type: 'error', message: `Failed to fetch users: ${errorData.error || 'Unknown error'}` });
        }
        setTimeout(() => setNotification(null), 5000);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setNotification({ 
        type: 'error', 
        message: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const parseCurrency = (value: string): number => {
    // Remove currency symbols and convert to cents
    const cleaned = value.replace(/[$,\s]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : Math.round(parsed * 100);
  };

  const formatCurrency = (cents: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const calculateTotalWithTax = (preTaxCents: number, taxRate: number): number => {
    const taxAmount = Math.round(preTaxCents * (taxRate / 100));
    return preTaxCents + taxAmount;
  };

  const validateForm = (): string | null => {
    if (!formData.title.trim()) {
      return 'Title is required';
    }

    if (isAdmin) {
      if (!formData.selected_user_id) {
        return 'Please select a user';
      }
      if (!formData.final_price_cents) {
        return 'Final price is required for admin estimates';
      }
      const finalPrice = parseCurrency(formData.final_price_cents);
      if (finalPrice <= 0) {
        return 'Final price must be greater than $0';
      }
    } else {
      // User flow - validate budget range
      const minPrice = parseCurrency(formData.price_min_cents || '0');
      const maxPrice = parseCurrency(formData.price_max_cents || '0');
      
      if (minPrice <= 0 && maxPrice <= 0) {
        return 'Please provide at least a minimum or maximum budget';
      }
      
      if (minPrice > 0 && maxPrice > 0 && minPrice > maxPrice) {
        return 'Minimum budget cannot be greater than maximum budget';
      }
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
      const payload: any = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        timeline: formData.timeline.trim() || null,
        screenshots_urls: formData.screenshots_urls,
      };

      if (isAdmin) {
        // Admin creates finalized estimate
        payload.user_id = formData.selected_user_id;
        
        // Calculate total with tax
        const preTaxCents = parseCurrency(formData.final_price_cents);
        const taxRate = parseFloat(formData.tax_rate) || 0;
        const totalWithTax = calculateTotalWithTax(preTaxCents, taxRate);
        
        // Store the total (including tax) in the database
        payload.final_price_cents = totalWithTax;
        payload.tax_rate = taxRate;
        payload.status = 'finalized';
      } else {
        // User creates draft estimate request
        if (formData.price_min_cents) {
          payload.price_min_cents = parseCurrency(formData.price_min_cents);
        }
        if (formData.price_max_cents) {
          payload.price_max_cents = parseCurrency(formData.price_max_cents);
        }
        payload.status = 'pending'; // User submits for admin review
      }

      const response = await fetch('/api/estimates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create estimate');
      }

      setNotification({ 
        type: 'success', 
        message: isAdmin 
          ? 'Estimate created successfully! User can now approve or reject it.'
          : 'Estimate request submitted successfully! An admin will review and finalize it.'
      });
      
      setTimeout(() => {
        onSuccess();
      }, 1500);

    } catch (error) {
      console.error('Error creating estimate:', error);
      setNotification({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Failed to create estimate. Please try again.' 
      });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const selectedUser = users.find(user => user.id === formData.selected_user_id);
  const preTaxCents = parseCurrency(formData.final_price_cents || '0');
  const taxRate = parseFloat(formData.tax_rate) || 0;
  const taxAmountCents = Math.round(preTaxCents * (taxRate / 100));
  const totalWithTaxCents = preTaxCents + taxAmountCents;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {isAdmin ? 'New Estimate' : 'Request Estimate'}
          </h2>
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* User Selection (Admin Only) */}
          {isAdmin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select User *
              </label>
              {loadingUsers ? (
                <div className="flex items-center gap-2 text-gray-500">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
                  Loading users...
                </div>
              ) : (
                <select
                  value={formData.selected_user_id}
                  onChange={(e) => handleInputChange('selected_user_id', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                >
                  <option value="">Choose a user...</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.first_name} {user.last_name} - {user.email}
                      {user.organization && ` (${user.organization})`}
                    </option>
                  ))}
                </select>
              )}
              {users.length === 0 && !loadingUsers && (
                <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                  No clients available. Users need to sign up first.
                </p>
              )}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Project Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="Enter project title..."
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="Describe the project requirements..."
            />
          </div>

          {/* Pricing Section */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
              {isAdmin ? 'Pricing' : 'Budget Range'}
            </h3>
            
            {isAdmin ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Final Price (Admin) */}
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
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Price Breakdown</h4>
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
                          <span>Total (stored in system):</span>
                          <span>{formatCurrency(totalWithTaxCents)}</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      This total amount will be charged when the estimate is approved.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Minimum Budget (User) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Minimum Budget
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={formData.price_min_cents}
                      onChange={(e) => handleInputChange('price_min_cents', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      placeholder="1000.00"
                    />
                  </div>
                </div>

                {/* Maximum Budget (User) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Maximum Budget
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={formData.price_max_cents}
                      onChange={(e) => handleInputChange('price_max_cents', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      placeholder="5000.00"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Timeline */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Timeline
            </label>
            <input
              type="text"
              value={formData.timeline}
              onChange={(e) => handleInputChange('timeline', e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="e.g., 2-3 weeks, 1 month, etc."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="h-4 w-4" />
              {loading 
                ? 'Creating...' 
                : isAdmin 
                  ? 'Create Estimate'
                  : 'Submit Request'
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEstimateModal; 