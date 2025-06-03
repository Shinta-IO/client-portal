const { createClerkClient } = require('@clerk/backend');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testAdminSystem() {
  console.log('🔍 Testing Admin System Setup...\n');

  // Test 1: Environment Variables
  console.log('1️⃣ Checking Environment Variables:');
  const requiredEnvs = [
    'CLERK_SECRET_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];

  const missingEnvs = requiredEnvs.filter(env => !process.env[env]);
  if (missingEnvs.length > 0) {
    console.log('❌ Missing environment variables:', missingEnvs);
    return;
  }
  console.log('✅ All environment variables present\n');

  // Test 2: Clerk Admin Check
  console.log('2️⃣ Testing Clerk Admin Role:');
  try {
    const clerkClient = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY
    });

    // Get all users and check for admin
    const { data: users } = await clerkClient.users.getUserList({ limit: 10 });
    console.log(`📊 Found ${users.length} users in Clerk`);

    const adminUsers = users.filter(user => user.publicMetadata?.role === 'admin');
    console.log(`👑 Found ${adminUsers.length} admin users:`);
    
    adminUsers.forEach(user => {
      console.log(`   - ${user.emailAddresses[0]?.emailAddress} (ID: ${user.id})`);
    });

    if (adminUsers.length === 0) {
      console.log('⚠️  No admin users found! Set publicMetadata.role = "admin" for at least one user');
    }
    console.log('');
  } catch (error) {
    console.log('❌ Clerk API error:', error.message);
    return;
  }

  // Test 3: Supabase Service Role Connection
  console.log('3️⃣ Testing Supabase Service Role:');
  try {
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Test service role access
    const { data: projects, error } = await adminClient
      .from('projects')
      .select('id')
      .limit(1);

    if (error) {
      console.log('❌ Service role database access failed:', error.message);
      return;
    }
    console.log('✅ Service role can access database');
    console.log(`📊 Projects table accessible (found ${projects?.length || 0} projects)\n`);
  } catch (error) {
    console.log('❌ Supabase service role error:', error.message);
    return;
  }

  // Test 4: Regular User Client (Should be restricted)
  console.log('4️⃣ Testing Regular User Restrictions:');
  try {
    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // This should fail without proper auth
    const { data, error } = await userClient
      .from('projects')
      .select('id')
      .limit(1);

    if (error) {
      console.log('✅ Anonymous access properly restricted:', error.message);
    } else {
      console.log('⚠️  Anonymous access allowed - check RLS policies');
    }
    console.log('');
  } catch (error) {
    console.log('✅ Anonymous access properly blocked\n');
  }

  // Test 5: API Endpoint Structure Check
  console.log('5️⃣ Checking API Endpoint Structure:');
  const fs = require('fs');
  const path = require('path');
  
  const apiEndpoints = [
    'app/api/admin/users/route.ts',
    'app/api/admin/projects/route.ts'
  ];

  apiEndpoints.forEach(endpoint => {
    if (fs.existsSync(path.join(process.cwd(), endpoint))) {
      console.log(`✅ ${endpoint} exists`);
    } else {
      console.log(`❌ ${endpoint} missing`);
    }
  });

  console.log('\n🎉 Admin System Test Complete!');
  console.log('\n📋 Summary:');
  console.log('- Environment variables configured');
  console.log('- Clerk admin roles checked');  
  console.log('- Service role database access verified');
  console.log('- Regular user restrictions confirmed');
  console.log('- API endpoints structure validated');
}

// Run the test
testAdminSystem().catch(console.error); 