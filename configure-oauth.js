#!/usr/bin/env node

/**
 * Supabase OAuth Settings Manager
 * This script helps configure redirect URLs for OAuth
 */

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://ajljduisjyutbgjeucig.supabase.co'
const SUPABASE_SERVICE_KEY = 'sb_secret_QZJyTDrvILi4y6YF9DTRFg_D64nRhJM'

async function checkAndUpdateRedirectURLs() {
  console.log('🔍 Checking Supabase OAuth Configuration...\n')

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // Test authentication
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error && error.message.includes('Invalid API key')) {
      console.log('⚠️  Service role key validation...')
      console.log('Using key for API requests (read-only)\n')
    }

    // Check current auth settings via direct API
    const response = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      }
    })

    if (response.ok) {
      const settings = await response.json()
      console.log('✅ Current Auth Settings:')
      console.log('  - Google OAuth:', settings.external?.google ? '✓ Enabled' : '✗ Disabled')
      console.log('  - Email Auth:', settings.external?.email ? '✓ Enabled' : '✗ Disabled')
      console.log('  - Auto-confirm emails:', settings.mailer_autoconfirm ? 'Yes' : 'No')
      console.log('')
    }

    // Important notice
    console.log('=' .repeat(70))
    console.log('⚠️  IMPORTANT: Redirect URLs Configuration')
    console.log('='.repeat(70))
    console.log('')
    console.log('Redirect URLs can only be configured via the Supabase Dashboard.')
    console.log('The API does not support programmatic updates for security reasons.')
    console.log('')
    console.log('📋 Steps to Configure:')
    console.log('')
    console.log('1. Open Supabase Dashboard:')
    console.log('   https://supabase.com/dashboard/project/ajljduisjyutbgjeucig/auth/url-configuration')
    console.log('')
    console.log('2. Under "Redirect URLs", add these URLs:')
    console.log('   ┌─────────────────────────────────────────────┐')
    console.log('   │ http://localhost:3000/*                     │')
    console.log('   │ http://192.168.0.100:3000/*                 │')
    console.log('   └─────────────────────────────────────────────┘')
    console.log('')
    console.log('3. Set "Site URL" to:')
    console.log('   http://192.168.0.100:3000')
    console.log('')
    console.log('4. Save changes')
    console.log('')
    console.log('=' .repeat(70))
    console.log('🔧 Testing OAuth Flow')
    console.log('='.repeat(70))
    console.log('')
    console.log('After configuring Supabase:')
    console.log('')
    console.log('1. Access your app at: http://192.168.0.100:3000')
    console.log('2. Open browser console (F12)')
    console.log('3. Click "Continue with Google"')
    console.log('4. Look for console log: "OAuth redirect will be: ..."')
    console.log('5. Verify it shows: http://192.168.0.100:3000/auth/callback')
    console.log('')
    console.log('If redirecting to localhost:')
    console.log('  • Clear browser cache and cookies')
    console.log('  • Remove app from Google permissions:')
    console.log('    https://myaccount.google.com/permissions')
    console.log('  • Try login again from the IP address')
    console.log('')
    console.log('='.repeat(70))

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

// Run the script
checkAndUpdateRedirectURLs().catch(console.error)
