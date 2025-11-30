# Gemini AI Prompts

This folder contains all prompt templates used throughout the QuotePro application for Gemini AI interactions.

## 🎯 Quick Start

**Default Setup (No Action Needed)**
- All companies automatically use default prompts
- Works out of the box, no configuration required

**Custom Prompts (Optional)**
- Create `/prompts/companies/{company_id}/` folder with custom prompt files
- Customize AI behavior for specific companies
- See `/prompts/companies/README.md` for details

## 📁 Structure

```
prompts/
├── README.md                          # This file
├── default-system-prompt.md           # Default quote generation system prompt
├── job-name-generation.md             # Job name generation system prompt
├── templates/                         # User prompt templates
│   ├── quote-generation-user.md       # Template for quote generation requests
│   ├── quote-update-user.md           # Template for quote update requests
│   └── job-name-user.md               # Template for job name requests
└── companies/
    ├── README.md                      # Guide for custom prompts
    └── {company_id}/
        ├── default-system-prompt.md   # Company-specific quote generation
        └── job-name-generation.md     # Company-specific job naming (optional)
```

## 🔄 How It Works

### System Prompts (AI Behavior)
1. **Python backend** calls `load_system_prompt(company_id, prompt_type)`
2. System checks for company-specific prompt first
3. Falls back to default prompt if no custom prompt exists
4. Loads prompt content and sends to Gemini

### User Prompts (Request Templates)
1. **Python backend** calls `load_user_prompt_template(template_name, variables)`
2. Loads template from `/prompts/templates/`
3. Replaces variables using `{{variable_name}}` format
4. Combines with system prompt for final request

## 🚀 Priority Order

**System Prompts:**
```
1. /prompts/companies/{company_id}/{prompt_type}.md  ← Company-specific
2. /prompts/{prompt_type}.md                          ← Default
3. Hardcoded in main.py                               ← Fallback
```

**User Prompts:**
```
1. /prompts/templates/{template_name}.md              ← Always used
(Templates use {{variable}} placeholders filled at runtime)
```

## 🎨 Prompt Types

### System Prompts (Customize AI Behavior)

| Type | File | Purpose | Customizable? |
|------|------|---------|---------------|
| **Quote Generation** | `default-system-prompt.md` | Main quote generation AI instructions | ✅ Per company |
| **Job Name** | `job-name-generation.md` | Job naming rules and examples | ✅ Per company |

### User Prompts (Request Templates)

| Template | File | Variables | Purpose |
|----------|------|-----------|---------|
| **Quote Generation** | `templates/quote-generation-user.md` | `customer_name`, `description`, `catalog_text`, `existing_items_section`, `tax_rate` | Initial quote generation |
| **Quote Update** | `templates/quote-update-user.md` | `customer_name`, `existing_items_text`, `user_prompt`, `tax_rate` | Modify existing quote |
| **Job Name** | `templates/job-name-user.md` | `description` | Generate job name |

## 💡 Use Cases

### Scenario 1: Standard Setup (Most Companies)
- Use default prompts as-is
- No custom files needed
- Consistent AI behavior across all companies

### Scenario 2: Industry-Specific Customization
**HVAC Company:**
- Copy `default-system-prompt.md` to company folder
- Add industry-specific rules: "Always mention SEER ratings"
- Customize job naming: "AC Unit Replacement" instead of "HVAC Installation"

**Plumbing Company:**
- Emphasize code compliance and permit fees
- Different tone and terminology

**Electrical Company:**
- Focus on safety and panel capacity
- Mention GFCI protection requirements

### Scenario 3: Custom User Prompts
**Edit templates for all companies:**
- Modify `/prompts/templates/quote-generation-user.md` to change request format
- Update variable placeholders: `{{variable_name}}`
- Changes apply to all future quote generations

### Scenario 4: Testing New Prompts
- Copy default prompt to company folder
- Test changes with one company
- Roll out to all companies by updating default

## 🛠️ For Developers

### Loading System Prompts in Python

```python
from main import load_system_prompt

# Load quote generation prompt for specific company
prompt = load_system_prompt(company_id="123", prompt_type="quote-generation")

# Load job name generation prompt (default, no company)
prompt = load_system_prompt(prompt_type="job-name-generation")
```

### Loading User Prompt Templates

```python
from main import load_user_prompt_template

# Load and render quote generation template
user_prompt = load_user_prompt_template('quote-generation-user', {
    'customer_name': 'John Doe',
    'description': 'Install HVAC system',
    'catalog_text': 'Item 1 - $100\nItem 2 - $200',
    'existing_items_section': '',
    'tax_rate': 8.5
})
```

### Adding New Prompt Types

1. Create system prompt file: `/prompts/new-prompt-type.md`
2. Create user template (if needed): `/prompts/templates/new-template-user.md`
3. Call in code: `load_system_prompt(company_id, prompt_type="new-prompt-type")`
4. Company override: `/prompts/companies/{id}/new-prompt-type.md`

### Adding Custom Company Prompts

**Find Your Company ID First:**
- Supabase: Check `companies` table → `id` column
- Browser: Console → Check network requests for `company_id`
- Backend: Generate quote → Check logs for company ID

**Create Custom Prompt:**
```bash
# Replace YOUR-COMPANY-ID with actual UUID from Supabase
mkdir -p prompts/companies/YOUR-COMPANY-ID

# Copy default prompt as starting point
cp prompts/default-system-prompt.md prompts/companies/YOUR-COMPANY-ID/system-prompt.md

# Edit the custom prompt
nano prompts/companies/YOUR-COMPANY-ID/system-prompt.md

# No restart needed - changes take effect immediately on next quote generation
```

**Example:**
```bash
# Real example with UUID
mkdir -p prompts/companies/550e8400-e29b-41d4-a716-446655440000
cp prompts/default-system-prompt.md prompts/companies/550e8400-e29b-41d4-a716-446655440000/system-prompt.md
```

## 📝 Best Practices

1. **Version Control** - Commit all prompt changes to git
2. **Test First** - Test custom prompts before deploying
3. **Document Changes** - Add comments explaining modifications
4. **Keep Backups** - Save old versions before major changes
5. **Monitor Results** - Track quote quality after prompt updates

## 🔍 Debugging

### Check Which Prompt Loaded

Look for these log messages in Python backend:
```
✅ Loading company-specific prompt for: company_123
✅ Loading default system prompt
⚠️ Using hardcoded system prompt (prompt files not found)
```

### Test Prompt Loading

```bash
# Check if default prompt exists
ls prompts/default-system-prompt.md

# Check company prompt
ls prompts/companies/YOUR_COMPANY_ID/system-prompt.md

# View logs
tail -f python-backend/logs.txt
```

## 📚 Related Documentation

- Company-specific prompts: `/prompts/companies/README.md`
- Python backend: `/python-backend/main.py` (see `load_system_prompt()` and `load_user_prompt_template()`)
- API docs: `/docs/` (coming soon)

## 📝 Summary

**What's Customizable:**
- ✅ Quote generation AI behavior (per company)
- ✅ Job name generation rules (per company)
- ✅ User prompt templates (global, affects all companies)

**What's NOT Customizable:**
- Model selection (always Gemini 2.0 Flash)
- Temperature and generation config
- API endpoints and request/response formats

**Files You Can Edit:**
- `/prompts/default-system-prompt.md` - Default quote generation behavior
- `/prompts/job-name-generation.md` - Default job naming rules
- `/prompts/templates/*.md` - User request templates (variables: `{{name}}`)
- `/prompts/companies/{id}/*.md` - Company-specific overrides

**Changes Take Effect:**
- ✅ Immediately on next API call (no restart needed)
- Files are re-read every time Gemini is called
