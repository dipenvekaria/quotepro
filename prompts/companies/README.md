# Company-Specific AI Prompts

This folder allows each company to customize their AI behavior for quote generation and job naming without code changes.

## 🎯 What Can Be Customized?

Each company can override these system prompts:

1. **Quote Generation** (`default-system-prompt.md`)
   - How AI interprets job descriptions
   - Pricing strategies and upsell behavior
   - Tone and professionalism level
   - Industry-specific terminology

2. **Job Name Generation** (`job-name-generation.md`) *Optional*
   - Job naming rules (e.g., "HVAC Replacement" vs "AC Unit Installation")
   - Industry-specific terminology
   - Capitalization and formatting preferences

## 📋 File Structure

```
companies/
└── {your-company-id}/
    ├── default-system-prompt.md     # Quote generation (required)
    └── job-name-generation.md       # Job naming (optional)
```

## Creating a Custom Prompt

### Step 1: Find Your Company ID

Your company ID is a UUID that looks like: `550e8400-e29b-41d4-a716-446655440000`

**Option A: Supabase Dashboard (Recommended)**
1. Open your Supabase project dashboard
2. Go to **Table Editor** → `companies` table
3. Find your company row
4. Copy the value from the `id` column (this is your company ID)

**Option B: Browser DevTools**
1. Log into QuotePro dashboard
2. Open DevTools (F12 or Cmd+Option+I on Mac)
3. Go to **Console** tab
4. Generate a quote and check the network request
5. Look for `company_id` in the request payload

**Option C: Python Backend Logs**
1. Generate any quote in the app
2. Check your Python backend terminal
3. Look for: `✅ Loading company-specific prompt for: [YOUR-COMPANY-ID]`

### Step 2: Create Company Folder

```bash
# Replace YOUR_COMPANY_ID with the actual UUID from Step 1
mkdir -p prompts/companies/YOUR_COMPANY_ID
```

**Real Example:**
```bash
mkdir -p prompts/companies/550e8400-e29b-41d4-a716-446655440000
```

### Step 3: Copy Default Prompts

```bash
# Required: Quote generation prompt
cp prompts/default-system-prompt.md prompts/companies/YOUR_COMPANY_ID/default-system-prompt.md

# Optional: Job name generation prompt (if you want to customize job naming)
cp prompts/job-name-generation.md prompts/companies/YOUR_COMPANY_ID/job-name-generation.md
```

**Real Example:**
```bash
cp prompts/default-system-prompt.md prompts/companies/550e8400-e29b-41d4-a716-446655440000/default-system-prompt.md
cp prompts/job-name-generation.md prompts/companies/550e8400-e29b-41d4-a716-446655440000/job-name-generation.md
```

### Step 4: Customize

Edit the copied files in `prompts/companies/YOUR_COMPANY_ID/` to match your company's:
- Industry terminology
- Pricing strategies
- Service offerings
- Tone and style
- Specific rules

**No restart needed** - changes take effect on the next quote generation!

## Example Customizations

### HVAC Company
```markdown
You are an expert HVAC technician with 20 years experience.
Focus on energy efficiency, proper sizing, and warranty coverage.
Always mention SEER ratings for AC units.
Suggest seasonal maintenance plans.
```

### Plumbing Company
```markdown
You are a master plumber specializing in residential services.
Emphasize code compliance and quality materials.
Always include permit fees when required.
Suggest water heater upgrades proactively.
```

### Electrical Company
```markdown
You are a licensed electrician focused on safety and code compliance.
Always verify electrical panel capacity before quoting.
Mention arc fault breakers and GFCI protection.
Include inspection fees in commercial quotes.
```

## Testing Your Custom Prompt

1. Edit your company's `system-prompt.md` file
2. Save the file
3. Restart the Python backend (it loads prompts on startup)
4. Generate a test quote
5. Check logs for: `✅ Loading company-specific prompt for: YOUR_COMPANY_ID`

## Variables You Can Use

The prompt system automatically injects these variables:
- `{{company_name}}` - Company name from database
- `{{company_id}}` - Company ID
- `{{pricing_catalog}}` - Full pricing catalog
- `{{customer_name}}` - Customer name
- `{{customer_address}}` - Customer address
- `{{job_description}}` - Job description
- `{{existing_items}}` - Current quote items (for multi-turn conversations)

## Best Practices

1. **Keep Core Structure**: Don't remove the JSON output format requirements
2. **Test Thoroughly**: Test with various job descriptions before deploying
3. **Version Control**: Commit prompt changes to git
4. **Document Changes**: Add comments explaining why you made changes
5. **Start Small**: Make incremental changes, not complete rewrites

## Troubleshooting

### Prompt Not Loading
- Check file path: `/prompts/companies/{company_id}/system-prompt.md`
- Ensure file has `.md` extension
- Restart Python backend
- Check logs for error messages

### AI Giving Wrong Answers
- Review your prompt for conflicting instructions
- Ensure JSON format requirements are intact
- Test with simple job descriptions first
- Compare to default prompt

### Need Help?
Contact support with:
- Your company ID
- The quote that failed
- Logs showing prompt loading
- Your custom prompt file
