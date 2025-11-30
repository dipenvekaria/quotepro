# QuotePro Prompt System - Full Customization

## ✅ What Changed

All AI prompts are now file-based and fully customizable without code changes.

## 📁 New File Structure

```
prompts/
├── default-system-prompt.md           # Quote generation AI behavior
├── job-name-generation.md             # Job naming AI behavior  
├── templates/                         # User request templates
│   ├── quote-generation-user.md       # Quote generation request format
│   ├── quote-update-user.md           # Quote update request format
│   └── job-name-user.md               # Job name request format
└── companies/
    └── {company_id}/
        ├── default-system-prompt.md   # Company-specific quote generation
        └── job-name-generation.md     # Company-specific job naming (optional)
```

## 🎯 Customization Levels

### Level 1: Global Defaults (Affects All Companies)
**System Prompts:**
- `/prompts/default-system-prompt.md` - How AI generates quotes
- `/prompts/job-name-generation.md` - How AI creates job names

**User Templates:**
- `/prompts/templates/quote-generation-user.md` - Quote request format
- `/prompts/templates/quote-update-user.md` - Update request format  
- `/prompts/templates/job-name-user.md` - Job name request format

### Level 2: Per-Company Overrides
**Create company folder:**
```bash
mkdir -p prompts/companies/YOUR-COMPANY-ID
```

**Copy and customize:**
```bash
# Required: Quote generation
cp prompts/default-system-prompt.md prompts/companies/YOUR-COMPANY-ID/default-system-prompt.md

# Optional: Job naming
cp prompts/job-name-generation.md prompts/companies/YOUR-COMPANY-ID/job-name-generation.md
```

## 🔧 Code Changes

### New Functions

**`load_system_prompt(company_id, prompt_type)`**
- Loads system prompts with company-specific overrides
- Prompt types: `"quote-generation"`, `"job-name-generation"`
- Priority: company-specific → default → hardcoded fallback

**`load_user_prompt_template(template_name, variables)`**
- Loads user request templates
- Replaces `{{variable}}` placeholders with actual values
- Templates: `"quote-generation-user"`, `"quote-update-user"`, `"job-name-user"`

### Updated Endpoints

**1. `/api/generate-quote`**
```python
system_prompt = load_system_prompt(company_id, "quote-generation")
user_prompt = load_user_prompt_template('quote-generation-user', {
    'customer_name': name,
    'description': desc,
    'catalog_text': catalog,
    'existing_items_section': items,
    'tax_rate': rate
})
```

**2. `/api/update-quote-with-ai`**
```python
system_prompt = load_system_prompt(company_id, "quote-generation")
user_prompt = load_user_prompt_template('quote-update-user', {
    'customer_name': name,
    'existing_items_text': items,
    'user_prompt': request,
    'tax_rate': rate
})
```

**3. `/api/generate-job-name`**
```python
system_prompt = load_system_prompt(None, "job-name-generation")
user_prompt = load_user_prompt_template('job-name-user', {
    'description': desc
})
```

## 🚀 Benefits

### Before (Hardcoded)
- ❌ Prompts buried in Python code
- ❌ Required code changes to update prompts
- ❌ Same behavior for all companies
- ❌ No version control for prompt changes
- ❌ Hard to test prompt variations

### After (File-Based)
- ✅ Prompts in readable markdown files
- ✅ Update prompts without touching code
- ✅ Company-specific customization
- ✅ Git version control for all prompts
- ✅ Easy A/B testing (create company folder, test)
- ✅ Changes take effect immediately (no restart)

## 📝 Example: HVAC Company Customization

**1. Get company ID from Supabase:**
```
Company ID: abc-123-xyz-789
```

**2. Create company folder:**
```bash
mkdir -p prompts/companies/abc-123-xyz-789
```

**3. Copy and customize quote generation:**
```bash
cp prompts/default-system-prompt.md prompts/companies/abc-123-xyz-789/default-system-prompt.md
```

**4. Edit the file to add HVAC-specific rules:**
```markdown
You are an expert HVAC technician with 20 years experience.

ADDITIONAL RULES FOR HVAC QUOTES:
- Always mention SEER ratings for AC units
- Suggest seasonal maintenance plans
- Include warranty options (5-year, 10-year, lifetime)
- Emphasize energy efficiency savings
- Calculate ROI for high-efficiency upgrades
```

**5. Generate quote:**
- Company `abc-123-xyz-789` now uses custom prompt
- All other companies use default prompt
- No code changes needed
- No server restart needed

## 🧪 Testing

**Test default prompts:**
```bash
# Generate quote without company override
# Check logs: "✅ Loading default quote-generation prompt"
```

**Test company-specific prompts:**
```bash
# 1. Create test company folder
mkdir -p prompts/companies/test-123

# 2. Copy and modify prompt
cp prompts/default-system-prompt.md prompts/companies/test-123/default-system-prompt.md
echo "TEST MODE: Always add 'TEST QUOTE' to notes" >> prompts/companies/test-123/default-system-prompt.md

# 3. Generate quote with company_id="test-123"
# Check logs: "✅ Loading company-specific quote-generation prompt for: test-123"

# 4. Verify "TEST QUOTE" appears in quote notes
```

## 📚 Documentation

- Main README: `/prompts/README.md`
- Company guide: `/prompts/companies/README.md`
- Template variables: See individual `.md` files in `/prompts/templates/`

## 🎉 Summary

**All 3 AI endpoints now use file-based prompts:**
1. ✅ Quote generation - Fully customizable
2. ✅ Quote updates - Fully customizable
3. ✅ Job name generation - Fully customizable

**Zero hardcoded prompts in production code** (hardcoded versions kept as safety fallback only)

**Multi-tenant ready:** Each company can have different AI behavior without code forks.
