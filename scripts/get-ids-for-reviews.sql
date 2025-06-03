-- Script to get actual user and project IDs for testing reviews

-- 1. Get your user ID (replace with your email)
SELECT 
    'Your User ID:' as info,
    id as user_id,
    email,
    first_name,
    last_name
FROM profiles 
WHERE email = 'your-email@example.com' -- REPLACE WITH YOUR EMAIL
LIMIT 1;

-- 2. Get existing completed projects for that user
SELECT 
    'Completed Projects:' as info,
    p.id as project_id,
    p.title,
    p.status,
    p.user_id,
    p.created_at
FROM projects p
WHERE p.user_id = (SELECT id FROM profiles WHERE email = 'your-email@example.com' LIMIT 1) -- REPLACE WITH YOUR EMAIL
  AND p.status = 'completed'
ORDER BY p.created_at DESC;

-- 3. Check existing reviews to avoid duplicates
SELECT 
    'Existing Reviews:' as info,
    r.id,
    r.star_rating,
    r.content,
    p.title as project_title
FROM reviews r
JOIN projects p ON r.project_id = p.id
WHERE r.user_id = (SELECT id FROM profiles WHERE email = 'your-email@example.com' LIMIT 1) -- REPLACE WITH YOUR EMAIL
ORDER BY r.created_at DESC;

-- 4. Create a sample project if none exist (optional)
-- Uncomment and modify the following if you need to create test projects:

/*
INSERT INTO projects (
    id,
    user_id,
    title,
    description,
    status,
    created_at,
    updated_at
) VALUES 
(gen_random_uuid(), 
 (SELECT id FROM profiles WHERE email = 'your-email@example.com' LIMIT 1), -- REPLACE WITH YOUR EMAIL
 'Sample Completed Project 1', 
 'A test project for review testing', 
 'completed', 
 NOW() - INTERVAL '1 month', 
 NOW() - INTERVAL '2 weeks'),
(gen_random_uuid(), 
 (SELECT id FROM profiles WHERE email = 'your-email@example.com' LIMIT 1), -- REPLACE WITH YOUR EMAIL
 'Sample Completed Project 2', 
 'Another test project for review testing', 
 'completed', 
 NOW() - INTERVAL '2 months', 
 NOW() - INTERVAL '1 month'),
(gen_random_uuid(), 
 (SELECT id FROM profiles WHERE email = 'your-email@example.com' LIMIT 1), -- REPLACE WITH YOUR EMAIL
 'Sample Completed Project 3', 
 'Third test project for review testing', 
 'completed', 
 NOW() - INTERVAL '3 months', 
 NOW() - INTERVAL '2 months');
*/ 