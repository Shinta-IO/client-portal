// Simple Clerk + Supabase Integration (No JWT Template Required)
import { createClient } from '@supabase/supabase-js'

// Client-side Supabase client - simplified approach
export function createClerkSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Type definitions
export interface Profile {
  id: string
  email: string
  first_name: string
  last_name: string
  is_admin: boolean
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  user_id: string
  title: string
  description: string
  status: string
  created_at: string
  updated_at: string
  tasks?: Task[]
}

export interface Task {
  id: string
  project_id: string
  title: string
  description: string
  status: string
  deadline: string | null
  created_at: string
  updated_at: string
}

// Database types
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>
      }
      projects: {
        Row: Project
        Insert: Omit<Project, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Project, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
      }
    }
  }
} 