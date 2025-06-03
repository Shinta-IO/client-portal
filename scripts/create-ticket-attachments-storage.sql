-- Create storage bucket for support ticket screenshots/attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('ticket-attachments', 'ticket-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies for ticket-attachments bucket
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