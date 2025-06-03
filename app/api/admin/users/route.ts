import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';

export async function GET() {
  console.log('API Route: /api/admin/users - GET request received');
  
  try {
    const user = await currentUser();
    console.log('Current user:', user ? { id: user.id, email: user.emailAddresses[0]?.emailAddress } : 'No user');
    
    if (!user) {
      console.log('No authenticated user found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const isAdmin = user.publicMetadata?.role === 'admin';
    console.log('User admin status:', isAdmin, 'publicMetadata:', user.publicMetadata);
    
    if (!isAdmin) {
      console.log('User is not admin, access denied');
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    console.log('Fetching users from Clerk...');
    
    // Fetch users from Clerk instead of Supabase
    const clerk = await clerkClient();
    const { data: clerkUsers } = await clerk.users.getUserList({
      limit: 100,
      orderBy: '-created_at'
    });

    console.log('Fetched users from Clerk:', clerkUsers.length);

    // Filter out admin users and format the response
    const nonAdminUsers = clerkUsers
      .filter(clerkUser => clerkUser.publicMetadata?.role !== 'admin')
      .map(clerkUser => ({
        id: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress || '',
        first_name: clerkUser.firstName || '',
        last_name: clerkUser.lastName || '',
        created_at: clerkUser.createdAt
      }));

    console.log('Non-admin users found:', nonAdminUsers.length);

    return NextResponse.json({
      users: nonAdminUsers
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 