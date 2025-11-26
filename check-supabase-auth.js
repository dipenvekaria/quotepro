#!/usr/bin/env node

/**
 * Supabase OAuth Settings Checker
 * This script connects to Supabase Management API to check OAuth configuration
 */

const SUPABASE_URL = 'https://ajljduisjyutbgjeucig.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_IizYklty87sfvdRtg2ha1w__1hiVtWy'
const SUPABASE_SERVICE_KEY = 'sb_secret_QZJyTDrvILi4y6YF9DTRFg_D64nRhJM'

async function getAuthSettings() {
  console.log('🔍 Fetching Supabase Auth Settings...\n')

  try {
    // Try to get auth config from Supabase Management API
    const projectRef = 'ajljduisjyutbgjeucig'
    
    // Attempt 1: Get auth config via REST API
    const configUrl = `${SUPABASE_URL}/auth/v1/settings`
    console.log(`📡 Requesting: ${configUrl}\n`)
    
    const response = await fetch(configUrl, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.ok) {
      const settings = await response.json()
      console.log('✅ Auth Settings Retrieved:\n')
      console.log(JSON.stringify(settings, null, 2))
      
      if (settings.external) {
        console.log('\n📝 OAuth Providers:')
        Object.entries(settings.external).forEach(([provider, config]) => {
          console.log(`  ${provider}: ${config.enabled ? '✓ Enabled' : '✗ Disabled'}`)
        })
      }
      
      if (settings.uri_allow_list) {
        console.log('\n🔗 Allowed Redirect URLs:')
        settings.uri_allow_list.split(',').forEach(url => {
          console.log(`  - ${url}`)
        })
      } else if (settings.redirect_urls) {
        console.log('\n🔗 Allowed Redirect URLs:')
        console.log(settings.redirect_urls)
      }
    } else {
      const error = await response.text()
      console.log('⚠️  Could not fetch settings via REST API')
      console.log(`Status: ${response.status}`)
      console.log(`Response: ${error}\n`)
      
      // Attempt 2: Try Management API
      console.log('📡 Trying Management API...')
      const mgmtUrl = `https://api.supabase.com/v1/projects/${projectRef}/config/auth`
      
      const mgmtResponse = await fetch(mgmtUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (mgmtResponse.ok) {
        const mgmtSettings = await mgmtResponse.json()
        console.log('✅ Management API Settings:\n')
        console.log(JSON.stringify(mgmtSettings, null, 2))
      } else {
        console.log(`⚠️  Management API Status: ${mgmtResponse.status}`)
        console.log('Note: You may need a Personal Access Token for Management API')
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.message)
  }

  console.log('\n' + '='.repeat(60))
  console.log('📋 Manual Check Instructions:')
  console.log('='.repeat(60))
  console.log('\n1. Go to Supabase Dashboard:')
  console.log('   https://supabase.com/dashboard/project/ajljduisjyutbgjeucig/auth/url-configuration')
  console.log('\n2. Check "Redirect URLs" section')
  console.log('\n3. Ensure these URLs are listed:')
  console.log('   ✓ http://localhost:3000/auth/callback')
  console.log('   ✓ http://192.168.0.100:3000/auth/callback')
  console.log('\n4. Check "Site URL" is set to:')
  console.log('   http://192.168.0.100:3000')
  console.log('\n5. Under "Auth Providers" → "Google", verify:')
  console.log('   ✓ Enabled: Yes')
  console.log('   ✓ Client ID configured')
  console.log('   ✓ Client Secret configured')
  console.log('\n' + '='.repeat(60))
}

// Run the script
getAuthSettings().catch(console.error)
