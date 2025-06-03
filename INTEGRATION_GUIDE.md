# Modern Clerk + Supabase Integration Guide (2025)

## 🚨 **Important: JWT Templates are Deprecated!**

As of April 1st, 2025, Clerk JWT templates are deprecated. This guide uses the **new native integration** which is much simpler and more reliable.

## 🎯 **Step 1: Set up Clerk as Third-Party Auth Provider in Supabase**

### 1.1 Enable Clerk Integration in Clerk Dashboard
1. Go to your [Clerk Dashboard](https://dashboard.clerk.com)
2. Navigate to **Integrations** → **Supabase** 
3. Click **"Activate Supabase integration"**
4. This automatically adds the `"role": "authenticated"` claim to all JWTs
5. **Copy the "Clerk domain"** that appears (e.g., `your-app-12345.clerk.accounts.dev`)

### 1.2 Add Clerk as Provider in Supabase
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to **Authentication** → **Sign In / Up**
3. Click **"Add provider"** and select **"Clerk"**
4. Paste your **Clerk domain** from Step 1.1
5. Click **Save**

## 🎯 **Step 2: Update Your Database Schema**

Run this in Supabase SQL Editor:

```sql
-- Update your profiles table to use TEXT for Clerk user IDs
ALTER TABLE profiles 
ALTER COLUMN id TYPE TEXT;

-- Update RLS policies to use auth.jwt()
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT TO authenticated 
  USING (auth.jwt() ->> 'sub' = id);

-- Create any missing tables you need
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT (auth.jwt() ->> 'sub'),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own projects" ON projects
  FOR SELECT TO authenticated 
  USING (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can create own projects" ON projects
  FOR INSERT TO authenticated 
  WITH CHECK (auth.jwt() ->> 'sub' = user_id);
```

## 🎯 **Step 3: Update Your Supabase Client**

Update your Supabase client to use the native integration:

```typescript
// utils/supabase.ts
import { createClient } from '@supabase/supabase-js'
import { useSession } from '@clerk/nextjs'

// Client-side Supabase client with native Clerk integration
export function createClerkSupabaseClient() {
  const { session } = useSession()
  
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      async accessToken() {
        return session?.getToken() ?? null
      },
    },
  )
}

// Server-side client
import { auth } from '@clerk/nextjs/server'

export function createServerSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      async accessToken() {
        return (await auth()).getToken()
      },
    },
  )
}
```

## 🎯 **Step 4: Update Your Auth Utilities**

```typescript
// utils/auth.tsx
'use client'
import { useUser } from '@clerk/nextjs'
import { createClerkSupabaseClient } from './supabase'
import { useEffect, useState } from 'react'

export function useUserProfile() {
  const { user, isLoaded } = useUser()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoaded || !user) {
      setLoading(false)
      return
    }

    // Check admin status from Clerk's public metadata
    const role = user.publicMetadata?.role as string
    setIsAdmin(role === 'admin')
    setLoading(false)
  }, [user, isLoaded])

  return {
    user,
    isAdmin,
    loading,
    isLoaded
  }
}

export function AdminOnly({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useUserProfile()
  
  if (loading) return null
  if (!isAdmin) return null
  
  return <>{children}</>
}

export function UserOnly({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useUserProfile()
  
  if (loading) return null
  if (isAdmin) return null
  
  return <>{children}</>
}
```

## 🎯 **Step 5: Promote User to Admin**

### Option A: Using Clerk Dashboard
1. Go to **Users** in Clerk Dashboard
2. Click on a user
3. Go to **Metadata** tab
4. In **Public metadata**, add:
```json
{
  "role": "admin"
}
```

### Option B: Using API Route
```typescript
// api/admin/promote-user.ts
import { clerkClient } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json()
    
    const client = await clerkClient()
    await client.users.updateUser(userId, {
      publicMetadata: { role: 'admin' }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to promote user' }, { status: 500 })
  }
}
```

## 🎯 **Step 6: Test the Integration**

1. **Sign in to your app**
2. **Check the Supabase logs** - you should see authenticated requests
3. **Try creating/viewing data** - it should work seamlessly
4. **Promote yourself to admin** using one of the methods above
5. **Test admin-only features**

## ✅ **Benefits of Native Integration**

- ✅ **No JWT templates needed**
- ✅ **No sharing JWT secrets**
- ✅ **Automatic token refresh**
- ✅ **Better security**
- ✅ **Simpler setup**
- ✅ **Future-proof** (no deprecation warnings)

## 🚀 **Ready to Go!**

Your Clerk + Supabase integration is now using the modern native approach. No more JWT template errors, no more reserved claim issues, and much simpler to maintain! 