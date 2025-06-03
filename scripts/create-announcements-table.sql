-- Create announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon_url TEXT, -- URL for the announcement icon/image
  announcement_type TEXT NOT NULL DEFAULT 'general', -- 'feature', 'maintenance', 'integration', 'general'
  priority INTEGER DEFAULT 1, -- 1=low, 2=medium, 3=high
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  published_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  expires_at TIMESTAMP WITH TIME ZONE -- Optional expiration date
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_announcements_active_published ON announcements(is_active, published_at);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON announcements(created_at);
CREATE INDEX IF NOT EXISTS idx_announcements_priority ON announcements(priority);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE
    ON announcements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample announcements
INSERT INTO announcements (title, description, icon_url, announcement_type, priority) VALUES
(
  'New Feature: Project Timeline View',
  'We''ve added a new timeline view to help you visualize project progress and deadlines more effectively.',
  '/announcements/timeline-icon.png',
  'feature',
  2
),
(
  'Upcoming Maintenance',
  'The system will be undergoing maintenance on May 15, 2025, from 2:00 AM to 4:00 AM UTC. Some features may be temporarily unavailable.',
  '/announcements/maintenance-icon.png', 
  'maintenance',
  3
),
(
  'New Integration: Stripe Payment Processing',
  'You can now process payments directly through our platform using Stripe integration.',
  '/announcements/stripe-icon.png',
  'integration',
  2
);

-- Enable RLS (Row Level Security) - announcements are publicly readable
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read active announcements
CREATE POLICY "Announcements are publicly readable" ON announcements
  FOR SELECT USING (is_active = true AND published_at <= now() AND (expires_at IS NULL OR expires_at > now()));

-- Allow admins to manage all announcements
CREATE POLICY "Admins can manage all announcements" ON announcements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  ); 