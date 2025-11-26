#!/usr/bin/env node

/**
 * Google OAuth Configuration Finder
 * Helps locate the Google OAuth app that needs to be updated
 */

const SUPABASE_URL = 'https://ajljduisjyutbgjeucig.supabase.co'
const SUPABASE_SERVICE_KEY = 'sb_secret_QZJyTDrvILi4y6YF9DTRFg_D64nRhJM'

async function findGoogleOAuthConfig() {
  console.log('🔍 Finding Google OAuth Configuration...\n')

  try {
    // Get auth configuration
    const response = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      }
    })

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`)
    }

    const settings = await response.json()

    console.log('=' .repeat(70))
    console.log('📋 Current Supabase OAuth Configuration')
    console.log('='.repeat(70))
    console.log('')
    console.log('Google OAuth Status:', settings.external?.google ? '✓ ENABLED' : '✗ DISABLED')
    console.log('')

    if (settings.external?.google) {
      console.log('⚠️  IMPORTANT: Google OAuth Configuration')
      console.log('')
      console.log('To fix the redirect issue, you need to update settings in:')
      console.log('')
      console.log('1️⃣  Google Cloud Console (PRIMARY FIX)')
      console.log('   https://console.cloud.google.com/apis/credentials')
      console.log('')
      console.log('2️⃣  Supabase Dashboard')
      console.log('   https://supabase.com/dashboard/project/ajljduisjyutbgjeucig/auth/providers')
      console.log('')
      console.log('=' .repeat(70))
      console.log('🔧 Step-by-Step Fix')
      console.log('='.repeat(70))
      console.log('')
      console.log('STEP 1: Find Your Google OAuth App')
      console.log('─'.repeat(70))
      console.log('')
      console.log('A. Go to Supabase:')
      console.log('   https://supabase.com/dashboard/project/ajljduisjyutbgjeucig/auth/providers')
      console.log('')
      console.log('B. Click on "Google" provider')
      console.log('')
      console.log('C. Copy the "Client ID" (looks like: xxxxx-xxxxx.apps.googleusercontent.com)')
      console.log('')
      console.log('D. Go to Google Cloud Console:')
      console.log('   https://console.cloud.google.com/apis/credentials')
      console.log('')
      console.log('E. Find the OAuth 2.0 Client ID that matches your Supabase Client ID')
      console.log('')
      console.log('')
      console.log('STEP 2: Update Google OAuth App')
      console.log('─'.repeat(70))
      console.log('')
      console.log('In Google Cloud Console, edit the OAuth client:')
      console.log('')
      console.log('A. Authorized JavaScript origins:')
      console.log('   REMOVE: http://localhost:3000')
      console.log('   ADD:    http://192.168.0.100:3000')
      console.log('')
      console.log('B. Authorized redirect URIs:')
      console.log('   KEEP:   https://ajljduisjyutbgjeucig.supabase.co/auth/v1/callback')
      console.log('   REMOVE: http://localhost:3000/auth/callback')
      console.log('   ADD:    http://192.168.0.100:3000/auth/callback')
      console.log('')
      console.log('C. Click SAVE')
      console.log('')
      console.log('')
      console.log('STEP 3: Update Supabase')
      console.log('─'.repeat(70))
      console.log('')
      console.log('Go to: https://supabase.com/dashboard/project/ajljduisjyutbgjeucig/auth/url-configuration')
      console.log('')
      console.log('A. Site URL:')
      console.log('   SET TO: http://192.168.0.100:3000')
      console.log('')
      console.log('B. Redirect URLs:')
      console.log('   ADD:    http://192.168.0.100:3000/*')
      console.log('   REMOVE: http://localhost:3000/* (optional)')
      console.log('')
      console.log('C. Click SAVE')
      console.log('')
      console.log('')
      console.log('STEP 4: Clear Cache & Test')
      console.log('─'.repeat(70))
      console.log('')
      console.log('A. Remove Google OAuth permission:')
      console.log('   https://myaccount.google.com/permissions')
      console.log('')
      console.log('B. Clear browser cache and cookies')
      console.log('')
      console.log('C. Wait 5-10 minutes for Google changes to propagate')
      console.log('')
      console.log('D. Test from: http://192.168.0.100:3000')
      console.log('')
      console.log('=' .repeat(70))
      console.log('')
      console.log('✨ After these changes, Google will redirect to 192.168.0.100:3000')
      console.log('')
    } else {
      console.log('❌ Google OAuth is not enabled in Supabase')
      console.log('')
      console.log('Enable it at:')
      console.log('https://supabase.com/dashboard/project/ajljduisjyutbgjeucig/auth/providers')
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
    console.log('')
    console.log('Manual steps:')
    console.log('1. Check Supabase auth providers for Google OAuth settings')
    console.log('2. Copy the Google Client ID from Supabase')
    console.log('3. Find and update that client in Google Cloud Console')
  }
}

// Run the script
findGoogleOAuthConfig().catch(console.error)
