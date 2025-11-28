// Quick script to check quotes in database
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Read .env.local file
const envFile = readFileSync('.env.local', 'utf8')
const envVars = {}
envFile.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=')
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim()
  }
})

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('🔗 Connecting to:', supabaseUrl)

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkData() {
  // Get all companies
  const { data: companies, error: companiesError } = await supabase
    .from('companies')
    .select('id, name, user_id')
  
  if (companiesError) {
    console.error('❌ Error fetching companies:', companiesError)
    return
  }
  
  console.log(`\n👔 Found ${companies.length} companies:`)
  companies.forEach(c => console.log(`   - ${c.name} (${c.id})`))
  
  if (companies.length > 0) {
    const companyId = companies[0].id
    
    // Get quotes for first company
    const { data: quotes, error: quotesError } = await supabase
      .from('quotes')
      .select('id, customer_name, lead_status, total, created_at')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
    
    if (quotesError) {
      console.error('❌ Error fetching quotes:', quotesError)
      return
    }
    
    console.log(`\n📋 Found ${quotes.length} quotes for ${companies[0].name}:`)
    quotes.slice(0, 5).forEach(q => {
      console.log(`   - ${q.customer_name} | ${q.lead_status} | $${q.total} | ${new Date(q.created_at).toLocaleDateString()}`)
    })
  }
}

checkData()
