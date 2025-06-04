import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const timestamp = new Date().toISOString();
    
    console.log('🧪 Webhook test endpoint called at:', timestamp);
    console.log('🧪 Request body length:', body.length);
    console.log('🧪 Request headers:', Object.fromEntries(request.headers.entries()));
    console.log('🧪 Request URL:', request.url);
    console.log('🧪 Request method:', request.method);
    
    // Try to parse as JSON if possible
    try {
      const jsonBody = JSON.parse(body);
      console.log('🧪 Parsed JSON body:', jsonBody);
    } catch (e) {
      console.log('🧪 Body is not JSON:', body.substring(0, 200));
    }
    
    return NextResponse.json({
      message: 'Webhook test endpoint working!',
      timestamp,
      received: true,
      bodyLength: body.length,
      url: request.url,
      headers: Object.fromEntries(request.headers.entries())
    });
  } catch (error) {
    console.error('🧪 Webhook test error:', error);
    return NextResponse.json({ error: 'Test webhook failed' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  console.log('🧪 Webhook test GET endpoint called at:', timestamp);
  
  return NextResponse.json({
    message: 'Webhook test endpoint is accessible',
    timestamp,
    url: request.url,
    method: 'GET'
  });
} 