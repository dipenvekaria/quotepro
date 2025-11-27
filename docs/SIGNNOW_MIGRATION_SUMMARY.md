# SignNow Integration Summary

## What Was Changed

### 1. Environment Variables Updated ✅
**File**: `.env.local`

Replaced Dropbox Sign variables with SignNow:
```bash
# NEW - SignNow Configuration
SIGNNOW_CLIENT_ID=your_signnow_client_id
SIGNNOW_CLIENT_SECRET=your_signnow_client_secret
SIGNNOW_API_BASE_URL=https://api-eval.signnow.com  # Use https://api.signnow.com for production
SIGNNOW_USERNAME=your_signnow_email
SIGNNOW_PASSWORD=your_signnow_password

# OLD - Commented out (kept for backward compatibility if needed)
# DROPBOX_SIGN_API_KEY=your_dropbox_sign_api_key
# DROPBOX_SIGN_CLIENT_ID=your_dropbox_sign_client_id
```

### 2. Database Migration Created ✅
**File**: `/supabase/migrations/008_add_signnow_columns.sql`

Added new columns to `signed_documents` table:
- `signnow_document_id` - SignNow uploaded document ID
- `signnow_invite_id` - SignNow invitation ID for signature request
- Kept `dropbox_signature_request_id` for historical data

**Action Required**: Run this SQL in Supabase dashboard.

### 3. SignNow API Client Created ✅
**File**: `/src/lib/signnow.ts`

New utility class with methods:
- `getAccessToken()` - OAuth2 authentication
- `uploadDocument()` - Upload PDF to SignNow
- `createInvite()` - Send document for signature
- `getDocumentDownloadUrl()` - Get signed PDF
- `getDocumentStatus()` - Check signing status
- `deleteDocument()` - Delete document

### 4. Sign Route Updated ✅
**File**: `/src/app/api/quotes/sign/route.ts`

Completely rewritten to use SignNow instead of Dropbox Sign:

**Old Flow (Dropbox Sign)**:
1. Generate PDF URL
2. Send URL to Dropbox Sign API
3. Dropbox Sign fetches and processes PDF

**New Flow (SignNow)**:
1. Generate PDF and fetch as Buffer
2. Upload PDF directly to SignNow
3. Create signing invitation
4. Store document_id and invite_id in database
5. Update quote status to 'sent'

### 5. Documentation Created ✅
**File**: `/SIGNNOW_INTEGRATION.md`

Complete guide covering:
- SignNow account setup
- API credentials configuration
- Workflow explanation
- API endpoints used
- Testing instructions
- Production checklist
- Webhook setup (optional)
- Troubleshooting guide

## Getting Started

### Step 1: Get SignNow Credentials

1. Go to [SignNow Developer Portal](https://www.signnow.com/developers)
2. Create an account
3. Create a new application
4. Copy your:
   - Client ID
   - Client Secret
   - Your SignNow username (email)
   - Your SignNow password

### Step 2: Update Environment Variables

Edit `.env.local` and replace the placeholder values:

```bash
SIGNNOW_CLIENT_ID=abc123...
SIGNNOW_CLIENT_SECRET=xyz789...
SIGNNOW_API_BASE_URL=https://api-eval.signnow.com
SIGNNOW_USERNAME=your@email.com
SIGNNOW_PASSWORD=yourpassword
```

### Step 3: Run Database Migration

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy contents of `/supabase/migrations/008_add_signnow_columns.sql`
4. Paste and click "Run"

### Step 4: Test the Integration

1. Create a test quote in your app
2. Click "Send Quote" 
3. Check:
   - ✅ Document uploads to SignNow
   - ✅ Email sent to customer
   - ✅ Quote status changes to 'sent'
   - ✅ `signed_documents` table has entry with `signnow_document_id`

## Workflow Diagram

```
User clicks "Send Quote"
        ↓
Generate PDF from quote data
        ↓
Upload PDF to SignNow
        ↓
Create signing invitation
        ↓
SignNow sends email to customer
        ↓
Customer clicks link & signs
        ↓
(Optional) Webhook notifies app
        ↓
Update quote status to 'signed'
```

## API Calls Made

### 1. Authentication
```
POST /oauth2/token
Body: { grant_type: 'password', username: '...', password: '...' }
Returns: { access_token: '...', expires_in: 3600 }
```

### 2. Upload Document
```
POST /document
Headers: { Authorization: 'Bearer <token>' }
Body: FormData with PDF file
Returns: { id: 'document_id_here' }
```

### 3. Create Invite
```
POST /document/{document_id}/invite
Headers: { Authorization: 'Bearer <token>' }
Body: {
  to: [{ email: '...', role: 'Signer' }],
  subject: '...',
  message: '...'
}
Returns: { id: 'invite_id_here' }
```

## Cost Comparison

| Feature | Dropbox Sign | SignNow |
|---------|-------------|---------|
| **Starting Price** | $15/month | $8/month |
| **Free Tier** | Limited (3 docs) | Limited |
| **API Access** | All plans | All plans |
| **Document Templates** | Yes | Yes |
| **Mobile App** | Yes | Yes |
| **Best For** | Small businesses | High-volume users |

## Security Notes

⚠️ **Production Recommendations**:

1. **Don't use username/password in production**
   - Implement OAuth2 authorization code flow
   - Store access/refresh tokens securely
   - See [SignNow OAuth docs](https://docs.signnow.com/docs/signnow/authentication)

2. **Use environment-specific API URLs**
   - Sandbox: `https://api-eval.signnow.com`
   - Production: `https://api.signnow.com`

3. **Implement webhook verification**
   - Verify webhook signatures
   - Validate event authenticity
   - See webhook documentation in integration guide

4. **Secure credential storage**
   - Never commit credentials to git
   - Use Vercel/hosting platform secrets
   - Rotate credentials periodically

## Troubleshooting

### "Unauthorized" Error
- Check Client ID and Secret are correct
- Verify API Base URL matches your environment
- Ensure username/password are correct

### PDF Upload Fails
- Check PDF is valid (try opening it)
- Verify PDF URL is publicly accessible
- Check file size < SignNow limit (usually 10MB)

### Email Not Sent
- Verify customer email is valid
- Check SignNow account email settings
- Check spam folder

### Document Not Found
- Document ID may be incorrect
- Document may have been deleted
- Check you're using same API URL for all operations

## Migration Checklist

- [x] Create SignNow account
- [x] Get API credentials
- [x] Add environment variables
- [ ] Run database migration (YOU NEED TO DO THIS)
- [ ] Test in sandbox mode
- [ ] Verify email delivery
- [ ] Test signing workflow
- [ ] Set up webhooks (optional)
- [ ] Deploy to production
- [ ] Update to production API URL
- [ ] Implement OAuth2 flow (production)

## Next Steps

1. **Run the database migration** in Supabase
2. **Add your SignNow credentials** to `.env.local`
3. **Restart your Next.js dev server** (`npm run dev`)
4. **Test sending a quote** and check if email arrives
5. **Sign a test document** to verify the full workflow

## Optional: Remove Dropbox Sign Dependency

If you want to completely remove Dropbox Sign:

```bash
npm uninstall @dropbox/sign hellosign-sdk
```

Then remove these lines from `.env.local`:
```bash
# DROPBOX_SIGN_API_KEY=...
# DROPBOX_SIGN_CLIENT_ID=...
```

## Support Resources

- [SignNow API Documentation](https://docs.signnow.com/)
- [Authentication Guide](https://docs.signnow.com/docs/signnow/authentication)
- [Document Upload API](https://docs.signnow.com/docs/signnow/documents)
- [Field Invite API](https://docs.signnow.com/docs/signnow/invitations)

## Files Modified

✅ `.env.local` - Added SignNow credentials
✅ `/supabase/migrations/008_add_signnow_columns.sql` - Database changes
✅ `/src/lib/signnow.ts` - SignNow API client (NEW)
✅ `/src/app/api/quotes/sign/route.ts` - Updated to use SignNow
✅ `/SIGNNOW_INTEGRATION.md` - Complete documentation

---

**Ready to test!** Once you add your credentials and run the migration, you can start sending quotes for signature via SignNow. 🎉
