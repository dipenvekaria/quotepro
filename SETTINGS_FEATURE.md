# Settings Feature Documentation

## Overview
The Settings page provides comprehensive account, company, pricing, and quote management capabilities.

## Access
- Settings icon (⚙) in the dashboard header
- Navigate to `/settings` route
- Back button returns to dashboard

## Tabs & Features

### 1. Company Profile Tab
Manage company information that appears on quotes:
- **Company Name**: Business name shown on all quotes
- **Phone Number**: Contact number for customers
- **Company Email**: Business email address
- **Company Address**: Full business address
- **Company Logo**: Upload/update logo (appears on quotes)

**Actions:**
- Upload new logo (image files)
- Update any field
- Save changes with "Save Company Info" button

### 2. Pricing Tab
Manage your pricing catalog for quick quote generation:

**Add New Items:**
- Item Name (e.g., "HVAC Unit Installation")
- Price (decimal format)
- Category (Labor, Materials, Equipment, Permits, Other)

**Manage Existing Items:**
- Organized by category with item counts
- Edit pricing items inline
- Delete items with confirmation dialog
- Real-time search and filtering

**Categories:**
- Labor
- Materials
- Equipment
- Permits
- Other

### 3. Quote Settings Tab
Set defaults for all new quotes:
- **Default Terms & Conditions**: Auto-populated legal terms
- **Default Notes**: Standard notes for all quotes
- **Quote Valid For**: Number of days quote remains valid (default: 30)

### 4. Account Tab
Manage login and subscription:

**Account Information:**
- Email address (read-only, contact support to change)
- Change password functionality
- Password confirmation required

**Subscription:**
- Current plan status (Free Trial shown)
- Days remaining
- Upgrade to paid plan link

**Danger Zone:**
- Sign out button

## Database Schema Updates

### New Columns Added to `companies` Table:
```sql
default_terms TEXT          -- Default terms & conditions
default_notes TEXT          -- Default quote notes
default_valid_days INTEGER  -- Days quote is valid (default: 30)
```

### Migration File:
`supabase/migrations/002_add_company_defaults.sql`

## User Experience

### Design Principles:
- Clean, minimal design (no decorative icons)
- Settings icon (⚙) in consistent header location
- Tab-based navigation for easy context switching
- Form validation and error handling
- Success/error toast notifications
- Loading states for async operations

### Responsive Design:
- Mobile-first approach
- Grid layouts adjust for screen size
- Touch-friendly buttons and inputs
- Accessible form controls

## Security
- All data protected by Row Level Security (RLS)
- Users can only access their own company data
- Password changes require confirmation
- File uploads validated and stored securely

## Integration Points

### Dashboard:
- Settings icon in header
- Quick access from any page via back button

### Quotes:
- Default terms/notes auto-populate new quotes
- Pricing catalog used in quote generation
- Company info appears on quote PDFs

### Onboarding:
- Initial company setup flows into settings
- Pricing items established during onboarding

## Future Enhancements
- CSV import/export for pricing items
- Bulk pricing updates
- Custom categories
- Quote templates
- Branding customization (colors, fonts)
- Team member management
- Notification preferences
- Integration settings (Dropbox, payment gateways)
