import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Groq from 'groq-sdk'

const SYSTEM_PROMPT = `You are an expert field-service admin who has written 15,000 winning quotes for HVAC, plumbing, electrical, roofing, and landscaping companies.
Convert the contractor's bullet points or voice note into a polished, itemized quote using ONLY items from their pricing catalog.
Rules:
- Never invent items — find closest match by name/synonym
- Add realistic quantities
- Include common upsells 90% of similar jobs need (e.g., surge protectors, water alarms, duct sealing)
- Apply trip charge if not explicitly waived
- Add permit fees when mentioned
- Offer Good / Better / Best options when possible
- Tone: confident, friendly, local-business style
- Output strict JSON: line_items[], options[], subtotal, tax_rate (default 8.5%), total, notes, upsell_suggestions[]`

export async function POST(request: NextRequest) {
  try {
    const { company_id, description, customer_name } = await request.json()

    if (!company_id || !description) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Fetch company pricing catalog
    const { data: pricingItems, error: pricingError } = await supabase
      .from('pricing_items')
      .select('*')
      .eq('company_id', company_id)

    if (pricingError) {
      console.error('Pricing fetch error:', pricingError)
      return NextResponse.json(
        { error: 'Failed to fetch pricing catalog' },
        { status: 500 }
      )
    }

    const { data: company } = await supabase
      .from('companies')
      .select('tax_rate')
      .eq('id', company_id)
      .single()

    // @ts-ignore
    const taxRate = company?.tax_rate || 8.5

    // Format pricing catalog for AI
    const catalogText = pricingItems
      ?.map((item: { name: string; price: number; category: string | null }) => 
        `${item.name} - $${item.price}${item.category ? ` (${item.category})` : ''}`
      )
      .join('\n') || ''

    const userPrompt = `Customer: ${customer_name}
Job Description: ${description}

Available Pricing Catalog:
${catalogText}

Generate a professional quote with line items, quantities, and pricing. Include appropriate upsells and fees. Return ONLY valid JSON with this structure:
{
  "line_items": [
    {
      "name": "Item name from catalog",
      "description": "Brief description if needed",
      "quantity": 1,
      "unit_price": 100,
      "total": 100,
      "is_upsell": false
    }
  ],
  "options": [],
  "subtotal": 0,
  "tax_rate": ${taxRate},
  "total": 0,
  "notes": "Optional notes about the work",
  "upsell_suggestions": ["Optional upsell suggestions"]
}`

    try {
      // Try Groq first
      const groq = new Groq({
        apiKey: process.env.GROQ_API_KEY,
      })

      const completion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.7,
        max_tokens: 2048,
      })

      const content = completion.choices[0]?.message?.content
      if (!content) throw new Error('No response from AI')

      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Invalid JSON response')

      const quoteData = JSON.parse(jsonMatch[0])

      // Calculate totals
      const subtotal = quoteData.line_items.reduce(
        (acc: number, item: { total: number }) => acc + item.total,
        0
      )
      const total = subtotal * (1 + taxRate / 100)

      return NextResponse.json({
        ...quoteData,
        subtotal,
        tax_rate: taxRate,
        total,
      })
    } catch (groqError) {
      console.error('Groq error:', groqError)
      
      // Fallback to OpenRouter if Groq fails
      if (process.env.OPENROUTER_API_KEY) {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'meta-llama/llama-3.1-70b-instruct',
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'user', content: userPrompt },
            ],
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(`OpenRouter error: ${JSON.stringify(errorData)}`)
        }

        const data = await response.json()
        const content = data.choices?.[0]?.message?.content
        
        if (!content) {
          console.error('OpenRouter response:', data)
          throw new Error('No response from fallback AI')
        }

        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (!jsonMatch) throw new Error('Invalid JSON response from fallback')

        const quoteData = JSON.parse(jsonMatch[0])

        const subtotal = quoteData.line_items.reduce(
          (acc: number, item: { total: number }) => acc + item.total,
          0
        )
        const total = subtotal * (1 + taxRate / 100)

        return NextResponse.json({
          ...quoteData,
          subtotal,
          tax_rate: taxRate,
          total,
        })
      }

      throw groqError
    }
  } catch (error) {
    console.error('Quote generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate quote' },
      { status: 500 }
    )
  }
}
