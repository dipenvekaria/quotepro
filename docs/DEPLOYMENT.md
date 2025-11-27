# QuoteBuilder Pro - Deployment Guide

## 🚀 Step-by-Step Deployment to Vercel

### 1. Supabase Setup

1. **Create a Supabase Project**
   - Go to [supabase.com](https://supabase.com) and create a free account
   - Create a new project
   - Note your project URL and anon key

2. **Run Database Migration**
   - Go to SQL Editor in your Supabase dashboard
   - Copy the entire content from `supabase/migrations/001_initial_schema.sql`
   - Paste and run the query

3. **Create Storage Bucket**
   - Go to Storage in Supabase dashboard
   - Create a new bucket called `logos`
   - Make it **public**
   - Set policies to allow uploads from authenticated users

4. **Configure Email Auth**
   - Go to Authentication > Settings
   - Set Site URL to your app URL (e.g., `https://yourapp.vercel.app`)
   - Add redirect URLs for auth callbacks

### 2. Get API Keys

**Groq (Free Tier Available)**
- Visit [console.groq.com](https://console.groq.com)
- Sign up and create an API key
- Free tier includes generous limits

**Twilio**
- Sign up at [twilio.com](https://twilio.com)
- Get a phone number
- Copy Account SID and Auth Token

**Dropbox Sign**
- Sign up at [sign.dropbox.com](https://sign.dropbox.com)
- Get API key from settings

**Lemon Squeezy**
- Create account at [lemonsqueezy.com](https://lemonsqueezy.com)
- Create a store
- Get API key and Store ID

### 3. Deploy to Vercel

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin YOUR_GITHUB_REPO_URL
   git push -u origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Import Project"
   - Select your GitHub repository
   - Configure environment variables (see below)
   - Deploy!

3. **Environment Variables in Vercel**

   Go to Project Settings > Environment Variables and add:

   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   GROQ_API_KEY=your_groq_key
   OPENROUTER_API_KEY=your_openrouter_key (optional)
   TWILIO_ACCOUNT_SID=your_twilio_sid
   TWILIO_AUTH_TOKEN=your_twilio_token
   TWILIO_PHONE_NUMBER=your_twilio_number
   DROPBOX_SIGN_API_KEY=your_dropbox_key
   DROPBOX_SIGN_CLIENT_ID=your_dropbox_client_id
   LEMON_SQUEEZY_API_KEY=your_ls_key
   LEMON_SQUEEZY_STORE_ID=your_ls_store_id
   LEMON_SQUEEZY_WEBHOOK_SECRET=your_ls_webhook
   NEXT_PUBLIC_APP_URL=https://yourapp.vercel.app
   ```

### 4. Post-Deployment Setup

1. **Update Supabase Site URL**
   - Go back to Supabase > Authentication > Settings
   - Update Site URL to your Vercel URL
   - Add to Redirect URLs: `https://yourapp.vercel.app/auth/callback`

2. **Test the Flow**
   - Sign up for an account
   - Complete onboarding
   - Create a test quote
   - Test AI generation
   - Test PDF download

3. **Set Up Lemon Squeezy Products**
   - Create three products in Lemon Squeezy:
     - Starter: $129/mo
     - Pro: $199/mo
     - Enterprise: $329/mo
   - Enable 14-day free trial

### 5. Custom Domain (Optional)

1. Go to Vercel project settings
2. Add your custom domain
3. Update DNS records as instructed
4. Update `NEXT_PUBLIC_APP_URL` environment variable
5. Update Supabase redirect URLs

### 6. Monitoring & Analytics

- Enable Vercel Analytics in project settings
- Monitor Supabase usage in dashboard
- Check Groq API usage limits
- Set up error tracking (Sentry recommended)

## 🧪 Testing Checklist

- [ ] Sign up and login works
- [ ] Onboarding flow completes
- [ ] Default pricing items load
- [ ] New quote creation works
- [ ] AI quote generation works
- [ ] Photo upload works
- [ ] PDF generation works
- [ ] SMS sending works (with real Twilio credentials)
- [ ] Dashboard displays correctly
- [ ] PWA can be installed on mobile
- [ ] Dark mode toggle works

## 🐛 Common Issues

**Issue: AI generation fails**
- Check Groq API key is valid
- Verify pricing catalog has items
- Check API quota limits

**Issue: Authentication redirect fails**
- Verify Supabase Site URL is correct
- Check redirect URLs include /auth/callback
- Ensure NEXT_PUBLIC_APP_URL is set

**Issue: File upload fails**
- Confirm logos bucket exists in Supabase
- Verify bucket is set to public
- Check storage policies

**Issue: SMS not sending**
- Verify Twilio credentials
- Check phone number format
- Ensure Twilio account has balance

## 📈 Scaling Tips

1. **Database Performance**
   - Add indexes for frequently queried fields
   - Use Supabase connection pooling
   - Consider read replicas for high traffic

2. **API Rate Limits**
   - Implement caching for pricing catalogs
   - Add rate limiting middleware
   - Monitor Groq API usage

3. **Cost Optimization**
   - Use Supabase free tier initially
   - Monitor Vercel bandwidth usage
   - Optimize images and assets
   - Consider CDN for static assets

## 🔒 Security Checklist

- [ ] All environment variables are secure
- [ ] RLS policies are enabled on all tables
- [ ] File uploads are validated
- [ ] API routes have proper authentication
- [ ] HTTPS is enforced
- [ ] CORS is properly configured

## 📞 Support

For issues or questions:
- Check the troubleshooting section above
- Review Supabase logs
- Check Vercel deployment logs
- Contact support@quotebuilder.pro

---

**You're ready to launch! 🚀**
