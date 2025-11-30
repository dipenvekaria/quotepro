Customer: {{customer_name}}
Job Description: {{description}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 YOUR PRICING CATALOG (USE ONLY THESE):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{{catalog_text}}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{{existing_items_section}}

⚠️  IMPORTANT: 
- ONLY use items listed above
- ONLY use the exact prices shown
- If you need an item NOT in the catalog, mention it in "notes" but do NOT add it to line_items
- DO NOT make up prices or items
- PRESERVE existing items unless asked to remove/change them

Generate a professional quote matching the job description to items from the catalog above.

Return ONLY valid JSON with this exact structure:
{
  "line_items": [
    {
      "name": "Exact item name from catalog",
      "description": "Brief description",
      "quantity": 1,
      "unit_price": 100,
      "total": 100,
      "is_upsell": false
    }
  ],
  "options": [],
  "subtotal": 0,
  "tax_rate": {{tax_rate}},
  "total": 0,
  "notes": "Optional notes about the work or missing catalog items",
  "upsell_suggestions": ["Items from catalog that add value"]
}
