# 🧪 Testing Google Authentication

## Pre-flight Checklist

### ✅ Google Cloud Console
- [ ] Project created and selected
- [ ] Google+ API enabled
- [ ] People API enabled (recommended)
- [ ] OAuth consent screen configured
- [ ] Web application OAuth 2.0 client created
- [ ] Redirect URIs added: `https://accounts.clerk.dev/oauth_callback`

### ✅ Clerk Dashboard
- [ ] Google social connection enabled
- [ ] Client ID entered
- [ ] Client Secret entered
- [ ] Settings saved

### ✅ Vercel Environment Variables
- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` set
- [ ] `CLERK_SECRET_KEY` set
- [ ] Environment variables deployed to production

## Testing Steps

### 1. Test Login Flow
1. Go to your deployed site: `https://your-app.vercel.app/auth/login`
2. Click "Continue with Google"
3. Should redirect to Google OAuth consent screen
4. Grant permissions
5. Should redirect back to your dashboard

### 2. Verify User Profile
1. After Google login, check that user profile is created
2. Go to Clerk Dashboard → Users
3. Verify the Google user appears with:
   - Email from Google account
   - First name and last name
   - Profile image
   - Google as the authentication method

### 3. Test User Experience
- [ ] Google login button appears on login page
- [ ] Google login button appears on register page
- [ ] User can sign in with Google successfully
- [ ] User is redirected to dashboard after Google login
- [ ] User's Google profile info is displayed correctly
- [ ] User can sign out and sign back in with Google

## Common Issues & Solutions

### Issue: "OAuth Error - Invalid Redirect URI"
**Solution**: 
- Double-check redirect URI in Google Cloud Console
- Make sure it exactly matches: `https://accounts.clerk.dev/oauth_callback`
- No trailing slashes or extra characters

### Issue: "Client ID not found"
**Solution**:
- Verify Client ID is correctly copied from Google Cloud Console
- Make sure there are no extra spaces
- Re-save in Clerk Dashboard

### Issue: "Access blocked: This app's request is invalid"
**Solution**:
- Make sure OAuth consent screen is published
- Add your domain to authorized domains
- Verify all required fields are filled in consent screen

### Issue: Google login works but user not created
**Solution**:
- Check if email matches existing user
- Verify user creation permissions in Clerk
- Check Clerk webhook logs for errors

## Debug Information

If Google auth fails, check:

1. **Browser Console**: Look for JavaScript errors
2. **Network Tab**: Check for failed API calls
3. **Clerk Dashboard**: Check logs and user creation
4. **Google Cloud Console**: Check OAuth consent screen status

## Success Indicators

✅ **Working Correctly When**:
- Google button redirects to Google OAuth
- User can grant permissions without errors
- User is redirected back to your app
- User appears in Clerk Dashboard
- User can access protected routes
- User profile shows Google information 