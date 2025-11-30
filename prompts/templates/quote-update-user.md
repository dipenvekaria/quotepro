Customer: {{customer_name}}

CURRENT QUOTE ITEMS:
{{existing_items_text}}

USER REQUEST: {{user_prompt}}

⚠️  REMEMBER: This is a conversation update. The user is asking you to UPDATE the existing quote.
- If they say "add", KEEP existing items and ADD new ones
- If they say "remove", REMOVE only specified items  
- If they say "change/replace", MODIFY only specified items
- DEFAULT: PRESERVE existing items unless explicitly told otherwise

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
  "subtotal": 0,
  "tax_rate": {{tax_rate}},
  "total": 0,
  "notes": "What was changed based on user request"
}
