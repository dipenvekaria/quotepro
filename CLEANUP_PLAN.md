# Repository Cleanup Report

## Files to Remove (Redundant/Obsolete)

### 📄 Documentation Files (Move to Archive or Delete)

These are historical/debugging documents that are no longer needed:

1. **BUILD_SUMMARY.md** - Outdated build summary (already in README.md)
2. **GROQ_MODEL_FIX.md** - One-time fix documentation (fixed in code)
3. **FIX_GOOGLE_OAUTH_REDIRECT.md** - OAuth debugging guide (not needed anymore)
4. **GOOGLE_AUTH_SETUP.md** - Redundant OAuth setup (in DEPLOYMENT.md)
5. **SUPABASE_REDIRECT_SETUP.md** - OAuth redirect setup (redundant)
6. **SETUP_LOCAL_DOMAIN.md** - Local domain setup (use MOBILE_TESTING.md instead)
7. **FEATURES_UPDATE.md** - Feature changelog (should be in CHANGELOG.md)
8. **PRICING_PAGE.md** - Specific feature docs (should be in main README)
9. **SETTINGS_FEATURE.md** - Specific feature docs (should be in main README)
10. **TEAM_ROLES_IMPLEMENTATION.md** - Implementation notes (not needed for users)

### 🔧 Configuration/Debugging Scripts (Obsolete)

These were one-time setup/debugging scripts:

1. **check-oauth.sh** - OAuth debugging (no longer needed)
2. **setup-oauth.sh** - OAuth setup helper (no longer needed)
3. **configure-oauth.js** - OAuth configuration script (no longer needed)
4. **find-google-oauth.js** - Google OAuth finder (no longer needed)
5. **check-supabase-auth.js** - Auth checker (no longer needed)
6. **setup-mobile-wifi.sh** - Mobile setup (merge into one script or remove)
7. **setup-ngrok.sh** - Ngrok setup (merge into one script or remove)
8. **start-tunnel.sh** - Tunnel starter (merge into one script or remove)

### ✅ Files to Keep

**Core Documentation:**
- README.md (main project readme)
- DEPLOYMENT.md (deployment instructions)
- SUPABASE_SETUP.md (initial setup)
- QUICK_START.md (getting started)
- MOBILE_TESTING.md (mobile testing guide)
- TAX_CALCULATION_FEATURE.md (feature documentation)
- python-backend/README.md (Python backend docs)

**Scripts:**
- python-backend/setup.sh (Python setup)
- python-backend/start-server.sh (Python server starter)

## Recommended Actions

### 1. Create Archive Directory
```bash
mkdir -p docs/archive
mv BUILD_SUMMARY.md docs/archive/
mv GROQ_MODEL_FIX.md docs/archive/
mv FIX_GOOGLE_OAUTH_REDIRECT.md docs/archive/
mv GOOGLE_AUTH_SETUP.md docs/archive/
mv SUPABASE_REDIRECT_SETUP.md docs/archive/
mv SETUP_LOCAL_DOMAIN.md docs/archive/
mv FEATURES_UPDATE.md docs/archive/
mv PRICING_PAGE.md docs/archive/
mv SETTINGS_FEATURE.md docs/archive/
mv TEAM_ROLES_IMPLEMENTATION.md docs/archive/
```

### 2. Remove Obsolete Scripts
```bash
rm check-oauth.sh
rm setup-oauth.sh
rm configure-oauth.js
rm find-google-oauth.js
rm check-supabase-auth.js
rm setup-mobile-wifi.sh
rm setup-ngrok.sh
rm start-tunnel.sh
```

### 3. Consolidate Documentation

Create **ARCHITECTURE.md:**
- System architecture overview
- Component relationships
- Database schema
- API structure

Create **DEVELOPMENT.md:**
- Local development setup
- Testing guidelines
- Code style guide
- Contributing guidelines

Update **README.md** to include:
- Quick feature overview from removed docs
- Link to all other docs

### 4. Update .gitignore

Add to .gitignore:
```
# Temporary documentation
docs/archive/
*.log
*.tmp

# Python
python-backend/__pycache__/
python-backend/venv/
python-backend/.env

# Next.js
.next/
node_modules/
.env.local
```

## Summary

**Total Files to Archive:** 10 documentation files
**Total Files to Delete:** 8 scripts
**Documentation to Create:** 2 new files (ARCHITECTURE.md, DEVELOPMENT.md)
**Documentation to Update:** 1 file (README.md)

This cleanup will:
- Reduce repository clutter by 18 files
- Create clear, authoritative documentation
- Make onboarding easier for new developers
- Preserve historical context in archive
