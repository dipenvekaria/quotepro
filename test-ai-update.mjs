#!/usr/bin/env node
/**
 * Test script to verify AI update behavior
 * Tests if AI preserves existing items when updating
 */

const BACKEND_URL = 'http://localhost:8000'

async function testAIUpdate() {
  console.log('🧪 Testing AI Update Quote Behavior\n')
  console.log('=' . repeat(60))
  
  // Simulate existing quote with 2 items
  const existingItems = [
    {
      name: 'Water Heater Installation',
      description: '50-gallon water heater',
      quantity: 1,
      unit_price: 1200,
      total: 1200
    },
    {
      name: 'Pipe Replacement',
      description: '20 ft copper pipe',
      quantity: 1,
      unit_price: 300,
      total: 300
    }
  ]
  
  console.log('📋 EXISTING ITEMS (2):')
  existingItems.forEach(item => {
    console.log(`   - ${item.name}: $${item.total}`)
  })
  console.log(`   TOTAL: $${existingItems.reduce((sum, i) => sum + i.total, 0)}`)
  console.log()
  
  // Test 1: Ask to ADD something
  console.log('TEST 1: "add labor charges"')
  console.log('-'.repeat(60))
  
  const updateRequest = {
    company_id: 'test-company-id', // Replace with real company_id
    user_prompt: 'add labor charges',
    existing_items: existingItems,
    customer_address: '123 Main St',
    conversation_history: []
  }
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/update-quote-with-ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateRequest)
    })
    
    if (!response.ok) {
      const error = await response.json()
      console.error('❌ Error:', error)
      return
    }
    
    const result = await response.json()
    
    console.log(`\n✅ AI RESPONSE - ${result.line_items.length} items:`)
    result.line_items.forEach(item => {
      console.log(`   - ${item.name}: $${item.total}`)
    })
    console.log(`   TOTAL: $${result.total}`)
    console.log()
    
    // Check if existing items are preserved
    const hasWaterHeater = result.line_items.some(i => i.name === 'Water Heater Installation')
    const hasPipes = result.line_items.some(i => i.name === 'Pipe Replacement')
    const hasNewItem = result.line_items.length > 2
    
    console.log('📊 ANALYSIS:')
    console.log(`   Water Heater preserved: ${hasWaterHeater ? '✅ YES' : '❌ NO'}`)
    console.log(`   Pipe Replacement preserved: ${hasPipes ? '✅ YES' : '❌ NO'}`)
    console.log(`   New item added: ${hasNewItem ? '✅ YES' : '❌ NO'}`)
    console.log()
    
    if (hasWaterHeater && hasPipes && hasNewItem) {
      console.log('✅ TEST PASSED: AI is preserving existing items AND adding new ones')
    } else if (!hasWaterHeater || !hasPipes) {
      console.log('❌ TEST FAILED: AI is NOT preserving existing items')
      console.log('   → This means the AI prompt/logic needs to be fixed')
    } else {
      console.log('⚠️  TEST PARTIAL: Existing items preserved but no new item added')
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message)
  }
}

// Run test
testAIUpdate().catch(console.error)
