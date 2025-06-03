# Debug: Finalize Button Not Showing

## Quick Checklist

### 1. Verify Admin Status
```sql
-- Check your admin status in Supabase SQL Editor
SELECT id, first_name, last_name, email, is_admin 
FROM profiles 
WHERE email = 'your-email@example.com';

-- If not admin, make yourself admin:
UPDATE profiles 
SET is_admin = true 
WHERE email = 'your-email@example.com';
```

### 2. Check for Pending Estimates
```sql
-- Check if you have any pending estimates
SELECT id, title, status, user_id, created_at 
FROM estimates 
WHERE status = 'pending'
ORDER BY created_at DESC;
```

### 3. Create a Test Pending Estimate
If you don't have any pending estimates, create one:

**As a regular user (non-admin):**
1. Go to `/estimates`
2. Click "New Estimate" 
3. Fill out the form (title, description, budget range)
4. Submit → This will create a `pending` estimate

**Or manually insert one:**
```sql
-- Insert a test pending estimate
INSERT INTO estimates (
  user_id, 
  title, 
  description, 
  price_min_cents, 
  price_max_cents, 
  status
) VALUES (
  'your-clerk-user-id',  -- Replace with your actual Clerk user ID
  'Test Website Project',
  'A test project to check finalize functionality',
  500000,  -- $5000
  800000,  -- $8000
  'pending'
);
```

### 4. Check Browser Console
1. Open browser dev tools (F12)
2. Go to Console tab
3. Look for any JavaScript errors
4. Check if the modal components are loading correctly

### 5. Verify Code Logic
The button should show when:
- `isAdmin = true` 
- `estimate.status = 'pending'`
- Logic: `canAdminFinalize = isAdmin && estimate.status === 'pending'`

### 6. Check Component Import
Make sure the import is working:
```typescript
import FinalizeEstimateModal from './FinalizeEstimateModal';
```

### 7. Force Refresh
- Clear browser cache (Ctrl+Shift+R)
- Restart dev server if needed
- Check if the file changes were applied

## Expected Button Location
The "Finalize Estimate" button should appear:
- **Where:** At the bottom of the EstimateDetailsModal
- **When:** Admin views a pending estimate
- **Color:** Blue button with edit icon
- **Text:** "Finalize Estimate"

## Debug Steps
1. ✅ Check admin status
2. ✅ Check for pending estimates  
3. ✅ Create test pending estimate if needed
4. ✅ Refresh browser/clear cache
5. ✅ Check browser console for errors
6. ✅ Verify button shows in EstimateDetailsModal 