-- Add image_url column to announcements table
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Update the column comment
COMMENT ON COLUMN announcements.image_url IS 'URL to the announcement thumbnail image stored in Supabase storage';

-- Show the updated table structure
\d announcements; 