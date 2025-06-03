import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { emailService } from '@/services/email/sendgrid';

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { email, userName } = body;

    if (!email || !userName) {
      return NextResponse.json({ error: 'Email and userName are required' }, { status: 400 });
    }

    // Send welcome email
    try {
      const success = await emailService.sendWelcomeEmail(email, userName);
      
      if (success) {
        return NextResponse.json({ 
          success: true,
          message: `Welcome email sent to ${email}`
        });
      } else {
        return NextResponse.json({ 
          success: false,
          error: 'Failed to send welcome email'
        }, { status: 500 });
      }
    } catch (emailError) {
      console.error('Welcome email error:', emailError);
      return NextResponse.json({ 
        success: false,
        error: 'Email service error',
        details: emailError instanceof Error ? emailError.message : 'Unknown email error'
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