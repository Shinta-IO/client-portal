import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { emailService } from '@/services/email/sendgrid';

// Use service role for messaging operations
function createServiceSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET - Fetch messages for current user
export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceSupabaseClient();

    // Get messages where user is either sender or recipient
    const { data: messages, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:sender_id (
          first_name,
          last_name,
          email
        ),
        recipient:recipient_id (
          first_name,
          last_name,
          email
        )
      `)
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      );
    }

    return NextResponse.json(messages);
  } catch (error) {
    console.error('Error in GET /api/messages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Send a new message
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { recipient_id, content, attachments_urls = [] } = body;

    if (!recipient_id || !content) {
      return NextResponse.json(
        { error: 'Recipient ID and content are required' },
        { status: 400 }
      );
    }

    const supabase = createServiceSupabaseClient();

    // Create the message
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        sender_id: userId,
        recipient_id,
        content: content.trim(),
        attachments_urls,
        is_read: false
      })
      .select(`
        *,
        sender:sender_id (
          first_name,
          last_name,
          email
        ),
        recipient:recipient_id (
          first_name,
          last_name,
          email
        )
      `)
      .single();

    if (error) {
      console.error('Error creating message:', error);
      return NextResponse.json(
        { error: 'Failed to send message' },
        { status: 500 }
      );
    }

    // Send new message email notification (async, don't wait)
    try {
      const recipientProfile = Array.isArray(message.recipient) ? message.recipient[0] : message.recipient;
      const senderProfile = Array.isArray(message.sender) ? message.sender[0] : message.sender;
      
      if (recipientProfile?.email && senderProfile) {
        const recipientName = `${recipientProfile.first_name} ${recipientProfile.last_name}`.trim();
        const senderName = `${senderProfile.first_name} ${senderProfile.last_name}`.trim();
        const messagePreview = content.trim().length > 100 
          ? content.trim().substring(0, 100) 
          : content.trim();

        emailService.sendNewMessageEmail(
          recipientProfile.email,
          recipientName,
          senderName,
          messagePreview
        ).catch(error => console.error('New message email sending failed:', error));
      }
    } catch (emailError) {
      console.error('New message email service error:', emailError);
    }

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/messages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Mark message as read
export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { messageId } = body;

    if (!messageId) {
      return NextResponse.json(
        { error: 'Message ID is required' },
        { status: 400 }
      );
    }

    const supabase = createServiceSupabaseClient();

    // Update message as read (only if user is the recipient)
    const { data: message, error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('id', messageId)
      .eq('recipient_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating message:', error);
      return NextResponse.json(
        { error: 'Failed to mark message as read' },
        { status: 500 }
      );
    }

    return NextResponse.json(message);
  } catch (error) {
    console.error('Error in PUT /api/messages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 