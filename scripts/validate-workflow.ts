#!/usr/bin/env npx ts-node
/**
 * QUOTEPRO WORKFLOW VALIDATION SCRIPT
 * 
 * Tests the complete lead -> quote -> work workflow
 * Run with: npx ts-node scripts/validate-workflow.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface ValidationResult {
  test: string
  passed: boolean
  details: string
  data?: any
}

const results: ValidationResult[] = []

function log(test: string, passed: boolean, details: string, data?: any) {
  results.push({ test, passed, details, data })
  console.log(passed ? '✅' : '❌', test, '-', details)
  if (data && !passed) {
    console.log('   Data:', JSON.stringify(data, null, 2).slice(0, 500))
  }
}

async function main() {
  console.log('\n🔍 QUOTEPRO WORKFLOW VALIDATION\n')
  console.log('='.repeat(60))

  // Get a company to test with
  const { data: companies } = await supabase.from('companies').select('id, name').limit(1)
  if (!companies?.length) {
    console.log('❌ No companies found')
    return
  }
  const companyId = companies[0].id
  console.log(`\nTesting with company: ${companies[0].name} (${companyId})\n`)

  // ============================================================
  // 1. LEADS TABLE ANALYSIS
  // ============================================================
  console.log('\n📋 LEADS TABLE ANALYSIS')
  console.log('-'.repeat(40))

  const { data: leads } = await supabase
    .from('leads')
    .select('id, status, archived_at, customer:customers(name)')
    .eq('company_id', companyId)

  const leadsByStatus: Record<string, number> = {}
  leads?.forEach(l => {
    leadsByStatus[l.status] = (leadsByStatus[l.status] || 0) + 1
  })
  console.log('Lead statuses:', leadsByStatus)

  const archivedLeads = leads?.filter(l => l.status === 'archived' || l.archived_at)
  log(
    'Archived leads have correct status',
    archivedLeads?.every(l => l.status === 'archived') ?? true,
    `${archivedLeads?.length || 0} archived leads`,
    archivedLeads?.filter(l => l.status !== 'archived')
  )

  // ============================================================
  // 2. QUOTES TABLE ANALYSIS
  // ============================================================
  console.log('\n📄 QUOTES TABLE ANALYSIS')
  console.log('-'.repeat(40))

  const { data: quotes } = await supabase
    .from('quotes')
    .select('id, status, lead_id, archived_at, scheduled_at, customer:customers(name), quote_items(id)')
    .eq('company_id', companyId)

  const quotesByStatus: Record<string, number> = {}
  quotes?.forEach(q => {
    quotesByStatus[q.status] = (quotesByStatus[q.status] || 0) + 1
  })
  console.log('Quote statuses:', quotesByStatus)

  // Check for quotes linked to archived leads
  const archivedLeadIds = new Set(archivedLeads?.map(l => l.id) || [])
  const quotesWithArchivedLeads = quotes?.filter(q => q.lead_id && archivedLeadIds.has(q.lead_id))
  log(
    'Quotes linked to archived leads are also archived',
    quotesWithArchivedLeads?.every(q => q.status === 'archived' || q.archived_at) ?? true,
    `${quotesWithArchivedLeads?.length || 0} quotes linked to archived leads`,
    quotesWithArchivedLeads?.filter(q => q.status !== 'archived' && !q.archived_at)
  )

  // ============================================================
  // 3. LEADS QUEUE VALIDATION
  // ============================================================
  console.log('\n📥 LEADS QUEUE (what should show)')
  console.log('-'.repeat(40))

  // Leads: from leads table with status new/contacted/qualified, not archived
  const leadsQueue = leads?.filter(l => 
    !l.archived_at && 
    l.status !== 'archived' && 
    ['new', 'contacted', 'qualified'].includes(l.status)
  )
  console.log(`Leads from leads table: ${leadsQueue?.length || 0}`)

  // Also: quotes with 0 items (not yet a quote)
  const emptyQuotes = quotes?.filter(q => 
    !q.archived_at && 
    q.status !== 'archived' &&
    (q.quote_items?.length || 0) === 0
  )
  console.log(`Quotes with 0 items (empty): ${emptyQuotes?.length || 0}`)

  const totalLeadsQueue = (leadsQueue?.length || 0) + (emptyQuotes?.length || 0)
  console.log(`TOTAL LEADS QUEUE: ${totalLeadsQueue}`)

  // ============================================================
  // 4. QUOTES QUEUE VALIDATION
  // ============================================================
  console.log('\n📤 QUOTES QUEUE (what should show)')
  console.log('-'.repeat(40))

  // Quotes: from quotes table with 1+ items, not archived, not scheduled/completed/paid
  const quotesQueue = quotes?.filter(q => 
    !q.archived_at && 
    q.status !== 'archived' &&
    (q.quote_items?.length || 0) > 0 &&
    !['scheduled', 'completed', 'invoiced', 'paid'].includes(q.status)
  )
  console.log(`Quotes with items (draft/sent/viewed/accepted/signed): ${quotesQueue?.length || 0}`)

  // ============================================================
  // 5. TO-BE-SCHEDULED QUEUE (Calendar sidebar)
  // ============================================================
  console.log('\n📅 TO-BE-SCHEDULED (Calendar sidebar)')
  console.log('-'.repeat(40))

  const toBeScheduled = quotes?.filter(q => 
    !q.archived_at && 
    q.status !== 'archived' &&
    ['accepted', 'signed'].includes(q.status) &&
    !q.scheduled_at
  )
  console.log(`Accepted/Signed without scheduled_at: ${toBeScheduled?.length || 0}`)

  // ============================================================
  // 6. SCHEDULED/WORK QUEUE
  // ============================================================
  console.log('\n🔧 WORK QUEUE (scheduled jobs)')
  console.log('-'.repeat(40))

  const scheduled = quotes?.filter(q => 
    !q.archived_at && 
    q.status !== 'archived' &&
    q.scheduled_at &&
    !['completed', 'invoiced', 'paid'].includes(q.status)
  )
  console.log(`Scheduled (not completed): ${scheduled?.length || 0}`)

  // ============================================================
  // 7. DUPLICATE DETECTION
  // ============================================================
  console.log('\n🔄 DUPLICATE DETECTION')
  console.log('-'.repeat(40))

  // Check if any lead_id appears in both leads table and quotes table
  // causing duplicates in the combined view
  const leadIdsInQuotes = new Set(quotes?.filter(q => q.lead_id).map(q => q.lead_id))
  const leadsWithQuotes = leads?.filter(l => leadIdsInQuotes.has(l.id))
  
  console.log(`Leads that have quotes created: ${leadsWithQuotes?.length || 0}`)
  
  // These should NOT appear in leads queue if their status is 'quoted'
  const leadsWithQuotesNotQuoted = leadsWithQuotes?.filter(l => 
    l.status !== 'quoted' && 
    l.status !== 'archived'
  )
  log(
    'Leads with quotes have status "quoted"',
    leadsWithQuotesNotQuoted?.length === 0,
    `${leadsWithQuotesNotQuoted?.length || 0} leads have quotes but status is not "quoted"`,
    leadsWithQuotesNotQuoted
  )

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log('\n' + '='.repeat(60))
  console.log('📊 SUMMARY')
  console.log('='.repeat(60))
  
  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length
  
  console.log(`\nTests: ${passed} passed, ${failed} failed`)
  
  if (failed > 0) {
    console.log('\n❌ FAILED TESTS:')
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   - ${r.test}: ${r.details}`)
    })
  }

  console.log('\n📌 EXPECTED COUNTS:')
  console.log(`   Leads Queue: ${totalLeadsQueue}`)
  console.log(`   Quotes Queue: ${quotesQueue?.length || 0}`)
  console.log(`   To Schedule: ${toBeScheduled?.length || 0}`)
  console.log(`   Work Queue: ${scheduled?.length || 0}`)
}

main().catch(console.error)
