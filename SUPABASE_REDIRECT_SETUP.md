# 🔐 Supabase Redirect URLs Configuration

## ⚠️ IMPORTANT: This is why you're seeing a blank page!

Your Google OAuth callback needs the correct redirect URLs configured in Supabase.

---

## 📍 Go to Supabase Dashboard

1. **Open:** https://ajljduisjyutbgjeucig.supabase.co
2. **Click:** Authentication (left sidebar)
3. **Click:** URL Configuration tab

---

## ✅ Set These Values:

### **Site URL:**
```
http://localhost:3000
```

### **Redirect URLs (Add ALL of these):**
```
http://localhost:3000
http://localhost:3000/
http://localhost:3000/auth/callback
http://192.168.0.100:3000
http://192.168.0.100:3000/
http://192.168.0.100:3000/auth/callback
```

**Why all these?** You're accessing from network IP (192.168.0.100), so we need to allow both `localhost` AND your network IP.

---

## 🎯 After Updating:

1. **Clear your browser cookies** for localhost
2. Go to: http://192.168.0.100:3000
3. Click **"Continue with Google"**
4. You should now be redirected properly to:
   - `/onboarding` (if new user)
   - `/dashboard` (if returning user)

---

## 🐛 Still Seeing Blank Page?

Try these:

1. **Use localhost instead of network IP:**
   - Go to: http://localhost:3000
   - Try Google login from there

2. **Check browser console for errors:**
   - Open Developer Tools (F12)
   - Look for any red errors
   - Share them if stuck

3. **Verify Google OAuth is enabled:**
   - Go to Authentication → Providers in Supabase
   - Make sure "Google" is enabled (toggle should be ON)

---

## ✨ What I Just Fixed:

- ✅ Updated root page (`/`) to handle OAuth callbacks
- ✅ Changed Google OAuth redirect to point to `/` 
- ✅ Added logic to check if user needs onboarding
- ✅ Proper redirect to `/onboarding` or `/dashboard`

Now the flow is:
1. Click "Continue with Google" → Google login
2. Redirect to `/?code=xxx` → Root page handles callback
3. Check if company exists → Redirect accordingly

---

**Next Step:** Update those Supabase redirect URLs, then try again! 🚀
