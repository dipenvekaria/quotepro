/**
 * SignNow Connection Test Script
 * 
 * Run this to verify your SignNow credentials are working
 * 
 * Usage:
 * node scripts/test-signnow.js
 */

const https = require('https');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const config = {
  clientId: process.env.SIGNNOW_CLIENT_ID,
  clientSecret: process.env.SIGNNOW_CLIENT_SECRET,
  apiBaseUrl: process.env.SIGNNOW_API_BASE_URL || 'https://api-eval.signnow.com',
  username: process.env.SIGNNOW_USERNAME,
  password: process.env.SIGNNOW_PASSWORD,
};

console.log('\n🧪 Testing SignNow Connection...\n');
console.log('Configuration:');
console.log('- API Base URL:', config.apiBaseUrl);
console.log('- Client ID:', config.clientId ? '✅ Set' : '❌ Missing');
console.log('- Client Secret:', config.clientSecret ? '✅ Set' : '❌ Missing');
console.log('- Username:', config.username ? '✅ Set' : '❌ Missing');
console.log('- Password:', config.password ? '✅ Set' : '❌ Missing');
console.log('');

if (!config.clientId || !config.clientSecret) {
  console.error('❌ Missing required credentials. Please check .env.local');
  process.exit(1);
}

async function testConnection() {
  try {
    // Test OAuth2 token request
    console.log('📡 Step 1: Testing OAuth2 authentication...');
    
    const authUrl = new URL('/oauth2/token', config.apiBaseUrl);
    const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
    
    const bodyParams = config.username && config.password
      ? `grant_type=password&username=${encodeURIComponent(config.username)}&password=${encodeURIComponent(config.password)}`
      : `grant_type=client_credentials`;

    const response = await fetch(authUrl.toString(), {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: bodyParams,
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Authentication failed:', error);
      console.error('\nTroubleshooting:');
      console.error('1. Verify your Client ID and Secret are correct');
      console.error('2. Check that your username/password are correct');
      console.error('3. Ensure you\'re using the correct API Base URL');
      console.error('4. Check if your SignNow account is active');
      process.exit(1);
    }

    const data = await response.json();
    console.log('✅ Authentication successful!');
    console.log('   Access Token:', data.access_token.substring(0, 20) + '...');
    console.log('   Token Type:', data.token_type);
    console.log('   Expires In:', data.expires_in, 'seconds');
    console.log('');

    // Test API access
    console.log('📡 Step 2: Testing API access...');
    
    const userResponse = await fetch(`${config.apiBaseUrl}/user`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${data.access_token}`,
      },
    });

    if (!userResponse.ok) {
      const error = await userResponse.text();
      console.error('❌ API access failed:', error);
      process.exit(1);
    }

    const userData = await userResponse.json();
    console.log('✅ API access successful!');
    console.log('   User ID:', userData.id);
    console.log('   Email:', userData.email);
    console.log('   Account Status:', userData.active ? 'Active' : 'Inactive');
    console.log('');

    console.log('🎉 All tests passed!');
    console.log('\nYour SignNow integration is configured correctly.');
    console.log('You can now send quotes for signature.');
    console.log('');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('\nError details:', error);
    process.exit(1);
  }
}

testConnection();
