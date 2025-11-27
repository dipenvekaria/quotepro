# SignNow Integration Guide

## Overview
This application uses SignNow for electronic signature collection on quotes. When a quote is sent to a customer, SignNow creates a signature request and emails it to the customer.

## Setup Steps

### 1. Create SignNow Account
1. Go to [SignNow Developer Portal](https://www.signnow.com/developers)
2. Sign up for a developer account (or use production account)
3. Create an application to get your API credentials

### 2. Get API Credentials
After creating your app, you'll receive:
- **Client ID**: Your application's client ID
- **Client Secret**: Your application's client secret
- **API Base URL**: 
  - Sandbox: `https://api-eval.signnow.com`
  - Production: `https://api.signnow.com`

### 3. Configure Environment Variables

Add these to your `.env.local` file:

```bash
# SignNow Configuration
SIGNNOW_CLIENT_ID=your_client_id_here
SIGNNOW_CLIENT_SECRET=your_client_secret_here
SIGNNOW_API_BASE_URL=https://api-eval.signnow.com  # Use api.signnow.com for production
SIGNNOW_USERNAME=your_signnow_email
SIGNNOW_PASSWORD=your_signnow_password
```

**Important**: For production, use OAuth2 flow instead of username/password. The current implementation uses Basic Auth for simplicity in development.

## How It Works

### Workflow
1. User clicks "Send Quote" in the dashboard
2. System generates a PDF of the quote
3. System uploads PDF to SignNow
4. System creates a signing link/invitation
5. System sends invitation email to customer
6. Customer receives email, clicks link, signs document
7. Webhook notifies your app when signed (optional)
8. System updates quote status to 'signed'

### Database Schema
The `signed_documents` table tracks signature requests:

```sql
CREATE TABLE signed_documents (
  id UUID PRIMARY KEY,
  quote_id UUID REFERENCES quotes(id),
  signnow_document_id TEXT,      -- SignNow document ID
  signnow_invite_id TEXT,          -- Signing invitation ID
  status TEXT,                      -- 'pending', 'signed', 'declined'
  signed_url TEXT,                  -- URL to signed document
  signed_at TIMESTAMP,
  created_at TIMESTAMP
);
```

## API Endpoints Used

### 1. OAuth2 Token (Authentication)
```
POST /oauth2/token
```
Gets access token for API calls.

### 2. Upload Document
```
POST /document
```
Uploads the PDF quote to SignNow.

### 3. Create Field Invite (Send for Signature)
```
POST /document/{document_id}/invite
```
Creates signing invitation and sends email to signer.

### 4. Get Document (Download Signed PDF)
```
GET /document/{document_id}/download
```
Downloads the signed PDF after completion.

## Testing

### Sandbox Testing
1. Set `SIGNNOW_API_BASE_URL=https://api-eval.signnow.com`
2. Use test credentials
3. Sign documents in sandbox mode
4. Verify status updates correctly

### Production Checklist
- [ ] Switch to production API URL
- [ ] Use production SignNow credentials
- [ ] Implement OAuth2 flow (not username/password)
- [ ] Set up webhook endpoints for status updates
- [ ] Test with real email addresses
- [ ] Verify PDF generation works correctly
- [ ] Test signature collection flow end-to-end

## Webhook Setup (Optional but Recommended)

SignNow can notify your app when documents are signed:

1. Create webhook endpoint: `/api/webhooks/signnow`
2. Register webhook in SignNow dashboard
3. Handle events: `document.signed`, `document.declined`, etc.
4. Update quote status automatically

## Troubleshooting

### Common Issues

**"Unauthorized" Error**
- Check your Client ID and Client Secret
- Verify API Base URL is correct
- Ensure username/password are correct

**PDF Upload Fails**
- Check PDF is valid and not corrupted
- Verify file size is under SignNow limits
- Ensure PDF endpoint is accessible

**Email Not Sent**
- Check customer email is valid
- Verify SignNow email settings
- Check spam folder

**Document Not Found**
- Document ID may be incorrect
- Document may have been deleted
- Check API base URL matches where document was created

## Migration from Dropbox Sign

The new implementation:
- ✅ Replaces `@dropbox/sign` with native SignNow API calls
- ✅ Updates database column from `dropbox_signature_request_id` to `signnow_document_id`
- ✅ Updates environment variable names
- ✅ Maintains same workflow (send quote → customer signs → status updates)

## Cost Comparison

**Dropbox Sign (HelloSign)**
- Paid plans start at $15/month
- Limited free tier

**SignNow**
- More affordable pricing
- Better API documentation
- More flexible plans
- Better suited for high-volume usage

## Support

- [SignNow API Documentation](https://docs.signnow.com/)
- [SignNow Developer Portal](https://www.signnow.com/developers)
- [API Reference](https://docs.signnow.com/docs/signnow/welcome)

## Next Steps

1. Get SignNow credentials from developer portal
2. Add environment variables to `.env.local`
3. Update database schema (add new columns)
4. Test in sandbox mode
5. Deploy to production
