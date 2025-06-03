-- Fix user_id types to work with Clerk authentication
-- Run this in your Supabase SQL Editor

-- 0. Enable required extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Create all required enum types
DO $$ 
BEGIN
    -- Create estimate_status enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estimate_status') THEN
        CREATE TYPE public.estimate_status AS ENUM ('draft','pending','approved','rejected','finalized');
    END IF;
    
    -- Create invoice_status enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_status') THEN
        CREATE TYPE public.invoice_status AS ENUM ('pending','paid','overdue');
    END IF;
    
    -- Create project_status enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_status') THEN
        CREATE TYPE public.project_status AS ENUM ('pending','active','completed');
    END IF;
    
    -- Create task_status enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
        CREATE TYPE public.task_status AS ENUM ('pending','in_progress','completed');
    END IF;
    
    -- Create ticket_status enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_status') THEN
        CREATE TYPE public.ticket_status AS ENUM ('pending','resolved');
    END IF;
    
    -- Create activity_type enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'activity_type') THEN
        CREATE TYPE public.activity_type AS ENUM (
          'estimate_requested','estimate_finalized','estimate_approved',
          'invoice_created','invoice_paid','project_created','project_completed'
        );
    END IF;
END $$;

-- 2. Drop existing foreign key constraints and indexes that reference user_id as UUID
ALTER TABLE public.estimates DROP CONSTRAINT IF EXISTS estimates_user_id_fkey;
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_user_id_fkey;
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_user_id_fkey;
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_recipient_id_fkey;
ALTER TABLE public.tickets DROP CONSTRAINT IF EXISTS tickets_user_id_fkey;
ALTER TABLE public.tickets DROP CONSTRAINT IF EXISTS tickets_admin_id_fkey;
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_user_id_fkey;
ALTER TABLE public.announcements DROP CONSTRAINT IF EXISTS announcements_admin_id_fkey;
ALTER TABLE public.recent_activity DROP CONSTRAINT IF EXISTS recent_activity_user_id_fkey;

-- 3. Change profiles table to use TEXT for id (Clerk user IDs)
-- First, we need to handle existing data if any exists
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 4. Recreate profiles table with TEXT id
CREATE TABLE public.profiles (
  id TEXT PRIMARY KEY, -- Clerk user ID like "user_2wsXGoLSybK37J7dbGVghKi9ghV"
  first_name TEXT NOT NULL,
  last_name  TEXT NOT NULL,
  email      TEXT NOT NULL UNIQUE,
  phone      TEXT,
  avatar_url TEXT,
  organization TEXT,
  is_admin   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Update all related tables to use TEXT for user_id fields
-- Drop and recreate tables to avoid migration complexity

-- Estimates table
DROP TABLE IF EXISTS public.estimates CASCADE;
CREATE TABLE public.estimates (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  description      TEXT,
  price_min_cents  INTEGER,
  price_max_cents  INTEGER,
  final_price_cents INTEGER,
  tax_rate         NUMERIC(5,2) DEFAULT 0,
  timeline         TEXT,
  status           public.estimate_status NOT NULL DEFAULT 'draft',
  finalized_at     TIMESTAMPTZ,
  approved_by_user BOOLEAN NOT NULL DEFAULT FALSE,
  screenshots_urls TEXT[] NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Invoices table
DROP TABLE IF EXISTS public.invoices CASCADE;
CREATE TABLE public.invoices (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id              UUID NOT NULL REFERENCES public.estimates(id) ON DELETE CASCADE,
  user_id                  TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invoice_pdf_url          TEXT,
  final_price_cents        INTEGER NOT NULL,
  tax_rate                 NUMERIC(5,2) NOT NULL DEFAULT 0,
  status                   public.invoice_status NOT NULL DEFAULT 'pending',
  payment_url              TEXT,
  stripe_payment_intent_id TEXT,
  due_date                 TIMESTAMPTZ,
  paid_at                  TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Projects table
DROP TABLE IF EXISTS public.projects CASCADE;
CREATE TABLE public.projects (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id       UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  user_id          TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  description      TEXT,
  deadline         TIMESTAMPTZ,
  status           public.project_status NOT NULL DEFAULT 'pending',
  screenshots_urls TEXT[] NOT NULL DEFAULT '{}',
  live_preview_url TEXT,
  repo_url         TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tasks table (references projects, so it should be fine)
DROP TABLE IF EXISTS public.tasks CASCADE;
CREATE TABLE public.tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  status      public.task_status NOT NULL DEFAULT 'pending',
  color       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Messages table
DROP TABLE IF EXISTS public.messages CASCADE;
CREATE TABLE public.messages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id        TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id     TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content          TEXT,
  attachments_urls TEXT[] NOT NULL DEFAULT '{}',
  is_read          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tickets table
DROP TABLE IF EXISTS public.tickets CASCADE;
CREATE TABLE public.tickets (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  admin_id         TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  title            TEXT NOT NULL,
  description      TEXT,
  status           public.ticket_status NOT NULL DEFAULT 'pending',
  response         TEXT,
  response_at      TIMESTAMPTZ,
  attachments_urls TEXT[] NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Reviews table
DROP TABLE IF EXISTS public.reviews CASCADE;
CREATE TABLE public.reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id         TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  star_rating     INT NOT NULL CHECK (star_rating BETWEEN 1 AND 5),
  content         TEXT,
  would_recommend BOOLEAN NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Announcements table
DROP TABLE IF EXISTS public.announcements CASCADE;
CREATE TABLE public.announcements (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id   TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Recent activity table
DROP TABLE IF EXISTS public.recent_activity CASCADE;
CREATE TABLE public.recent_activity (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_type        public.activity_type NOT NULL,
  activity_description TEXT,
  metadata             JSONB,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Recreate indexes for performance
CREATE INDEX IF NOT EXISTS idx_estimates_user_id ON public.estimates(user_id);
CREATE INDEX IF NOT EXISTS idx_estimates_status ON public.estimates(status);
CREATE INDEX IF NOT EXISTS idx_estimates_created_at ON public.estimates(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_estimate_id ON public.invoices(estimate_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_invoice_id ON public.projects(invoice_id);

CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);

CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON public.messages(recipient_id);

CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON public.tickets(user_id);

CREATE INDEX IF NOT EXISTS idx_reviews_project_id ON public.reviews(project_id);

CREATE INDEX IF NOT EXISTS idx_recent_activity_user_id ON public.recent_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_recent_activity_created_at ON public.recent_activity(created_at DESC);

-- 7. Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- 8. Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recent_activity ENABLE ROW LEVEL SECURITY;

-- 9. Add comments for clarity
COMMENT ON TABLE public.profiles IS 'User profiles linked to Clerk authentication';
COMMENT ON COLUMN public.profiles.id IS 'Clerk user ID (string format like user_xxx)';
COMMENT ON TABLE public.estimates IS 'Project estimates and quotes with approval workflow';
COMMENT ON TABLE public.invoices IS 'Invoices generated from approved estimates';
COMMENT ON TABLE public.projects IS 'Active projects created from paid invoices';

SELECT 'Database schema updated to use Clerk user IDs successfully!' as result; 