-- Create storage buckets for the application

-- 1. Create announcements bucket (for announcement images)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('announcements', 'announcements', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Create ticket-attachments bucket (for support ticket screenshots)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('ticket-attachments', 'ticket-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Create project-screenshots bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('project-screenshots', 'project-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for announcements bucket
CREATE POLICY "announcements_public_read" ON storage.objects 
FOR SELECT USING (bucket_id = 'announcements');

CREATE POLICY "announcements_admin_insert" ON storage.objects 
FOR INSERT WITH CHECK (
  bucket_id = 'announcements' AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid()::text 
    AND profiles.is_admin = true
  )
);

CREATE POLICY "announcements_admin_update" ON storage.objects 
FOR UPDATE USING (
  bucket_id = 'announcements' AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid()::text 
    AND profiles.is_admin = true
  )
);

CREATE POLICY "announcements_admin_delete" ON storage.objects 
FOR DELETE USING (
  bucket_id = 'announcements' AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid()::text 
    AND profiles.is_admin = true
  )
);

-- Policies for ticket-attachments bucket
CREATE POLICY "ticket_attachments_public_read" ON storage.objects 
FOR SELECT USING (bucket_id = 'ticket-attachments');

CREATE POLICY "ticket_attachments_user_insert" ON storage.objects 
FOR INSERT WITH CHECK (
  bucket_id = 'ticket-attachments' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "ticket_attachments_user_update" ON storage.objects 
FOR UPDATE USING (
  bucket_id = 'ticket-attachments' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "ticket_attachments_user_delete" ON storage.objects 
FOR DELETE USING (
  bucket_id = 'ticket-attachments' AND
  auth.uid() IS NOT NULL
);

-- Policies for project-screenshots bucket (if not already exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'project_screenshots_public_read'
  ) THEN
    CREATE POLICY "project_screenshots_public_read" ON storage.objects 
    FOR SELECT USING (bucket_id = 'project-screenshots');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'project_screenshots_admin_insert'
  ) THEN
    CREATE POLICY "project_screenshots_admin_insert" ON storage.objects 
    FOR INSERT WITH CHECK (
      bucket_id = 'project-screenshots' AND
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid()::text 
        AND profiles.is_admin = true
      )
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'project_screenshots_admin_update'
  ) THEN
    CREATE POLICY "project_screenshots_admin_update" ON storage.objects 
    FOR UPDATE USING (
      bucket_id = 'project-screenshots' AND
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid()::text 
        AND profiles.is_admin = true
      )
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'project_screenshots_admin_delete'
  ) THEN
    CREATE POLICY "project_screenshots_admin_delete" ON storage.objects 
    FOR DELETE USING (
      bucket_id = 'project-screenshots' AND
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid()::text 
        AND profiles.is_admin = true
      )
    );
  END IF;
END $$; 