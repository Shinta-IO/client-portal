import React, { useState, useEffect } from 'react';
import { X, CreditCard, Calendar, DollarSign, User, Building, CheckCircle, AlertCircle } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface Invoice {
  id: string;
  estimate_id: string;
  user_id: string;
  final_price_cents: number;
  tax_rate: number;
  status: 'pending' | 'paid' | 'overdue';
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

interface InvoicePaymentModalProps {
  invoice: Invoice;
  onClose: () => void;
  onSuccess: () => void;
}

// Payment Form Component
const PaymentForm = ({ invoice, onSuccess, onClose }: InvoicePaymentModalProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fetch client secret for existing payment intent
  useEffect(() => {
    const fetchClientSecret = async () => {
      try {
        console.log('🔄 Fetching client secret for invoice:', invoice.id);
        const response = await fetch(`/api/invoices/${invoice.id}/payment`);
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Client secret received');
          setClientSecret(data.client_secret);
        } else {
          const errorData = await response.json();
          console.error('❌ Payment endpoint error:', {
            status: response.status,
            error: errorData
          });
          
          // Show specific error message
          const errorMessage = errorData.error || 'Failed to get payment information';
          if (errorData.currentStatus) {
            setError(`Invoice status: ${errorData.currentStatus}. ${errorMessage}`);
          } else {
            setError(errorMessage);
          }
        }
      } catch (error) {
        console.error('❌ Error fetching client secret:', error);
        setError('Failed to load payment information');
      }
    };

    if (invoice.stripe_payment_intent_id || invoice.status === 'pending') {
      fetchClientSecret();
    } else {
      setError(`Cannot process payment. Invoice status: ${invoice.status}`);
    }
  }, [invoice.id, invoice.stripe_payment_intent_id, invoice.status]);

  const formatCurrency = (cents: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const calculateTaxBreakdown = () => {
    if (!invoice.tax_rate || invoice.tax_rate === 0) {
      return {
        preTaxAmount: invoice.final_price_cents,
        taxAmount: 0,
        total: invoice.final_price_cents
      };
    }

    // Calculate pre-tax amount from total
    const preTaxAmount = Math.round(invoice.final_price_cents / (1 + invoice.tax_rate / 100));
    const taxAmount = invoice.final_price_cents - preTaxAmount;

    return {
      preTaxAmount,
      taxAmount,
      total: invoice.final_price_cents
    };
  };

  const { preTaxAmount, taxAmount } = calculateTaxBreakdown();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || !clientSecret) {
      setError('Payment system not ready. Please try again.');
      return;
    }

    setLoading(true);
    setError(null);

    const cardElement = elements.getElement(CardElement);

    if (!cardElement) {
      setError('Card element not found');
      setLoading(false);
      return;
    }

    const { error: submitError } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardElement,
        billing_details: {
          name: `${invoice.profiles.first_name} ${invoice.profiles.last_name}`,
          email: invoice.profiles.email,
        },
      },
    });

    if (submitError) {
      setError(submitError.message || 'Payment failed');
      setLoading(false);
    } else {
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 2000);
    }
  };

  if (success) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Payment Successful!
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Your payment of {formatCurrency(invoice.final_price_cents)} has been processed.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Invoice Summary */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {invoice.estimates.title}
        </h3>
        
        {invoice.estimates.description && (
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            {invoice.estimates.description}
          </p>
        )}

        <div className="space-y-2">
          {invoice.tax_rate > 0 ? (
            <>
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Subtotal:</span>
                <span>{formatCurrency(preTaxAmount)}</span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Tax ({invoice.tax_rate}%):</span>
                <span>{formatCurrency(taxAmount)}</span>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-2">
                <div className="flex justify-between text-lg font-semibold text-gray-900 dark:text-white">
                  <span>Total:</span>
                  <span>{formatCurrency(invoice.final_price_cents)}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex justify-between text-lg font-semibold text-gray-900 dark:text-white">
              <span>Total:</span>
              <span>{formatCurrency(invoice.final_price_cents)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Card Element */}
      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Card Information
        </label>
        <div className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#374151',
                  '::placeholder': {
                    color: '#9CA3AF',
                  },
                },
                invalid: {
                  color: '#EF4444',
                },
              },
            }}
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-400">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!stripe || loading || !clientSecret}
        className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {loading && (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        )}
        {loading ? 'Processing...' : `Pay ${formatCurrency(invoice.final_price_cents)}`}
      </button>
    </form>
  );
};

// Main Modal Component
const InvoicePaymentModal = ({ invoice, onClose, onSuccess }: InvoicePaymentModalProps) => {
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Pay Invoice
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Due {formatDate(invoice.due_date)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <Elements stripe={stripePromise}>
            <PaymentForm invoice={invoice} onSuccess={onSuccess} onClose={onClose} />
          </Elements>
        </div>
      </div>
    </div>
  );
};

export default InvoicePaymentModal; 