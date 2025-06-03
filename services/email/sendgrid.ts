import sgMail from '@sendgrid/mail';

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export interface EmailTemplate {
  to: string;
  from: string;
  subject: string;
  html: string;
  text?: string;
}

export class SendGridService {
  private static instance: SendGridService;
  private fromEmail: string;

  private constructor() {
    this.fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@pixel-pro.com';
  }

  public static getInstance(): SendGridService {
    if (!SendGridService.instance) {
      SendGridService.instance = new SendGridService();
    }
    return SendGridService.instance;
  }

  /**
   * Send welcome email to new users
   */
  async sendWelcomeEmail(
    userEmail: string,
    userName: string
  ): Promise<boolean> {
    try {
      const html = this.generateWelcomeTemplate(userName);

      const msg: EmailTemplate = {
        to: userEmail,
        from: this.fromEmail,
        subject: `🎉 Welcome to Pixel-Pro, ${userName}!`,
        html,
        text: `Welcome to Pixel-Pro, ${userName}! We're excited to have you on board. You can now access your dashboard and start managing your projects with us.`
      };

      await sgMail.send(msg);
      console.log(`Welcome email sent to ${userEmail}`);
      return true;
    } catch (error) {
      console.error('Error sending welcome email:', error);
      return false;
    }
  }

  /**
   * Send project creation notification to user
   */
  async sendProjectCreatedEmail(
    userEmail: string,
    userName: string,
    projectTitle: string,
    projectDescription: string,
    deadline?: string
  ): Promise<boolean> {
    try {
      const html = this.generateProjectCreatedTemplate(
        userName,
        projectTitle,
        projectDescription,
        deadline
      );

      const msg: EmailTemplate = {
        to: userEmail,
        from: this.fromEmail,
        subject: `🚀 New Project Created: ${projectTitle}`,
        html,
        text: `Hi ${userName}, a new project "${projectTitle}" has been created for you. ${projectDescription} ${deadline ? `Deadline: ${deadline}` : ''}`
      };

      await sgMail.send(msg);
      console.log(`Project created email sent to ${userEmail}`);
      return true;
    } catch (error) {
      console.error('Error sending project created email:', error);
      return false;
    }
  }

  /**
   * Send project completion notification to user
   */
  async sendProjectCompletedEmail(
    userEmail: string,
    userName: string,
    projectTitle: string,
    projectDescription: string
  ): Promise<boolean> {
    try {
      const html = this.generateProjectCompletedTemplate(
        userName,
        projectTitle,
        projectDescription
      );

      const msg: EmailTemplate = {
        to: userEmail,
        from: this.fromEmail,
        subject: `🎉 Project Completed: ${projectTitle}`,
        html,
        text: `Hi ${userName}, congratulations! Your project "${projectTitle}" has been completed successfully.`
      };

      await sgMail.send(msg);
      console.log(`Project completed email sent to ${userEmail}`);
      return true;
    } catch (error) {
      console.error('Error sending project completed email:', error);
      return false;
    }
  }

  /**
   * Send invoice created notification to user
   */
  async sendInvoiceCreatedEmail(
    userEmail: string,
    userName: string,
    estimateTitle: string,
    amount: number,
    invoiceUrl: string
  ): Promise<boolean> {
    try {
      const html = this.generateInvoiceCreatedTemplate(
        userName,
        estimateTitle,
        amount,
        invoiceUrl
      );

      const msg: EmailTemplate = {
        to: userEmail,
        from: this.fromEmail,
        subject: `💳 Invoice Ready for Payment: ${estimateTitle}`,
        html,
        text: `Hi ${userName}, your invoice for "${estimateTitle}" is ready for payment. Amount: $${(amount / 100).toFixed(2)}. You can pay online at: ${invoiceUrl}`
      };

      await sgMail.send(msg);
      console.log(`Invoice created email sent to ${userEmail}`);
      return true;
    } catch (error) {
      console.error('Error sending invoice created email:', error);
      return false;
    }
  }

  /**
   * Send payment confirmation to user
   */
  async sendPaymentConfirmationEmail(
    userEmail: string,
    userName: string,
    estimateTitle: string,
    amount: number,
    transactionId: string
  ): Promise<boolean> {
    try {
      const html = this.generatePaymentConfirmationTemplate(
        userName,
        estimateTitle,
        amount,
        transactionId
      );

      const msg: EmailTemplate = {
        to: userEmail,
        from: this.fromEmail,
        subject: `✅ Payment Confirmed: ${estimateTitle}`,
        html,
        text: `Hi ${userName}, your payment of $${(amount / 100).toFixed(2)} for "${estimateTitle}" has been confirmed. Transaction ID: ${transactionId}. Work will begin shortly!`
      };

      await sgMail.send(msg);
      console.log(`Payment confirmation email sent to ${userEmail}`);
      return true;
    } catch (error) {
      console.error('Error sending payment confirmation email:', error);
      return false;
    }
  }

  /**
   * Send estimate created notification to user
   */
  async sendEstimateCreatedEmail(
    userEmail: string,
    userName: string,
    estimateTitle: string,
    estimateDescription: string,
    amount: number,
    estimateUrl: string
  ): Promise<boolean> {
    try {
      const html = this.generateEstimateCreatedTemplate(
        userName,
        estimateTitle,
        estimateDescription,
        amount,
        estimateUrl
      );

      const msg: EmailTemplate = {
        to: userEmail,
        from: this.fromEmail,
        subject: `📄 New Estimate Ready: ${estimateTitle}`,
        html,
        text: `Hi ${userName}, your estimate for "${estimateTitle}" is ready for review. Amount: $${(amount / 100).toFixed(2)}. View and approve at: ${estimateUrl}`
      };

      await sgMail.send(msg);
      console.log(`Estimate created email sent to ${userEmail}`);
      return true;
    } catch (error) {
      console.error('Error sending estimate created email:', error);
      return false;
    }
  }

  /**
   * Send new message notification to user
   */
  async sendNewMessageEmail(
    userEmail: string,
    userName: string,
    senderName: string,
    messagePreview: string
  ): Promise<boolean> {
    try {
      const html = this.generateNewMessageTemplate(
        userName,
        senderName,
        messagePreview
      );

      const msg: EmailTemplate = {
        to: userEmail,
        from: this.fromEmail,
        subject: `💬 New Message from ${senderName}`,
        html,
        text: `Hi ${userName}, you have a new message from ${senderName}: "${messagePreview}..."`
      };

      await sgMail.send(msg);
      console.log(`New message email sent to ${userEmail}`);
      return true;
    } catch (error) {
      console.error('Error sending new message email:', error);
      return false;
    }
  }

  /**
   * Send review request to user after project completion
   */
  async sendReviewRequestEmail(
    userEmail: string,
    userName: string,
    projectTitle: string
  ): Promise<boolean> {
    try {
      const html = this.generateReviewRequestTemplate(
        userName,
        projectTitle
      );

      const msg: EmailTemplate = {
        to: userEmail,
        from: this.fromEmail,
        subject: `⭐ How was your experience with ${projectTitle}?`,
        html,
        text: `Hi ${userName}, we'd love to hear about your experience with the "${projectTitle}" project. Please take a moment to leave a review.`
      };

      await sgMail.send(msg);
      console.log(`Review request email sent to ${userEmail}`);
      return true;
    } catch (error) {
      console.error('Error sending review request email:', error);
      return false;
    }
  }

  /**
   * Generate HTML template for welcome email
   */
  private generateWelcomeTemplate(userName: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Pixel-Pro</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; }
            .logo { color: white; font-size: 28px; font-weight: bold; margin-bottom: 10px; }
            .header-text { color: white; font-size: 18px; opacity: 0.9; }
            .content { padding: 40px 30px; }
            .title { color: #1a202c; font-size: 24px; font-weight: bold; margin-bottom: 20px; }
            .welcome-card { background: #f7fafc; border-radius: 12px; padding: 24px; margin: 20px 0; border-left: 4px solid #667eea; }
            .cta-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; }
            .footer { background: #f7fafc; padding: 30px; text-align: center; color: #718096; font-size: 14px; }
            .features { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 20px 0; }
            .feature { background: #f7fafc; padding: 16px; border-radius: 8px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🎨 Pixel-Pro</div>
              <div class="header-text">Professional Design & Development</div>
            </div>
            
            <div class="content">
              <h1 class="title">Welcome to Pixel-Pro, ${userName}! 🎉</h1>
              <p>We're thrilled to have you join our community of creative professionals!</p>
              
              <div class="welcome-card">
                <h3>🚀 You're all set to get started!</h3>
                <p>Your account has been created successfully. You can now access your dashboard to manage projects, view estimates, and track your creative journey with us.</p>
              </div>

              <div class="features">
                <div class="feature">
                  <h4>📋 Project Management</h4>
                  <p>Track your projects from start to finish</p>
                </div>
                <div class="feature">
                  <h4>💰 Easy Payments</h4>
                  <p>Secure online payment processing</p>
                </div>
                <div class="feature">
                  <h4>📞 Direct Communication</h4>
                  <p>Message our team anytime</p>
                </div>
                <div class="feature">
                  <h4>⭐ Quality Assurance</h4>
                  <p>Professional results guaranteed</p>
                </div>
              </div>
              
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" class="cta-button">
                Access Your Dashboard →
              </a>
              
              <p>If you have any questions or need assistance getting started, our support team is here to help!</p>
            </div>
            
            <div class="footer">
              <p>© 2024 Pixel-Pro. All rights reserved.</p>
              <p>Thank you for choosing Pixel-Pro for your creative needs!</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate HTML template for project creation email
   */
  private generateProjectCreatedTemplate(
    userName: string,
    projectTitle: string,
    projectDescription: string,
    deadline?: string
  ): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Project Created</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; }
            .logo { color: white; font-size: 28px; font-weight: bold; margin-bottom: 10px; }
            .header-text { color: white; font-size: 18px; opacity: 0.9; }
            .content { padding: 40px 30px; }
            .title { color: #1a202c; font-size: 24px; font-weight: bold; margin-bottom: 20px; }
            .project-card { background: #f7fafc; border-radius: 12px; padding: 24px; margin: 20px 0; border-left: 4px solid #667eea; }
            .project-title { color: #2d3748; font-size: 20px; font-weight: bold; margin-bottom: 12px; }
            .project-description { color: #4a5568; line-height: 1.6; margin-bottom: 16px; }
            .deadline { background: #fed7d7; color: #9b2c2c; padding: 8px 12px; border-radius: 6px; font-size: 14px; font-weight: 500; }
            .cta-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; }
            .footer { background: #f7fafc; padding: 30px; text-align: center; color: #718096; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🎨 Pixel-Pro</div>
              <div class="header-text">Professional Design & Development</div>
            </div>
            
            <div class="content">
              <h1 class="title">Hello ${userName}! 👋</h1>
              <p>Exciting news! A new project has been created and assigned to you.</p>
              
              <div class="project-card">
                <div class="project-title">📋 ${projectTitle}</div>
                <div class="project-description">${projectDescription}</div>
                ${deadline ? `<div class="deadline">⏰ Deadline: ${new Date(deadline).toLocaleDateString()}</div>` : ''}
              </div>
              
              <p>You can now access your project dashboard to view all details, track progress, and collaborate with our team.</p>
              
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/projects" class="cta-button">
                View Project Dashboard →
              </a>
              
              <p>If you have any questions or need assistance, feel free to reach out to our support team.</p>
            </div>
            
            <div class="footer">
              <p>© 2024 Pixel-Pro. All rights reserved.</p>
              <p>You're receiving this email because a project was created for your account.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate HTML template for project completion email
   */
  private generateProjectCompletedTemplate(
    userName: string,
    projectTitle: string,
    projectDescription: string
  ): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Project Completed</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; }
            .header { background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); padding: 40px 30px; text-align: center; }
            .logo { color: white; font-size: 28px; font-weight: bold; margin-bottom: 10px; }
            .header-text { color: white; font-size: 18px; opacity: 0.9; }
            .content { padding: 40px 30px; }
            .title { color: #1a202c; font-size: 24px; font-weight: bold; margin-bottom: 20px; }
            .celebration { text-align: center; font-size: 48px; margin: 20px 0; }
            .project-card { background: #f0fff4; border-radius: 12px; padding: 24px; margin: 20px 0; border-left: 4px solid #48bb78; }
            .project-title { color: #2d3748; font-size: 20px; font-weight: bold; margin-bottom: 12px; }
            .project-description { color: #4a5568; line-height: 1.6; margin-bottom: 16px; }
            .status-badge { background: #c6f6d5; color: #22543d; padding: 8px 12px; border-radius: 6px; font-size: 14px; font-weight: 500; }
            .cta-button { display: inline-block; background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; }
            .footer { background: #f7fafc; padding: 30px; text-align: center; color: #718096; font-size: 14px; }
            .next-steps { background: #edf2f7; border-radius: 8px; padding: 20px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🎨 Pixel-Pro</div>
              <div class="header-text">Professional Design & Development</div>
            </div>
            
            <div class="content">
              <h1 class="title">Congratulations ${userName}! 🎉</h1>
              <div class="celebration">🚀✨🎊</div>
              <p>We're thrilled to let you know that your project has been completed successfully!</p>
              
              <div class="project-card">
                <div class="project-title">✅ ${projectTitle}</div>
                <div class="project-description">${projectDescription}</div>
                <div class="status-badge">🎯 Status: Completed</div>
              </div>
              
              <div class="next-steps">
                <h3>📋 What's Next?</h3>
                <ul>
                  <li>Review the final deliverables in your project dashboard</li>
                  <li>Download any assets or files</li>
                  <li>Leave a review about your experience</li>
                  <li>Contact us for any follow-up support</li>
                </ul>
              </div>
              
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/projects" class="cta-button">
                View Completed Project →
              </a>
              
              <p>Thank you for choosing Pixel-Pro for your project needs. We hope you're delighted with the results!</p>
            </div>
            
            <div class="footer">
              <p>© 2024 Pixel-Pro. All rights reserved.</p>
              <p>We'd love to hear your feedback about this project!</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate HTML template for invoice created email
   */
  private generateInvoiceCreatedTemplate(
    userName: string,
    estimateTitle: string,
    amount: number,
    invoiceUrl: string
  ): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invoice Ready</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; }
            .header { background: linear-gradient(135deg, #f6ad55 0%, #ed8936 100%); padding: 40px 30px; text-align: center; }
            .logo { color: white; font-size: 28px; font-weight: bold; margin-bottom: 10px; }
            .header-text { color: white; font-size: 18px; opacity: 0.9; }
            .content { padding: 40px 30px; }
            .title { color: #1a202c; font-size: 24px; font-weight: bold; margin-bottom: 20px; }
            .invoice-card { background: #fffaf0; border-radius: 12px; padding: 24px; margin: 20px 0; border-left: 4px solid #f6ad55; }
            .amount { color: #c05621; font-size: 28px; font-weight: bold; margin: 16px 0; }
            .cta-button { display: inline-block; background: linear-gradient(135deg, #f6ad55 0%, #ed8936 100%); color: white; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; font-size: 16px; }
            .footer { background: #f7fafc; padding: 30px; text-align: center; color: #718096; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🎨 Pixel-Pro</div>
              <div class="header-text">Professional Design & Development</div>
            </div>
            
            <div class="content">
              <h1 class="title">Invoice Ready for Payment 💳</h1>
              <p>Hi ${userName}, your invoice is ready for payment!</p>
              
              <div class="invoice-card">
                <h3>📄 ${estimateTitle}</h3>
                <div class="amount">$${(amount / 100).toFixed(2)}</div>
                <p>Your project is ready to begin once payment is received. Click below to pay securely online.</p>
              </div>
              
              <a href="${invoiceUrl}" class="cta-button">
                Pay Invoice Now →
              </a>
              
              <p>Payment is secure and processed through Stripe. Work will begin immediately after payment confirmation.</p>
            </div>
            
            <div class="footer">
              <p>© 2024 Pixel-Pro. All rights reserved.</p>
              <p>Questions about your invoice? Contact our support team.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate HTML template for payment confirmation email
   */
  private generatePaymentConfirmationTemplate(
    userName: string,
    estimateTitle: string,
    amount: number,
    transactionId: string
  ): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Payment Confirmed</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; }
            .header { background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); padding: 40px 30px; text-align: center; }
            .logo { color: white; font-size: 28px; font-weight: bold; margin-bottom: 10px; }
            .header-text { color: white; font-size: 18px; opacity: 0.9; }
            .content { padding: 40px 30px; }
            .title { color: #1a202c; font-size: 24px; font-weight: bold; margin-bottom: 20px; }
            .payment-card { background: #f0fff4; border-radius: 12px; padding: 24px; margin: 20px 0; border-left: 4px solid #48bb78; }
            .amount { color: #22543d; font-size: 28px; font-weight: bold; margin: 16px 0; }
            .transaction-id { background: #e6fffa; padding: 8px 12px; border-radius: 6px; font-family: monospace; font-size: 12px; margin: 12px 0; }
            .cta-button { display: inline-block; background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; }
            .footer { background: #f7fafc; padding: 30px; text-align: center; color: #718096; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🎨 Pixel-Pro</div>
              <div class="header-text">Professional Design & Development</div>
            </div>
            
            <div class="content">
              <h1 class="title">Payment Confirmed! ✅</h1>
              <p>Hi ${userName}, thank you! Your payment has been successfully processed.</p>
              
              <div class="payment-card">
                <h3>💳 Payment Details</h3>
                <p><strong>Project:</strong> ${estimateTitle}</p>
                <div class="amount">$${(amount / 100).toFixed(2)}</div>
                <div class="transaction-id">Transaction ID: ${transactionId}</div>
                <p>✅ Payment confirmed and project initiated</p>
              </div>
              
              <p>Our team has been notified and work will begin shortly. You'll receive updates as your project progresses.</p>
              
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/projects" class="cta-button">
                View Your Project →
              </a>
              
              <p>Keep this email as your payment receipt. Thank you for choosing Pixel-Pro!</p>
            </div>
            
            <div class="footer">
              <p>© 2024 Pixel-Pro. All rights reserved.</p>
              <p>Need help? Contact our support team anytime.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate HTML template for estimate created email
   */
  private generateEstimateCreatedTemplate(
    userName: string,
    estimateTitle: string,
    estimateDescription: string,
    amount: number,
    estimateUrl: string
  ): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Estimate Ready</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; }
            .logo { color: white; font-size: 28px; font-weight: bold; margin-bottom: 10px; }
            .header-text { color: white; font-size: 18px; opacity: 0.9; }
            .content { padding: 40px 30px; }
            .title { color: #1a202c; font-size: 24px; font-weight: bold; margin-bottom: 20px; }
            .estimate-card { background: #f7fafc; border-radius: 12px; padding: 24px; margin: 20px 0; border-left: 4px solid #667eea; }
            .amount { color: #553c9a; font-size: 28px; font-weight: bold; margin: 16px 0; }
            .cta-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; font-size: 16px; }
            .footer { background: #f7fafc; padding: 30px; text-align: center; color: #718096; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🎨 Pixel-Pro</div>
              <div class="header-text">Professional Design & Development</div>
            </div>
            
            <div class="content">
              <h1 class="title">Your Estimate is Ready! 📄</h1>
              <p>Hi ${userName}, we've prepared a detailed estimate for your project.</p>
              
              <div class="estimate-card">
                <h3>📋 ${estimateTitle}</h3>
                <p>${estimateDescription}</p>
                <div class="amount">$${(amount / 100).toFixed(2)}</div>
                <p>This estimate includes all discussed requirements and deliverables.</p>
              </div>
              
              <p>Please review the estimate details and approve to proceed with your project.</p>
              
              <a href="${estimateUrl}" class="cta-button">
                Review & Approve Estimate →
              </a>
              
              <p>The estimate is valid for 30 days. Have questions? Feel free to reach out!</p>
            </div>
            
            <div class="footer">
              <p>© 2024 Pixel-Pro. All rights reserved.</p>
              <p>Ready to start your project? Approve your estimate today!</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate HTML template for new message email
   */
  private generateNewMessageTemplate(
    userName: string,
    senderName: string,
    messagePreview: string
  ): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Message</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; }
            .header { background: linear-gradient(135deg, #3182ce 0%, #2c5282 100%); padding: 40px 30px; text-align: center; }
            .logo { color: white; font-size: 28px; font-weight: bold; margin-bottom: 10px; }
            .header-text { color: white; font-size: 18px; opacity: 0.9; }
            .content { padding: 40px 30px; }
            .title { color: #1a202c; font-size: 24px; font-weight: bold; margin-bottom: 20px; }
            .message-card { background: #ebf8ff; border-radius: 12px; padding: 24px; margin: 20px 0; border-left: 4px solid #3182ce; }
            .sender { color: #2c5282; font-weight: bold; margin-bottom: 12px; }
            .preview { color: #4a5568; font-style: italic; line-height: 1.6; }
            .cta-button { display: inline-block; background: linear-gradient(135deg, #3182ce 0%, #2c5282 100%); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; }
            .footer { background: #f7fafc; padding: 30px; text-align: center; color: #718096; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🎨 Pixel-Pro</div>
              <div class="header-text">Professional Design & Development</div>
            </div>
            
            <div class="content">
              <h1 class="title">New Message 💬</h1>
              <p>Hi ${userName}, you have a new message!</p>
              
              <div class="message-card">
                <div class="sender">From: ${senderName}</div>
                <div class="preview">"${messagePreview}..."</div>
              </div>
              
              <p>Click below to read the full message and reply.</p>
              
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/messaging" class="cta-button">
                Read Message →
              </a>
              
              <p>Stay connected with our team for the best project experience!</p>
            </div>
            
            <div class="footer">
              <p>© 2024 Pixel-Pro. All rights reserved.</p>
              <p>Reply directly through your dashboard for fastest response.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate HTML template for review request email
   */
  private generateReviewRequestTemplate(
    userName: string,
    projectTitle: string
  ): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Review Request</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; }
            .header { background: linear-gradient(135deg, #f6ad55 0%, #ed8936 100%); padding: 40px 30px; text-align: center; }
            .logo { color: white; font-size: 28px; font-weight: bold; margin-bottom: 10px; }
            .header-text { color: white; font-size: 18px; opacity: 0.9; }
            .content { padding: 40px 30px; }
            .title { color: #1a202c; font-size: 24px; font-weight: bold; margin-bottom: 20px; }
            .review-card { background: #fffaf0; border-radius: 12px; padding: 24px; margin: 20px 0; border-left: 4px solid #f6ad55; }
            .stars { font-size: 24px; margin: 16px 0; }
            .cta-button { display: inline-block; background: linear-gradient(135deg, #f6ad55 0%, #ed8936 100%); color: white; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; font-size: 16px; }
            .footer { background: #f7fafc; padding: 30px; text-align: center; color: #718096; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🎨 Pixel-Pro</div>
              <div class="header-text">Professional Design & Development</div>
            </div>
            
            <div class="content">
              <h1 class="title">How was your experience? ⭐</h1>
              <p>Hi ${userName}, we hope you're thrilled with your completed project!</p>
              
              <div class="review-card">
                <h3>📋 ${projectTitle}</h3>
                <div class="stars">⭐⭐⭐⭐⭐</div>
                <p>Your feedback helps us improve and helps other clients choose Pixel-Pro with confidence.</p>
              </div>
              
              <p>Would you mind taking a moment to share your experience? It takes less than 2 minutes!</p>
              
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/reviews" class="cta-button">
                Leave a Review →
              </a>
              
              <p>Thank you for choosing Pixel-Pro. We appreciate your business and your feedback!</p>
            </div>
            
            <div class="footer">
              <p>© 2024 Pixel-Pro. All rights reserved.</p>
              <p>Your review helps us serve you and others better.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}

export const emailService = SendGridService.getInstance(); 