# QuoteBuilder Pro

**Win more jobs in seconds, not minutes.**

A production-ready, mobile-first SaaS for U.S. & Canadian home-service contractors (HVAC, plumbing, electrical, roofing, landscaping, pest control, garage door, window installation).

Stop writing quotes in Word/Excel on your phone in driveways. QuoteBuilder Pro helps you look professional, close faster, and never forget upsells.

---

## 🚀 Features

- **AI-Powered Quote Generation**: Groq Llama-3.1-70B converts bullet points into polished quotes
- **Mobile-First Design**: Built for contractors in the field
- **Voice Input**: Hold-to-talk for hands-free description entry
- **Photo Upload**: Live camera integration for job site documentation
- **Professional PDFs**: Gorgeous templates with Good/Better/Best options
- **SMS & E-Signatures**: Send quotes via Twilio, sign with Dropbox Sign
- **Smart Pricing**: 50 pre-filled items for common trades + CSV import
- **Dashboard Analytics**: Win rate, average job size, monthly metrics
- **PWA Ready**: Installable on mobile devices

---

## 🛠 Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (Auth, PostgreSQL, Storage)
- **AI**: Groq (primary), OpenRouter (fallback)
- **Payments**: Lemon Squeezy
- **SMS**: Twilio
- **E-Signatures**: Dropbox Sign
- **PDFs**: @react-pdf/renderer
- **Deployment**: Vercel

---

## 📦 Quick Start

### Prerequisites

1. **Supabase Account** ([supabase.com](https://supabase.com))
   - Create a new project
   - Run the SQL migration from `supabase/migrations/001_initial_schema.sql`
   - Create a storage bucket named `logos` (public)
   - Copy your project URL and anon key

2. **Groq API Key** ([console.groq.com](https://console.groq.com))
   - Sign up for free
   - Generate an API key

3. **Twilio Account** ([twilio.com](https://twilio.com))
   - Get Account SID, Auth Token, and a phone number

4. **Dropbox Sign API Key** ([sign.dropbox.com](https://sign.dropbox.com))
   - Sign up and get API credentials

5. **Lemon Squeezy Account** ([lemonsqueezy.com](https://lemonsqueezy.com))
   - Create a store
   - Get API key and Store ID

### Environment Variables

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

---

## 🗄 Database Setup

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the content from `supabase/migrations/001_initial_schema.sql`
4. Run the query
5. Go to **Storage** and create a bucket named `logos` with public access

---

## 📱 PWA Installation

QuoteBuilder Pro can be installed on mobile devices:

1. Open the app in Safari (iOS) or Chrome (Android)
2. Tap "Share" → "Add to Home Screen"
3. Access like a native app with offline support

---

## 💰 Pricing Plans

- **Starter**: $129/mo – Up to 300 quotes
- **Pro**: $199/mo – Unlimited + QuickBooks sync (coming soon)
- **Enterprise**: $329/mo – White-label + priority support
- **14-day free trial** – No credit card required

---

## 🎨 Brand Guidelines

- **Primary Color**: Dark Blue (#0F172A)
- **Accent Color**: Orange (#FF6200)
- **Tone**: Confident, no-BS, blue-collar professional
- **Tagline**: "Win more jobs in seconds, not minutes."

---

## 📄 Key Pages

| Route | Description |
|-------|-------------|
| `/` | Redirects to login |
| `/login` | Authentication page |
| `/onboarding` | 3-step setup wizard |
| `/dashboard` | Metrics & recent quotes |
| `/quotes/new` | Mobile-first quote builder |

---

## 🚢 Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. Push code to GitHub
2. Import repository in Vercel
3. Add environment variables
4. Deploy!

---

## 📝 License

MIT License

---

**Built with ❤️ for hardworking contractors who deserve better tools.**
