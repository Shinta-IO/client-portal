import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { emailService } from '@/services/email/sendgrid';

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const isAdmin = user.publicMetadata?.role === 'admin';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Access denied - admin only' }, { status: 403 });
    }

    const body = await request.json();
    const { testType, recipientEmail } = body;

    if (!recipientEmail) {
      return NextResponse.json({ error: 'Recipient email is required' }, { status: 400 });
    }

    // Check if SendGrid is configured
    if (!process.env.SENDGRID_API_KEY) {
      return NextResponse.json({ 
        error: 'SendGrid not configured', 
        details: 'SENDGRID_API_KEY environment variable is missing' 
      }, { status: 500 });
    }

    try {
      let success = false;
      let emailType = '';

      switch (testType) {
        case 'welcome':
          success = await emailService.sendWelcomeEmail(
            recipientEmail,
            'Test User'
          );
          emailType = 'Welcome Email';
          break;

        case 'project_created':
          success = await emailService.sendProjectCreatedEmail(
            recipientEmail,
            'Test User',
            'Test Project - SendGrid Integration Check',
            'This is a test email to verify SendGrid integration is working correctly.',
            '2024-12-31'
          );
          emailType = 'Project Created';
          break;
          
        case 'project_completed':
          success = await emailService.sendProjectCompletedEmail(
            recipientEmail,
            'Test User',
            'Test Project - SendGrid Integration Check',
            'This is a test email to verify SendGrid integration is working correctly.'
          );
          emailType = 'Project Completed';
          break;

        case 'invoice_created':
          success = await emailService.sendInvoiceCreatedEmail(
            recipientEmail,
            'Test User',
            'Test Website Design Project',
            25000, // $250.00
            'https://example.com/invoice/test'
          );
          emailType = 'Invoice Created';
          break;

        case 'payment_confirmation':
          success = await emailService.sendPaymentConfirmationEmail(
            recipientEmail,
            'Test User',
            'Test Website Design Project',
            25000, // $250.00
            'pi_test_1234567890'
          );
          emailType = 'Payment Confirmation';
          break;

        case 'estimate_created':
          success = await emailService.sendEstimateCreatedEmail(
            recipientEmail,
            'Test User',
            'Test Website Design Project',
            'A modern, responsive website with custom design and user-friendly interface.',
            25000, // $250.00
            'https://example.com/estimate/test'
          );
          emailType = 'Estimate Created';
          break;

        case 'new_message':
          success = await emailService.sendNewMessageEmail(
            recipientEmail,
            'Test User',
            'Pixel-Pro Team',
            'Hi! We have some updates about your project and would like to discuss the next steps...'
          );
          emailType = 'New Message';
          break;

        case 'review_request':
          success = await emailService.sendReviewRequestEmail(
            recipientEmail,
            'Test User',
            'Test Website Design Project'
          );
          emailType = 'Review Request';
          break;
          
        default:
          return NextResponse.json({ 
            error: 'Invalid test type. Available types: welcome, project_created, project_completed, invoice_created, payment_confirmation, estimate_created, new_message, review_request' 
          }, { status: 400 });
      }

      if (success) {
        return NextResponse.json({ 
          success: true,
          message: `${emailType} test email sent successfully to ${recipientEmail}`,
          testType,
          recipientEmail
        });
      } else {
        return NextResponse.json({ 
          success: false,
          error: 'Email sending failed',
          testType,
          recipientEmail
        }, { status: 500 });
      }

    } catch (emailError) {
      console.error('SendGrid test error:', emailError);
      return NextResponse.json({ 
        success: false,
        error: 'SendGrid error',
        details: emailError instanceof Error ? emailError.message : 'Unknown email error',
        testType,
        recipientEmail
      }, { status: 500 });
    }

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 