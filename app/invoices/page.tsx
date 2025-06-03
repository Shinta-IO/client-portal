// Invoices feature entry point

'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { 
  FileText, 
  Download, 
  CreditCard, 
  Calendar, 
  DollarSign,
  User,
  Filter,
  Search,
  Plus,
  Eye,
  Clock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import InvoicePaymentModal from '../../components/invoices/InvoicePaymentModal';

interface Invoice {
  id: string;
  estimate_id: string;
  user_id: string;
  invoice_pdf_url?: string;
  final_price_cents: number;
  tax_rate: number;
  status: 'pending' | 'paid' | 'overdue';
  payment_url?: string;
  stripe_payment_intent_id?: string;
  due_date: string;
  paid_at?: string;
  created_at: string;
  profiles: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    organization?: string;
  };
  estimates: {
    id: string;
    title: string;
    description?: string;
    final_price_cents: number;
  };
}

const InvoicesPage = () => {
  const { userId } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'due_date' | 'amount'>('created_at');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchInvoices();
    }
  }, [userId]);

  const fetchInvoices = async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/invoices');
      if (response.ok) {
        const data = await response.json();
        setInvoices(data);
        console.log('📋 Invoices fetched:', data.length, 'invoices');
      } else {
        console.error('Failed to fetch invoices');
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Auto-refresh every 30 seconds to catch webhook updates
  useEffect(() => {
    if (!userId) return;
    
    const interval = setInterval(() => {
      if (!showPaymentModal) { // Don't refresh while payment modal is open
        fetchInvoices();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [userId, showPaymentModal]);

  const formatCurrency = (cents: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'overdue':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'overdue':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const isDueSoon = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 7 && diffDays > 0;
  };

  const isOverdue = (dueDate: string, status: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    return due < today && status !== 'paid';
  };

  const filteredInvoices = invoices
    .filter(invoice => {
      const matchesSearch = 
        invoice.estimates.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `${invoice.profiles.first_name} ${invoice.profiles.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.profiles.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'due_date':
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        case 'amount':
          return b.final_price_cents - a.final_price_cents;
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  const handlePayNow = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    setSelectedInvoice(null);
    
    // Immediate refresh to show updated status
    setTimeout(() => {
      fetchInvoices();
    }, 2000); // Give webhook time to process
    
    // Also refresh again after a longer delay in case webhook is slow
    setTimeout(() => {
      fetchInvoices();
    }, 10000);
  };

  const handleRefresh = () => {
    fetchInvoices();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Invoices
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Manage your invoices and payments
              </p>
            </div>
            
            {/* Add refresh button */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <svg 
                className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Filters and Search */}
        <Card 
          className="mb-6 glass-card card-3d has-video"
          videoSrc="/card.mp4"
          videoOpacity="opacity-50" 
          videoBlendMode="mix-blend-multiply dark:mix-blend-lighten"
          bgColor="bg-slate-500/75 dark:bg-gray-900/80"
          borderColor="border-gray-200 dark:border-gray-700/50"
        >
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search invoices..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm"
                />
              </div>

              {/* Status Filter */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>

              {/* Sort By */}
              <div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm"
                >
                  <option value="created_at">Sort by Date</option>
                  <option value="due_date">Sort by Due Date</option>
                  <option value="amount">Sort by Amount</option>
                </select>
              </div>

              {/* Summary Stats */}
              <div className="text-sm text-white font-medium">
                Showing {filteredInvoices.length} of {invoices.length} invoices
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invoices List */}
        {filteredInvoices.length === 0 ? (
          <Card 
            className="glass-card card-3d has-video"
            videoSrc="/card.mp4"
            videoOpacity="opacity-40" 
            videoBlendMode="mix-blend-multiply dark:mix-blend-lighten"
            bgColor="bg-slate-500/75 dark:bg-gray-900/80"
            borderColor="border-gray-200 dark:border-gray-700/50"
          >
            <CardContent className="p-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-white mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">
                No invoices found
              </h3>
              <p className="text-white/80">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria.'
                  : 'You don\'t have any invoices yet.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredInvoices.map((invoice) => (
              <Card
                key={invoice.id}
                className="glass-card card-3d has-video hover:shadow-xl transition-all duration-300"
                videoSrc="/card.mp4"
                videoOpacity="opacity-40" 
                videoBlendMode="mix-blend-multiply dark:mix-blend-lighten"
                bgColor="bg-slate-500/75 dark:bg-gray-900/80"
                borderColor="border-gray-200 dark:border-gray-700/50"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Header */}
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(invoice.status)}
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(invoice.status)}`}>
                            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                          </span>
                        </div>
                        
                        {isDueSoon(invoice.due_date) && invoice.status === 'pending' && (
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400">
                            Due Soon
                          </span>
                        )}
                        
                        {isOverdue(invoice.due_date, invoice.status) && (
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                            Overdue
                          </span>
                        )}
                      </div>

                      {/* Project and Customer Info */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-white mb-1">
                            {invoice.estimates.title}
                          </h3>
                          {invoice.estimates.description && (
                            <p className="text-sm text-white/80 line-clamp-2">
                              {invoice.estimates.description}
                            </p>
                          )}
                        </div>
                        
                        <div>
                          <div className="flex items-center gap-2 text-sm text-white/80 mb-1">
                            <User className="h-4 w-4" />
                            <span>{invoice.profiles.first_name} {invoice.profiles.last_name}</span>
                          </div>
                          <div className="text-sm text-white/70">
                            {invoice.profiles.email}
                          </div>
                          {invoice.profiles.organization && (
                            <div className="text-sm text-white/70">
                              {invoice.profiles.organization}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Invoice Details */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="flex items-center gap-1 text-white/80 mb-1">
                            <DollarSign className="h-4 w-4" />
                            <span>Amount</span>
                          </div>
                          <div className="font-semibold text-white">
                            {formatCurrency(invoice.final_price_cents)}
                          </div>
                          {invoice.tax_rate > 0 && (
                            <div className="text-xs text-white/70">
                              (includes {invoice.tax_rate}% tax)
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-1 text-white/80 mb-1">
                            <Calendar className="h-4 w-4" />
                            <span>Due Date</span>
                          </div>
                          <div className="font-medium text-white">
                            {formatDate(invoice.due_date)}
                          </div>
                        </div>

                        <div>
                          <div className="text-white/80 mb-1">Created</div>
                          <div className="font-medium text-white">
                            {formatDate(invoice.created_at)}
                          </div>
                        </div>

                        {invoice.paid_at && (
                          <div>
                            <div className="text-white/80 mb-1">Paid</div>
                            <div className="font-medium text-white">
                              {formatDate(invoice.paid_at)}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 ml-6">
                      {invoice.status === 'pending' && (
                        <button 
                          onClick={() => handlePayNow(invoice)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                          <CreditCard className="h-4 w-4" />
                          Pay Now
                        </button>
                      )}
                      
                      <button className="inline-flex items-center gap-2 px-4 py-2 border border-white/30 text-white rounded-lg hover:bg-white/10 transition-colors text-sm">
                        <Eye className="h-4 w-4" />
                        View
                      </button>
                      
                      {invoice.invoice_pdf_url && (
                        <button className="inline-flex items-center gap-2 px-4 py-2 border border-white/30 text-white rounded-lg hover:bg-white/10 transition-colors text-sm">
                          <Download className="h-4 w-4" />
                          PDF
                        </button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedInvoice && (
        <InvoicePaymentModal
          invoice={selectedInvoice}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
};

export default InvoicesPage; 