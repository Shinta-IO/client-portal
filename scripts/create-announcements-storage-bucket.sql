-- Create storage bucket for announcements images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('announcements', 'announcements', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies for announcements bucket with unique names
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