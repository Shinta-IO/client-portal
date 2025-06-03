# Database Schema - Clerk Authentication Compatible

## Overview
This schema is designed to work with Clerk authentication, using TEXT-based user IDs instead of UUIDs. All tables use proper foreign key relationships and comprehensive RLS policies.

## Prerequisites
- Supabase project set up
- Clerk authentication configured
- Run migration scripts: `fix-user-id-types.sql` then `setup-rls-policies-clerk.sql`

## Core Tables

### 1. profiles
User profiles linked to Clerk authentication.

```sql
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
```

### 2. estimates
Project estimates and quotes with approval workflow.

```sql
CREATE TYPE public.estimate_status AS ENUM ('draft','pending','approved','rejected','finalized');

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
```

### 3. invoices
Invoices generated from approved estimates with Stripe integration.

```sql
CREATE TYPE public.invoice_status AS ENUM ('pending','paid','overdue');

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
```

### 4. projects
Active projects created from paid invoices.

```sql
CREATE TYPE public.project_status AS ENUM ('pending','active','completed');

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
```

### 5. tasks
Tasks within projects for tracking progress.

```sql
CREATE TYPE public.task_status AS ENUM ('pending','in_progress','completed');

CREATE TABLE public.tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  status      public.task_status NOT NULL DEFAULT 'pending',
  color       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 6. messages
Direct messaging between users and admins.

```sql
CREATE TABLE public.messages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id        TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id     TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content          TEXT,
  attachments_urls TEXT[] NOT NULL DEFAULT '{}',
  is_read          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 7. tickets
Support tickets for user assistance.

```sql
CREATE TYPE public.ticket_status AS ENUM ('pending','resolved');

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
```

### 8. reviews
Client reviews for completed projects.

```sql
CREATE TABLE public.reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id         TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  star_rating     INT NOT NULL CHECK (star_rating BETWEEN 1 AND 5),
  content         TEXT,
  would_recommend BOOLEAN NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 9. announcements
Admin announcements for all users.

```sql
CREATE TABLE public.announcements (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id   TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 10. recent_activity
Activity tracking for the community feed.

```sql
CREATE TYPE public.activity_type AS ENUM (
  'estimate_requested','estimate_finalized','estimate_approved',
  'invoice_created','invoice_paid','project_created','project_completed'
);

CREATE TABLE public.recent_activity (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_type        public.activity_type NOT NULL,
  activity_description TEXT,
  metadata             JSONB,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Workflow
1. **Estimate Request**: User creates estimate → Admin finalizes with price
2. **Estimate Approval**: User approves → Invoice automatically created with Stripe
3. **Payment**: User pays invoice → Project automatically created
4. **Project Work**: Admin manages tasks → Project completed
5. **Review**: User can leave review for completed project

## Key Features
- **Clerk Integration**: TEXT user IDs compatible with Clerk authentication
- **Stripe Integration**: Full payment processing with webhooks
- **Activity Tracking**: Real-time community activity feed
- **RLS Security**: Comprehensive Row Level Security policies
- **Admin Controls**: Separate permissions for admins vs users
- **File Management**: Support for screenshots, attachments, avatars

## Migration
Use the provided migration scripts:
1. `fix-user-id-types.sql` - Updates schema for Clerk compatibility
2. `setup-rls-policies-clerk.sql` - Sets up security policies

See `DATABASE_MIGRATION_GUIDE.md` for detailed instructions.
