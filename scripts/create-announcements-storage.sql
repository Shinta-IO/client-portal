-- Create storage bucket for announcements
INSERT INTO storage.buckets (id, name, public) 
VALUES ('announcements', 'announcements', true);

-- Allow public read access to announcements
CREATE POLICY "Public Access" ON storage.objects 
FOR SELECT USING (bucket_id = 'announcements');

-- Allow admins to upload/manage announcement files
CREATE POLICY "Admin Upload" ON storage.objects 
FOR INSERT WITH CHECK (
  bucket_id = 'announcements' AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);

-- Allow admins to update announcement files
CREATE POLICY "Admin Update" ON storage.objects 
FOR UPDATE USING (
  bucket_id = 'announcements' AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);

-- Allow admins to delete announcement files
CREATE POLICY "Admin Delete" ON storage.objects 
FOR DELETE USING (
  bucket_id = 'announcements' AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
); 