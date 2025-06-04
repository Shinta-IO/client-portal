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
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchInvoices();
      checkAdminStatus();
    }
  }, [userId]);

  const checkAdminStatus = async () => {
    try {
      const response = await fetch('/api/user/profile');
      if (response.ok) {
        const data = await response.json();
        setIsAdmin(data.isAdmin || false);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  const fetchInvoices = async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/invoices');
      if (response.ok) {
        const data = await response.json();
        setInvoices(data);
        console.log('📋 Invoices fetched:', data.length, 'invoices');
        
        // Debug status issues
        const paidInvoices = data.filter((inv: Invoice) => inv.status === 'paid');
        const pendingInvoices = data.filter((inv: Invoice) => inv.status === 'pending');
        console.log('💰 Paid invoices:', paidInvoices.length);
        console.log('⏳ Pending invoices:', pendingInvoices.length);
        
        // Log any invoices with payment intent but still pending
        const pendingWithPaymentIntent = pendingInvoices.filter((inv: Invoice) => inv.stripe_payment_intent_id);
        if (pendingWithPaymentIntent.length > 0) {
          console.warn('⚠️ Found pending invoices with payment intents:', pendingWithPaymentIntent.map(inv => ({
            id: inv.id,
            stripe_payment_intent_id: inv.stripe_payment_intent_id,
            status: inv.status,
            paid_at: inv.paid_at
          })));
        }
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

  const handleViewInvoice = (invoice: Invoice) => {
    // For now, just open a modal or navigate to invoice details
    // TODO: Implement proper invoice view/detail page
    console.log('Viewing invoice:', invoice);
    alert(`Invoice Details:\n\nID: ${invoice.id}\nProject: ${invoice.estimates.title}\nAmount: ${formatCurrency(invoice.final_price_cents)}\nStatus: ${invoice.status}\nDue: ${formatDate(invoice.due_date)}${invoice.paid_at ? `\nPaid: ${formatDate(invoice.paid_at)}` : ''}`);
  };

  const handleDownloadPDF = (invoice: Invoice) => {
    if (invoice.invoice_pdf_url) {
      window.open(invoice.invoice_pdf_url, '_blank');
    } else {
      alert('PDF not available for this invoice');
    }
  };

  // Add debugging function
  const debugInvoiceStatus = (invoice: Invoice) => {
    console.log('🐛 Invoice Debug:', {
      id: invoice.id,
      status: invoice.status,
      paid_at: invoice.paid_at,
      stripe_payment_intent_id: invoice.stripe_payment_intent_id,
      created_at: invoice.created_at
    });
  };

  const handleSyncInvoiceStatus = async () => {
    if (!isAdmin) return;
    
    try {
      setRefreshing(true);
      const response = await fetch('/api/sync-invoice-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('🔄 Sync result:', result);
        
        // Refresh invoices after sync
        setTimeout(() => {
          fetchInvoices();
        }, 1000);
        
        alert(`Sync complete!\nSynced: ${result.syncResults?.filter((r: any) => r.status === 'synced').length || 0}\nErrors: ${result.syncResults?.filter((r: any) => r.status === 'error').length || 0}`);
      } else {
        console.error('Sync failed:', response.status);
        alert('Sync failed. Check console for details.');
      }
    } catch (error) {
      console.error('Sync error:', error);
      alert('Sync error. Check console for details.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleManualInvoiceCheck = async (invoice: Invoice) => {
    if (!isAdmin) return;
    
    try {
      const response = await fetch('/api/test-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'check_status',
          invoiceId: invoice.id
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('📊 Invoice status check:', result);
        
        const message = `Invoice Status Check:\n\nDatabase Status: ${result.invoice.status}\nStripe Status: ${result.stripe_status || 'N/A'}\nPaid At: ${result.invoice.paid_at || 'Not paid'}\nAmount: ${formatCurrency(result.invoice.amount)}`;
        alert(message);
      }
    } catch (error) {
      console.error('Status check error:', error);
    }
  };

  const handleManualMarkPaid = async (invoice: Invoice) => {
    if (!isAdmin) return;
    
    if (!confirm(`Are you sure you want to manually mark invoice ${invoice.id} as paid?`)) {
      return;
    }
    
    try {
      const response = await fetch('/api/test-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'mark_paid',
          invoiceId: invoice.id
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Manual mark paid result:', result);
        alert('Invoice marked as paid successfully!');
        
        // Refresh invoices
        setTimeout(() => {
          fetchInvoices();
        }, 1000);
      } else {
        const error = await response.json();
        alert(`Failed to mark as paid: ${error.error}`);
      }
    } catch (error) {
      console.error('Manual mark paid error:', error);
      alert('Error marking invoice as paid. Check console.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-5 md:p-8 space-y-8 max-w-[1600px] mx-auto">
      <div className="max-w-7xl mx-auto">
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
            
            {/* Admin controls */}
            {isAdmin && (
              <div className="flex gap-2">
                <button
                  onClick={handleSyncInvoiceStatus}
                  disabled={refreshing}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  🔄 Sync All
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Filters and Search */}
        <Card 
          className="mb-6 glass-card card-3d"
          videoSrc="/card.mp4"
          videoOpacity="opacity-50"
          videoBlendMode="mix-blend-multiply dark:mix-blend-lighten"
          bgColor="bg-white dark:bg-gray-900/90"
          borderColor="border-gray-200 dark:border-gray-700"
          hybridMode={true}
        >
          <CardHeader className="pb-0">
            <CardTitle className="text-lg text-black dark:text-white">Filter Invoices</CardTitle>
          </CardHeader>
          <CardContent className="p-5 sm:p-7">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search invoices..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700/80 text-black dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm"
                />
              </div>

              {/* Status Filter */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700/80 text-black dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm"
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
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700/80 text-black dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm"
                >
                  <option value="created_at">Sort by Date</option>
                  <option value="due_date">Sort by Due Date</option>
                  <option value="amount">Sort by Amount</option>
                </select>
              </div>

              {/* Summary Stats */}
              <div className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                Showing {filteredInvoices.length} of {invoices.length} invoices
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invoices List */}
        {filteredInvoices.length === 0 ? (
          <Card 
            className="glass-card card-3d"
            videoSrc="/card.mp4"
            videoOpacity="opacity-50"
            videoBlendMode="mix-blend-multiply dark:mix-blend-lighten"
            bgColor="bg-white dark:bg-gray-900/90"
            borderColor="border-gray-200 dark:border-gray-700"
            hybridMode={true}
          >
            <CardContent className="p-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-500 dark:text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-black dark:text-white mb-2">
                No invoices found
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria.'
                  : 'You don\'t have any invoices yet.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {filteredInvoices.map((invoice) => (
              <Card
                key={invoice.id}
                className="glass-card card-3d hover:shadow-xl transition-all duration-300"
                videoSrc="/card.mp4"
                videoOpacity="opacity-50"
                videoBlendMode="mix-blend-multiply dark:mix-blend-lighten"
                bgColor="bg-white dark:bg-gray-900/90"
                borderColor="border-gray-200 dark:border-gray-700"
                hybridMode={true}
              >
                <CardContent className="p-6 sm:p-7">
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
                          <h3 className="text-lg font-semibold text-black dark:text-white mb-1">
                            {invoice.estimates.title}
                          </h3>
                          {invoice.estimates.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                              {invoice.estimates.description}
                            </p>
                          )}
                        </div>
                        
                        <div>
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 mb-1">
                            <User className="h-4 w-4" />
                            <span>{invoice.profiles.first_name} {invoice.profiles.last_name}</span>
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {invoice.profiles.email}
                          </div>
                          {invoice.profiles.organization && (
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {invoice.profiles.organization}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Invoice Details */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="flex items-center gap-1 text-gray-600 dark:text-gray-300 mb-1">
                            <DollarSign className="h-4 w-4" />
                            <span>Amount</span>
                          </div>
                          <div className="font-semibold text-black dark:text-white">
                            {formatCurrency(invoice.final_price_cents)}
                          </div>
                          {invoice.tax_rate > 0 && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              (includes {invoice.tax_rate}% tax)
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-1 text-gray-600 dark:text-gray-300 mb-1">
                            <Calendar className="h-4 w-4" />
                            <span>Due Date</span>
                          </div>
                          <div className="font-medium text-black dark:text-white">
                            {formatDate(invoice.due_date)}
                          </div>
                        </div>

                        <div>
                          <div className="text-gray-600 dark:text-gray-300 mb-1">Created</div>
                          <div className="font-medium text-black dark:text-white">
                            {formatDate(invoice.created_at)}
                          </div>
                        </div>

                        {invoice.paid_at && (
                          <div>
                            <div className="text-gray-600 dark:text-gray-300 mb-1">Paid</div>
                            <div className="font-medium text-black dark:text-white">
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
                      
                      <button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-black dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm" onClick={() => handleViewInvoice(invoice)}>
                        <Eye className="h-4 w-4" />
                        View
                      </button>
                      
                      {invoice.invoice_pdf_url && (
                        <button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-black dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm" onClick={() => handleDownloadPDF(invoice)}>
                          <Download className="h-4 w-4" />
                          PDF
                        </button>
                      )}
                      
                      {/* Admin debug controls */}
                      {isAdmin && (
                        <div className="flex flex-col gap-1 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                          <button 
                            onClick={() => handleManualInvoiceCheck(invoice)}
                            className="inline-flex items-center gap-2 px-3 py-1 border border-blue-400/50 text-blue-600 dark:text-blue-300 rounded text-xs hover:bg-blue-50 dark:hover:bg-blue-500/20 transition-colors"
                          >
                            🔍 Check Status
                          </button>
                          {invoice.status === 'pending' && invoice.stripe_payment_intent_id && (
                            <button 
                              onClick={() => handleManualMarkPaid(invoice)}
                              className="inline-flex items-center gap-2 px-3 py-1 border border-green-400/50 text-green-600 dark:text-green-300 rounded text-xs hover:bg-green-50 dark:hover:bg-green-500/20 transition-colors"
                            >
                              ✅ Mark Paid
                            </button>
                          )}
                        </div>
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