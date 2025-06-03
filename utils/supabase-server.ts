// Server-side Supabase utilities for API routes and server components (No JWT Template)
import { createClient } from '@supabase/supabase-js'

// Server-side Supabase client for API routes - simplified approach
export function createServerSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
} 