import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';

// This would be your Supabase client
// import { createClient } from '@supabase/supabase-js';
// const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

export async function GET() {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Replace with actual Supabase query
    // First, try to get existing profile
    // const { data: profile, error } = await supabase
    //   .from('profiles')
    //   .select('*')
    //   .eq('id', user.id)
    //   .single();

    // If profile doesn't exist (error code PGRST116), create it
    // if (error && error.code === 'PGRST116') {
    //   const { data: newProfile, error: insertError } = await supabase
    //     .from('profiles')
    //     .insert({
    //       id: user.id,
    //       email: user.primaryEmailAddress?.emailAddress || '',
    //       first_name: user.firstName || '',
    //       last_name: user.lastName || '',
    //       avatar_url: user.imageUrl,
    //       is_admin: false, // Default to non-admin
    //     })
    //     .select()
    //     .single();

    //   if (insertError) {
    //     throw insertError;
    //   }

    //   return NextResponse.json({
    //     id: newProfile.id,
    //     email: newProfile.email,
    //     firstName: newProfile.first_name,
    //     lastName: newProfile.last_name,
    //     isAdmin: newProfile.is_admin,
    //     avatarUrl: newProfile.avatar_url,
    //     organization: newProfile.organization,
    //     phone: newProfile.phone,
    //     createdAt: newProfile.created_at,
    //   });
    // }

    // if (error) {
    //   throw error;
    // }

    // For now, return mock data
    const mockProfile = {
      id: user.id,
      email: user.primaryEmailAddress?.emailAddress || '',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      isAdmin: true, // This would come from the database
      avatarUrl: user.imageUrl,
      organization: null,
      phone: null,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json(mockProfile);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { email, firstName, lastName, organization, phone } = body;

    // TODO: Replace with actual Supabase insertion
    // const { data: profile, error } = await supabase
    //   .from('profiles')
    //   .upsert({
    //     id: user.id,
    //     email: email || user.primaryEmailAddress?.emailAddress,
    //     first_name: firstName || user.firstName,
    //     last_name: lastName || user.lastName,
    //     avatar_url: user.imageUrl,
    //     organization,
    //     phone,
    //     is_admin: false, // Default to non-admin
    //   })
    //   .select()
    //   .single();

    // if (error) {
    //   throw error;
    // }

    // For now, return mock created profile
    const mockProfile = {
      id: user.id,
      email: email || user.primaryEmailAddress?.emailAddress || '',
      firstName: firstName || user.firstName || '',
      lastName: lastName || user.lastName || '',
      isAdmin: false,
      avatarUrl: user.imageUrl,
      organization: organization || null,
      phone: phone || null,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json(mockProfile, { status: 201 });
  } catch (error) {
    console.error('Error creating user profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 