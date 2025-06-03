-- Setup RLS policies for Clerk authentication
-- Run this AFTER running fix-user-id-types.sql

-- 1. First, let's create a helper function to get current user's admin status
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid()::text AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. PROFILES POLICIES
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete" ON public.profiles;

-- Users can view their own profile, admins can view all
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (
    id = auth.uid()::text OR public.is_admin()
  );

-- Users can create their own profile
CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid()::text);

-- Users can update their own profile, admins can update any
CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE USING (
    id = auth.uid()::text OR public.is_admin()
  );

-- Only admins can delete profiles
CREATE POLICY "profiles_delete" ON public.profiles
  FOR DELETE USING (public.is_admin());

-- 3. ESTIMATES POLICIES
DROP POLICY IF EXISTS "estimates_select" ON public.estimates;
DROP POLICY IF EXISTS "estimates_insert" ON public.estimates;
DROP POLICY IF EXISTS "estimates_update" ON public.estimates;
DROP POLICY IF EXISTS "estimates_delete" ON public.estimates;

-- Users can view their own estimates, admins can view all
CREATE POLICY "estimates_select" ON public.estimates
  FOR SELECT USING (
    user_id = auth.uid()::text OR public.is_admin()
  );

-- Users can create their own estimates, admins can create for anyone
CREATE POLICY "estimates_insert" ON public.estimates
  FOR INSERT WITH CHECK (
    user_id = auth.uid()::text OR public.is_admin()
  );

-- Users can update their own draft estimates, admins can update any
CREATE POLICY "estimates_update" ON public.estimates
  FOR UPDATE USING (
    (user_id = auth.uid()::text AND status IN ('draft', 'pending')) OR public.is_admin()
  );

-- Only admins can delete estimates
CREATE POLICY "estimates_delete" ON public.estimates
  FOR DELETE USING (public.is_admin());

-- 4. INVOICES POLICIES
DROP POLICY IF EXISTS "invoices_select" ON public.invoices;
DROP POLICY IF EXISTS "invoices_insert" ON public.invoices;
DROP POLICY IF EXISTS "invoices_update" ON public.invoices;
DROP POLICY IF EXISTS "invoices_delete" ON public.invoices;

-- Users can view their own invoices, admins can view all
CREATE POLICY "invoices_select" ON public.invoices
  FOR SELECT USING (
    user_id = auth.uid()::text OR public.is_admin()
  );

-- Only admins can create invoices (generated from approved estimates)
CREATE POLICY "invoices_insert" ON public.invoices
  FOR INSERT WITH CHECK (public.is_admin());

-- Admins can update invoices, users can't (payment status updated via webhooks)
CREATE POLICY "invoices_update" ON public.invoices
  FOR UPDATE USING (public.is_admin());

-- Only admins can delete invoices
CREATE POLICY "invoices_delete" ON public.invoices
  FOR DELETE USING (public.is_admin());

-- 5. PROJECTS POLICIES
DROP POLICY IF EXISTS "projects_select" ON public.projects;
DROP POLICY IF EXISTS "projects_insert" ON public.projects;
DROP POLICY IF EXISTS "projects_update" ON public.projects;
DROP POLICY IF EXISTS "projects_delete" ON public.projects;

-- Users can view their own projects, admins can view all
CREATE POLICY "projects_select" ON public.projects
  FOR SELECT USING (
    user_id = auth.uid()::text OR public.is_admin()
  );

-- Only admins can create projects (from paid invoices)
CREATE POLICY "projects_insert" ON public.projects
  FOR INSERT WITH CHECK (public.is_admin());

-- Only admins can update projects
CREATE POLICY "projects_update" ON public.projects
  FOR UPDATE USING (public.is_admin());

-- Only admins can delete projects
CREATE POLICY "projects_delete" ON public.projects
  FOR DELETE USING (public.is_admin());

-- 6. TASKS POLICIES
DROP POLICY IF EXISTS "tasks_select" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete" ON public.tasks;

-- Users can view tasks for their own projects, admins can view all
CREATE POLICY "tasks_select" ON public.tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE id = tasks.project_id 
      AND (user_id = auth.uid()::text OR public.is_admin())
    )
  );

-- Only admins can create tasks
CREATE POLICY "tasks_insert" ON public.tasks
  FOR INSERT WITH CHECK (public.is_admin());

-- Only admins can update tasks
CREATE POLICY "tasks_update" ON public.tasks
  FOR UPDATE USING (public.is_admin());

-- Only admins can delete tasks
CREATE POLICY "tasks_delete" ON public.tasks
  FOR DELETE USING (public.is_admin());

-- 7. MESSAGES POLICIES
DROP POLICY IF EXISTS "messages_select" ON public.messages;
DROP POLICY IF EXISTS "messages_insert" ON public.messages;
DROP POLICY IF EXISTS "messages_update" ON public.messages;
DROP POLICY IF EXISTS "messages_delete" ON public.messages;

-- Users can view messages they sent or received
CREATE POLICY "messages_select" ON public.messages
  FOR SELECT USING (
    sender_id = auth.uid()::text OR recipient_id = auth.uid()::text OR public.is_admin()
  );

-- Users can send messages
CREATE POLICY "messages_insert" ON public.messages
  FOR INSERT WITH CHECK (sender_id = auth.uid()::text);

-- Users can update their own messages (mark as read), admins can update any
CREATE POLICY "messages_update" ON public.messages
  FOR UPDATE USING (
    sender_id = auth.uid()::text OR recipient_id = auth.uid()::text OR public.is_admin()
  );

-- Only admins can delete messages
CREATE POLICY "messages_delete" ON public.messages
  FOR DELETE USING (public.is_admin());

-- 8. TICKETS POLICIES
DROP POLICY IF EXISTS "tickets_select" ON public.tickets;
DROP POLICY IF EXISTS "tickets_insert" ON public.tickets;
DROP POLICY IF EXISTS "tickets_update" ON public.tickets;
DROP POLICY IF EXISTS "tickets_delete" ON public.tickets;

-- Users can view their own tickets, admins can view all
CREATE POLICY "tickets_select" ON public.tickets
  FOR SELECT USING (
    user_id = auth.uid()::text OR public.is_admin()
  );

-- Users can create their own tickets
CREATE POLICY "tickets_insert" ON public.tickets
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);

-- Users can update their own open tickets, admins can update any
CREATE POLICY "tickets_update" ON public.tickets
  FOR UPDATE USING (
    (user_id = auth.uid()::text AND status = 'pending') OR public.is_admin()
  );

-- Only admins can delete tickets
CREATE POLICY "tickets_delete" ON public.tickets
  FOR DELETE USING (public.is_admin());

-- 9. REVIEWS POLICIES
DROP POLICY IF EXISTS "reviews_select" ON public.reviews;
DROP POLICY IF EXISTS "reviews_insert" ON public.reviews;
DROP POLICY IF EXISTS "reviews_update" ON public.reviews;
DROP POLICY IF EXISTS "reviews_delete" ON public.reviews;

-- All authenticated users can view reviews
CREATE POLICY "reviews_select" ON public.reviews
  FOR SELECT USING (true);

-- Users can create reviews for their own completed projects
CREATE POLICY "reviews_insert" ON public.reviews
  FOR INSERT WITH CHECK (
    user_id = auth.uid()::text AND 
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE id = reviews.project_id 
      AND user_id = auth.uid()::text 
      AND status = 'completed'
    )
  );

-- Users can update their own reviews
CREATE POLICY "reviews_update" ON public.reviews
  FOR UPDATE USING (user_id = auth.uid()::text OR public.is_admin());

-- Users can delete their own reviews, admins can delete any
CREATE POLICY "reviews_delete" ON public.reviews
  FOR DELETE USING (user_id = auth.uid()::text OR public.is_admin());

-- 10. ANNOUNCEMENTS POLICIES
DROP POLICY IF EXISTS "announcements_select" ON public.announcements;
DROP POLICY IF EXISTS "announcements_insert" ON public.announcements;
DROP POLICY IF EXISTS "announcements_update" ON public.announcements;
DROP POLICY IF EXISTS "announcements_delete" ON public.announcements;

-- All authenticated users can view announcements
CREATE POLICY "announcements_select" ON public.announcements
  FOR SELECT USING (true);

-- Only admins can create announcements
CREATE POLICY "announcements_insert" ON public.announcements
  FOR INSERT WITH CHECK (public.is_admin());

-- Only admins can update announcements
CREATE POLICY "announcements_update" ON public.announcements
  FOR UPDATE USING (public.is_admin());

-- Only admins can delete announcements
CREATE POLICY "announcements_delete" ON public.announcements
  FOR DELETE USING (public.is_admin());

-- 11. RECENT ACTIVITY POLICIES
DROP POLICY IF EXISTS "activity_select" ON public.recent_activity;
DROP POLICY IF EXISTS "activity_insert" ON public.recent_activity;
DROP POLICY IF EXISTS "activity_update" ON public.recent_activity;
DROP POLICY IF EXISTS "activity_delete" ON public.recent_activity;

-- All authenticated users can view activity (for activity feed)
CREATE POLICY "activity_select" ON public.recent_activity
  FOR SELECT USING (true);

-- System can insert activity (through admin APIs)
CREATE POLICY "activity_insert" ON public.recent_activity
  FOR INSERT WITH CHECK (true);

-- Only admins can update activity
CREATE POLICY "activity_update" ON public.recent_activity
  FOR UPDATE USING (public.is_admin());

-- Only admins can delete activity
CREATE POLICY "activity_delete" ON public.recent_activity
  FOR DELETE USING (public.is_admin());

-- 12. Grant permissions to service role for admin operations
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

SELECT 'RLS policies updated for Clerk authentication successfully!' as result; 