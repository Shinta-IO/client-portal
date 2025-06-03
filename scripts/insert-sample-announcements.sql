-- Insert sample announcements
-- First, we need to get an admin user ID for the admin_id field
-- You should replace 'YOUR_ADMIN_ID_HERE' with your actual admin user ID

-- Sample announcements matching the screenshot design
INSERT INTO announcements (admin_id, title, content, created_at) VALUES
(
  'user_2sFkn8E5lMnNVhFH1qSCNpJxrms', -- Replace with your admin ID
  'New Feature: Project Timeline View',
  'We''ve added a new timeline view to help you visualize project progress and deadlines more effectively.',
  '2025-05-08'::timestamp
),
(
  'user_2sFkn8E5lMnNVhFH1qSCNpJxrms', -- Replace with your admin ID
  'Upcoming Maintenance',
  'The system will be undergoing maintenance on May 15, 2025, from 2:00 AM to 4:00 AM UTC. Some features may be temporarily unavailable.',
  '2025-05-07'::timestamp
),
(
  'user_2sFkn8E5lMnNVhFH1qSCNpJxrms', -- Replace with your admin ID
  'New Integration: Stripe Payment Processing',
  'You can now process payments directly through our platform using Stripe integration.',
  '2025-05-05'::timestamp
);

-- Show the inserted announcements
SELECT 
  id,
  title,
  content,
  created_at
FROM announcements 
ORDER BY created_at DESC; 