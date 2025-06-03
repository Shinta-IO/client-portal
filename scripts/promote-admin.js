#!/usr/bin/env node

// Admin promotion script using Clerk Backend SDK
import { createClerkClient } from '@clerk/backend';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function promoteUserToAdmin() {
  try {
    // Get user ID from environment variable or command line argument
    const userId = process.env.ADMIN_USER_ID || process.argv[2];
    
    if (!userId) {
      console.error('❌ Error: No user ID provided');
      console.log('💡 Usage: npm run promote-admin <user_id>');
      console.log('💡 Or set ADMIN_USER_ID in your .env.local file');
      process.exit(1);
    }
    
    if (!process.env.CLERK_SECRET_KEY) {
      console.error('❌ Error: CLERK_SECRET_KEY not found in environment variables');
      console.log('💡 Make sure CLERK_SECRET_KEY is set in your .env.local file');
      process.exit(1);
    }
    
    console.log(`🔄 Promoting user ${userId} to admin...`);
    
    // Create Clerk client
    const clerkClient = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY
    });
    
    // Validate user exists first
    const user = await clerkClient.users.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Update user role
    const updatedUser = await clerkClient.users.updateUser(userId, {
      publicMetadata: {
        role: "admin"
      }
    });
    
    console.log(`✅ Success! User promoted to admin.`);
    console.log(`📧 Email: ${updatedUser.emailAddresses[0]?.emailAddress}`);
    console.log(`👤 Name: ${updatedUser.firstName} ${updatedUser.lastName}`);
    console.log(`🏷️  Role: ${updatedUser.publicMetadata.role}`);
    console.log(`⚠️  Remember: Remove ADMIN_USER_ID from .env.local after promotion!`);
    
  } catch (error) {
    console.error('❌ Error promoting user:', error.message);
    
    if (error.message.includes('not found')) {
      console.log('💡 Make sure the user ID is correct and the user exists.');
    }
    
    if (error.message.includes('authorization')) {
      console.log('💡 Make sure CLERK_SECRET_KEY is set in your .env.local file.');
    }
  }
}

// Run the script
promoteUserToAdmin(); 