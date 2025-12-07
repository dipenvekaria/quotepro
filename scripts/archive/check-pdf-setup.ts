// Script to check PDF generation setup requirements
// Run with: npx tsx scripts/check-pdf-setup.ts

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function checkSetup() {
  const supabase = createClient(supabaseUrl, supabaseKey)

  console.log('🔍 Checking PDF Generation Setup...\n')

  // Check 1: Database column exists
  console.log('1️⃣ Checking if pdf_url column exists...')
  try {
    const { data, error } = await supabase
      .from('quotes')
      .select('id, pdf_url')
      .limit(1)
    
    if (error) {
      console.error('❌ pdf_url column does NOT exist')
      console.error('   Error:', error.message)
      console.log('   👉 Run migration: supabase/migrations/009_add_pdf_url_to_quotes.sql\n')
    } else {
      console.log('✅ pdf_url column exists\n')
    }
  } catch (err: any) {
    console.error('❌ Database check failed:', err.message, '\n')
  }

  // Check 2: Storage bucket exists
  console.log('2️⃣ Checking if "quotes" storage bucket exists...')
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets()
    
    if (error) {
      console.error('❌ Could not list buckets:', error.message, '\n')
    } else {
      const quotesBucket = buckets?.find(b => b.name === 'quotes')
      if (quotesBucket) {
        console.log('✅ "quotes" bucket exists')
        console.log(`   Public: ${quotesBucket.public ? 'Yes ✅' : 'No ❌'}\n`)
        
        if (!quotesBucket.public) {
          console.log('   👉 Make bucket public in Supabase Dashboard → Storage\n')
        }
      } else {
        console.error('❌ "quotes" bucket does NOT exist')
        console.log('   👉 Create it in Supabase Dashboard → Storage → New Bucket')
        console.log('   👉 Name: "quotes", Public: Yes\n')
      }
    }
  } catch (err: any) {
    console.error('❌ Storage check failed:', err.message, '\n')
  }

  // Check 3: Environment variables
  console.log('3️⃣ Checking environment variables...')
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ]
  
  let allPresent = true
  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      console.log(`✅ ${envVar} is set`)
    } else {
      console.error(`❌ ${envVar} is NOT set`)
      allPresent = false
    }
  }
  
  if (allPresent) {
    console.log('\n✅ All required environment variables are set')
  } else {
    console.log('\n❌ Some environment variables are missing')
  }

  console.log('\n📋 Summary:')
  console.log('- If pdf_url column missing: Run migration in Supabase SQL Editor')
  console.log('- If quotes bucket missing: Create bucket in Supabase Storage')
  console.log('- If bucket not public: Update bucket settings to public')
  console.log('\nOnce all checks pass, PDF generation should work! 🎉')
}

checkSetup().catch(console.error)
