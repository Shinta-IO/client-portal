# Row Level Security (RLS) Guide - Clerk Authentication

## Overview
This guide covers the Row Level Security policies implemented for the Pixel Portal application using Clerk authentication. All policies are designed to work with TEXT-based user IDs from Clerk.

## Security Model

### User Types
- **Regular Users**: Can access their own data
- **Admins**: Have elevated permissions for management tasks
- **System**: Service role for admin operations and webhooks

### Admin Detection
A helper function determines admin status:

```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid()::text AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Table-Specific Policies

### 1. Profiles
- **SELECT**: Users see own profile, admins see all
- **INSERT**: Users can create own profile
- **UPDATE**: Users update own profile, admins update any
- **DELETE**: Only admins can delete profiles

```sql
-- Users can view their own profile, admins can view all
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (
    id = auth.uid()::text OR public.is_admin()
  );
```

### 2. Estimates
- **SELECT**: Users see own estimates, admins see all
- **INSERT**: Users create own estimates, admins create for anyone
- **UPDATE**: Users update own draft/pending estimates, admins update any
- **DELETE**: Only admins can delete estimates

### 3. Invoices
- **SELECT**: Users see own invoices, admins see all
- **INSERT**: Only admins can create invoices (from approved estimates)
- **UPDATE**: Only admins can update invoices (payment status via webhooks)
- **DELETE**: Only admins can delete invoices

### 4. Projects
- **SELECT**: Users see own projects, admins see all
- **INSERT**: Only admins can create projects (from paid invoices)
- **UPDATE**: Only admins can update projects
- **DELETE**: Only admins can delete projects

### 5. Tasks
- **SELECT**: Users see tasks for their own projects, admins see all
- **INSERT/UPDATE/DELETE**: Only admins can manage tasks

### 6. Messages
- **SELECT**: Users see messages they sent/received, admins see all
- **INSERT**: Users can send messages
- **UPDATE**: Users can update their own messages, admins update any
- **DELETE**: Only admins can delete messages

### 7. Tickets
- **SELECT**: Users see own tickets, admins see all
- **INSERT**: Users can create own tickets
- **UPDATE**: Users update own pending tickets, admins update any
- **DELETE**: Only admins can delete tickets

### 8. Reviews
- **SELECT**: All authenticated users can view reviews
- **INSERT**: Users can review their own completed projects
- **UPDATE**: Users update own reviews, admins update any
- **DELETE**: Users delete own reviews, admins delete any

### 9. Announcements
- **SELECT**: All authenticated users can view announcements
- **INSERT/UPDATE/DELETE**: Only admins can manage announcements

### 10. Recent Activity
- **SELECT**: All authenticated users can view activity (for community feed)
- **INSERT**: System can insert activity (through admin APIs)
- **UPDATE/DELETE**: Only admins can manage activity

## Key Features

### Type Casting
All policies use `auth.uid()::text` to convert Clerk's UUID format to TEXT for comparison with user_id fields:

```sql
user_id = auth.uid()::text OR public.is_admin()
```

### Admin Override
Most policies include admin override capabilities using the `public.is_admin()` function.

### Security by Default
- Users can only access their own data by default
- Admin permissions are explicit and controlled
- Service role has full access for system operations

## Common Patterns

### User-Owned Resource
```sql
CREATE POLICY "table_select" ON public.table_name
  FOR SELECT USING (
    user_id = auth.uid()::text OR public.is_admin()
  );
```

### Admin-Only Operations
```sql
CREATE POLICY "table_insert" ON public.table_name
  FOR INSERT WITH CHECK (public.is_admin());
```

### Status-Based Access
```sql
CREATE POLICY "table_update" ON public.table_name
  FOR UPDATE USING (
    (user_id = auth.uid()::text AND status = 'draft') OR public.is_admin()
  );
```

## Testing RLS Policies

### 1. Test User Access
```sql
-- Set user context
SELECT set_config('role', 'authenticated', true);
SELECT set_config('request.jwt.claims', '{"sub": "user_123abc"}', true);

-- Test queries
SELECT * FROM profiles WHERE id = 'user_123abc'; -- Should work
SELECT * FROM profiles; -- Should only show own profile
```

### 2. Test Admin Access
```sql
-- First make user admin
UPDATE profiles SET is_admin = true WHERE id = 'user_123abc';

-- Test admin queries
SELECT * FROM profiles; -- Should show all profiles
SELECT * FROM estimates; -- Should show all estimates
```

### 3. Test Unauthorized Access
```sql
-- Try to access other user's data
SELECT * FROM estimates WHERE user_id = 'other_user_id'; -- Should be empty
```

## Troubleshooting

### Common Issues

1. **Type Mismatch Errors**
   - Ensure `auth.uid()::text` casting in all policies
   - Check that user_id fields are TEXT type

2. **Permission Denied**
   - Verify user has correct profile created
   - Check admin status if needed
   - Ensure RLS is enabled on table

3. **Policy Not Working**
   - Verify policy syntax with `\dp table_name` in psql
   - Check policy order (more specific policies first)
   - Test with different user contexts

### Debugging Commands

```sql
-- Check RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- View policies
SELECT * FROM pg_policies WHERE schemaname = 'public';

-- Check current user context
SELECT auth.uid(), auth.role();
```

## Migration Notes

When migrating from UUID to TEXT user IDs:
1. Run `fix-user-id-types.sql` first
2. Run `setup-rls-policies-clerk.sql` second
3. Test all policies with actual Clerk user IDs
4. Verify foreign key relationships work correctly

## Best Practices

1. **Always use type casting**: `auth.uid()::text`
2. **Test policies thoroughly** with different user types
3. **Keep admin overrides** for management flexibility
4. **Use helper functions** for complex logic
5. **Document policy intentions** clearly
6. **Regular security audits** of policy effectiveness
