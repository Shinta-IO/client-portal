import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is required');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-05-28.basil',
});

export interface CreatePaymentIntentParams {
  amount: number; // in cents
  currency: string;
  customerId?: string;
  metadata?: Record<string, string>;
  description?: string;
}

export interface CreateCustomerParams {
  email: string;
  name: string;
  phone?: string;
  metadata?: Record<string, string>;
}

export class StripeService {
  private static instance: StripeService;

  public static getInstance(): StripeService {
    if (!StripeService.instance) {
      StripeService.instance = new StripeService();
    }
    return StripeService.instance;
  }

  /**
   * Create a payment intent for invoice payment
   */
  async createPaymentIntent(params: CreatePaymentIntentParams): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: params.amount,
        currency: params.currency,
        customer: params.customerId,
        metadata: params.metadata || {},
        description: params.description,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return paymentIntent;
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw error;
    }
  }

  /**
   * Retrieve an existing payment intent
   */
  async retrievePaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    try {
      return await stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (error) {
      console.error('Error retrieving payment intent:', error);
      throw error;
    }
  }

  /**
   * Create a customer in Stripe
   */
  async createCustomer(params: CreateCustomerParams): Promise<Stripe.Customer> {
    try {
      const customer = await stripe.customers.create({
        email: params.email,
        name: params.name,
        phone: params.phone,
        metadata: params.metadata || {},
      });

      return customer;
    } catch (error) {
      console.error('Error creating customer:', error);
      throw error;
    }
  }

  /**
   * Retrieve a customer by ID
   */
  async getCustomer(customerId: string): Promise<Stripe.Customer | null> {
    try {
      const customer = await stripe.customers.retrieve(customerId);
      return customer as Stripe.Customer;
    } catch (error) {
      console.error('Error retrieving customer:', error);
      return null;
    }
  }

  /**
   * Create or retrieve customer by email
   */
  async getOrCreateCustomer(params: CreateCustomerParams): Promise<Stripe.Customer> {
    try {
      // First, try to find existing customer by email
      const existingCustomers = await stripe.customers.list({
        email: params.email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        return existingCustomers.data[0];
      }

      // Create new customer if not found
      return await this.createCustomer(params);
    } catch (error) {
      console.error('Error getting or creating customer:', error);
      throw error;
    }
  }

  /**
   * Retrieve a payment intent
   */
  async getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    try {
      return await stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (error) {
      console.error('Error retrieving payment intent:', error);
      throw error;
    }
  }

  /**
   * Update payment intent metadata
   */
  async updatePaymentIntent(
    paymentIntentId: string, 
    params: { metadata?: Record<string, string>; description?: string }
  ): Promise<Stripe.PaymentIntent> {
    try {
      return await stripe.paymentIntents.update(paymentIntentId, params);
    } catch (error) {
      console.error('Error updating payment intent:', error);
      throw error;
    }
  }

  /**
   * Create a Stripe invoice (for more complex billing)
   */
  async createInvoice(params: {
    customerId: string;
    description: string;
    amount: number; // in cents
    currency: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Invoice> {
    try {
      // Create an invoice item
      await stripe.invoiceItems.create({
        customer: params.customerId,
        amount: params.amount,
        currency: params.currency,
        description: params.description,
        metadata: params.metadata,
      });

      // Create the invoice
      const invoice = await stripe.invoices.create({
        customer: params.customerId,
        auto_advance: false, // Don't automatically finalize
        metadata: params.metadata || {},
      });

      return invoice;
    } catch (error) {
      console.error('Error creating invoice:', error);
      throw error;
    }
  }

  /**
   * Finalize and send invoice
   */
  async finalizeInvoice(invoiceId: string): Promise<Stripe.Invoice> {
    try {
      return await stripe.invoices.finalizeInvoice(invoiceId, {
        auto_advance: true,
      });
    } catch (error) {
      console.error('Error finalizing invoice:', error);
      throw error;
    }
  }

  /**
   * Handle webhook events
   */
  async constructEvent(body: string | Buffer, signature: string): Promise<Stripe.Event> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is required');
    }

    try {
      return stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (error) {
      console.error('Error constructing webhook event:', error);
      throw error;
    }
  }

  /**
   * Get raw Stripe instance for advanced operations
   */
  getStripeInstance(): Stripe {
    return stripe;
  }
}

export const stripeService = StripeService.getInstance(); 