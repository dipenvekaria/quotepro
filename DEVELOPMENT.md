# QuotePro Development Guide

## Getting Started

### Prerequisites

- **Node.js**: 18+ (for Next.js)
- **Python**: 3.11+ (for backend)
- **Git**: For version control
- **Supabase Account**: Free tier works fine
- **Groq API Key**: Free tier available at https://console.groq.com

### Initial Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd quotepro
   ```

2. **Install dependencies:**
   ```bash
   # Frontend
   npm install
   
   # Backend
   cd python-backend
   ./setup.sh  # Creates venv and installs packages
   cd ..
   ```

3. **Configure environment variables:**
   
   **Create `.env.local` in root:**
   ```bash
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   
   # Python Backend
   PYTHON_BACKEND_URL=http://localhost:8000
   
   # AI - Groq
   GROQ_API_KEY=your_groq_api_key
   ```
   
   **Create `python-backend/.env`:**
   ```bash
   GROQ_API_KEY=your_groq_api_key
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_anon_key  # Use anon key for dev
   ```

4. **Set up database:**
   - Go to [Supabase Dashboard](https://supabase.com/dashboard)
   - Create a new project
   - Run migrations from `supabase/migrations/` in order
   - Enable Google OAuth provider (optional)

5. **Start development servers:**
   ```bash
   # Terminal 1: Next.js
   npm run dev
   
   # Terminal 2: Python Backend
   cd python-backend && ./start-server.sh
   ```

6. **Access the app:**
   - Frontend: http://localhost:3000
   - Python API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

## Project Structure

```
quotepro/
├── src/                    # Next.js frontend
│   ├── app/               # App router pages
│   ├── components/        # React components
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utilities & config
│   └── types/            # TypeScript types
├── python-backend/        # FastAPI backend
│   ├── main.py           # Main FastAPI app
│   ├── tax_rates.py      # Tax calculation
│   └── requirements.txt  # Python deps
├── supabase/
│   └── migrations/       # Database migrations
├── public/               # Static assets
└── docs/                 # Documentation
```

## Development Workflow

### Adding a New Feature

1. **Plan the feature:**
   - Define requirements
   - Design database schema changes (if any)
   - Plan API endpoints (if any)

2. **Database changes (if needed):**
   ```sql
   -- Create migration file: supabase/migrations/XXX_feature_name.sql
   
   -- Example: Add new column
   ALTER TABLE quotes ADD COLUMN new_field TEXT;
   
   -- Add RLS policy
   CREATE POLICY "Users can access own quotes"
   ON quotes FOR SELECT
   USING (auth.uid() = user_id);
   ```

3. **Backend changes (if needed):**
   ```python
   # python-backend/main.py
   
   @app.post("/api/new-endpoint")
   async def new_feature(request: NewRequest):
       # Implementation
       return {"result": "success"}
   ```

4. **Frontend changes:**
   ```typescript
   // src/app/new-feature/page.tsx
   
   export default function NewFeaturePage() {
     // Implementation
     return <div>New Feature</div>
   }
   ```

5. **Test the feature:**
   - Manual testing
   - Add unit tests (planned)
   - Test edge cases

6. **Update documentation:**
   - Update ARCHITECTURE.md if architecture changed
   - Update README.md if setup changed
   - Add feature docs if complex

### Code Style Guide

#### TypeScript/React

```typescript
// Use functional components
export default function ComponentName() {
  // Hooks at the top
  const [state, setState] = useState()
  useEffect(() => {}, [])
  
  // Handler functions
  const handleClick = () => {}
  
  // Early returns for loading/error states
  if (loading) return <div>Loading...</div>
  
  // Main render
  return <div>Content</div>
}

// Use TypeScript types
interface Props {
  name: string
  age?: number  // Optional
}

// Prefer async/await over .then()
const fetchData = async () => {
  try {
    const response = await fetch('/api/data')
    const data = await response.json()
  } catch (error) {
    console.error(error)
  }
}
```

#### Python

```python
# Use type hints
def calculate_tax(amount: float, rate: float) -> float:
    return amount * (rate / 100)

# Use Pydantic for validation
class QuoteRequest(BaseModel):
    company_id: str
    description: str
    customer_name: str

# Use async/await for I/O operations
@app.post("/api/endpoint")
async def endpoint(request: QuoteRequest):
    # Implementation
    return {"result": "success"}

# Use docstrings
def complex_function(param: str) -> dict:
    """
    Brief description of what the function does.
    
    Args:
        param: Description of parameter
        
    Returns:
        Description of return value
    """
    pass
```

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes
git add .
git commit -m "feat: add new feature"

# Push to remote
git push origin feature/new-feature

# Create pull request on GitHub
```

**Commit Message Convention:**
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `refactor:` Code refactoring
- `test:` Adding tests
- `chore:` Maintenance tasks

## Testing

### Manual Testing Checklist

**Authentication:**
- [ ] Sign up with email/password
- [ ] Sign in with email/password
- [ ] Sign in with Google OAuth
- [ ] Sign out

**Onboarding:**
- [ ] Step 1: Company name + logo upload
- [ ] Step 2: Default pricing or CSV upload
- [ ] Redirect to dashboard after completion

**Dashboard:**
- [ ] Metrics display correctly
- [ ] Recent quotes list
- [ ] Navigation works

**Quote Creation:**
- [ ] Enter customer info
- [ ] Generate quote with AI
- [ ] Edit line items
- [ ] Add new items
- [ ] Delete items
- [ ] Save quote
- [ ] Update saved quote
- [ ] Tax calculated correctly based on address

**Settings (Admin only):**
- [ ] Update company info
- [ ] Upload logo
- [ ] Manage pricing catalog
- [ ] Add team members
- [ ] Remove team members
- [ ] Change member roles

### Automated Testing (Planned)

```bash
# Frontend tests (Jest + React Testing Library)
npm test

# Backend tests (pytest)
cd python-backend
./venv/bin/pytest

# E2E tests (Playwright)
npm run test:e2e
```

## Database Management

### Running Migrations

1. **Create migration file:**
   ```bash
   # Name format: XXX_description.sql
   # Example: 006_add_quote_templates.sql
   ```

2. **Write SQL:**
   ```sql
   -- Always include both UP and DOWN migrations
   
   -- UP Migration
   CREATE TABLE quote_templates (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     company_id UUID REFERENCES companies(id),
     name TEXT NOT NULL,
     created_at TIMESTAMP DEFAULT NOW()
   );
   
   -- Create RLS policies
   ALTER TABLE quote_templates ENABLE ROW LEVEL SECURITY;
   
   CREATE POLICY "Users can view own templates"
   ON quote_templates FOR SELECT
   USING (company_id IN (
     SELECT id FROM companies WHERE user_id = auth.uid()
   ));
   ```

3. **Apply migration:**
   - Via Supabase Dashboard → SQL Editor
   - Or use Supabase CLI: `supabase db push`

4. **Regenerate types:**
   ```bash
   supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.types.ts
   ```

### Supabase CLI Setup (Optional)

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref YOUR_PROJECT_REF

# Pull remote schema
supabase db pull

# Generate types
supabase gen types typescript --local > src/types/database.types.ts
```

## Environment Configuration

### Development

```bash
# Next.js
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key

# Python
PYTHON_BACKEND_URL=http://localhost:8000
```

### Staging (Planned)

```bash
# Next.js
NEXT_PUBLIC_SUPABASE_URL=https://staging.supabase.co
NEXT_PUBLIC_APP_URL=https://staging.quotepro.com

# Python
PYTHON_BACKEND_URL=https://api-staging.quotepro.com
```

### Production (Planned)

```bash
# Next.js
NEXT_PUBLIC_SUPABASE_URL=https://prod.supabase.co
NEXT_PUBLIC_APP_URL=https://quotepro.com

# Python
PYTHON_BACKEND_URL=https://api.quotepro.com
```

## Debugging

### Frontend Debugging

**React DevTools:**
- Install React DevTools extension
- Inspect component props/state
- Profile render performance

**Network Tab:**
- Check API requests/responses
- Verify headers and payloads
- Check for CORS issues

**Console Logs:**
```typescript
console.log('Debug:', variable)
console.error('Error:', error)
console.table(arrayData)  // Format arrays nicely
```

### Backend Debugging

**FastAPI Docs:**
- Visit http://localhost:8000/docs
- Test endpoints interactively
- Check request/response schemas

**Python Logging:**
```python
import logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

logger.debug(f"Processing request: {request}")
logger.error(f"Error occurred: {error}")
```

**Test Endpoints:**
```bash
# Health check
curl http://localhost:8000/health

# Test quote generation
curl -X POST http://localhost:8000/api/generate-quote \
  -H "Content-Type: application/json" \
  -d '{
    "company_id": "uuid",
    "description": "Install new HVAC system",
    "customer_name": "John Doe",
    "customer_address": "123 Main St, Austin, TX 78701"
  }'
```

### Database Debugging

**Supabase Dashboard:**
- Table Editor: View/edit data
- SQL Editor: Run queries
- Logs: Check database logs
- Auth: Manage users

**Check RLS Policies:**
```sql
-- Test as specific user
SET request.jwt.claims = '{"sub": "user-uuid"}';

-- Run query
SELECT * FROM quotes;

-- Reset
RESET request.jwt.claims;
```

## Performance Optimization

### Frontend

**Code Splitting:**
```typescript
// Lazy load heavy components
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Skeleton />
})
```

**Image Optimization:**
```typescript
import Image from 'next/image'

<Image 
  src="/logo.png"
  width={200}
  height={100}
  alt="Logo"
  priority  // For above-the-fold images
/>
```

**Memoization:**
```typescript
import { useMemo, useCallback } from 'react'

// Expensive calculation
const result = useMemo(() => 
  expensiveCalculation(data), 
  [data]
)

// Callback functions
const handleClick = useCallback(() => {
  // Handler logic
}, [dependencies])
```

### Backend

**Database Query Optimization:**
```python
# Use select() to limit columns
supabase.table('quotes').select('id, customer_name, total')

# Use limit() for pagination
supabase.table('quotes').select('*').limit(10)

# Use indexes for WHERE clauses
# (Already configured in migrations)
```

**Caching (Planned):**
```python
from functools import lru_cache

@lru_cache(maxsize=100)
def get_tax_rate(state: str) -> float:
    return STATE_TAX_RATES.get(state, 8.5)
```

## Security Best Practices

### API Keys
- Never commit `.env` files
- Use environment variables
- Rotate keys regularly
- Use different keys for dev/staging/prod

### Input Validation
```typescript
// Frontend
if (!customerName.trim()) {
  toast.error('Customer name is required')
  return
}

// Backend
class QuoteRequest(BaseModel):
    customer_name: str = Field(min_length=1, max_length=100)
    description: str = Field(min_length=10)
```

### SQL Injection Prevention
```python
# ✅ Good: Parameterized queries (Supabase does this)
supabase.table('quotes').select('*').eq('id', quote_id)

# ❌ Bad: String concatenation
# cursor.execute(f"SELECT * FROM quotes WHERE id = '{quote_id}'")
```

### XSS Prevention
```typescript
// ✅ Good: React escapes by default
<div>{userInput}</div>

// ❌ Bad: dangerouslySetInnerHTML without sanitization
<div dangerouslySetInnerHTML={{__html: userInput}} />
```

## Common Issues & Solutions

### Issue: "Module not found"
```bash
# Clear Next.js cache
rm -rf .next
npm run dev
```

### Issue: Python backend won't start
```bash
# Recreate virtual environment
cd python-backend
rm -rf venv
./setup.sh
```

### Issue: Supabase connection fails
```bash
# Check environment variables
cat .env.local | grep SUPABASE

# Test connection
curl https://YOUR_PROJECT.supabase.co/rest/v1/
```

### Issue: Quote generation fails
```bash
# Check Python backend logs
# Check Groq API key is valid
# Verify pricing catalog exists for company
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests (when test framework is set up)
5. Update documentation
6. Submit a pull request

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Shadcn/ui Components](https://ui.shadcn.com/)
- [Groq API Docs](https://console.groq.com/docs)

---

**Last Updated:** November 26, 2024
**Maintainer:** Development Team
