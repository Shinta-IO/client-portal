// Admin Supabase client using service role (bypasses RLS)
import { createClient } from '@supabase/supabase-js'

// Service role client for admin operations
export function createAdminSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // This bypasses RLS
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
} 