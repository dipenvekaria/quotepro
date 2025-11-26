# QuotePro Python Backend

FastAPI backend for AI-powered quote generation using Groq LLM.

## Features

- 🚀 FastAPI for high-performance async API
- 🤖 Groq integration (Llama 3.3 70B model)
- 🗄️ Supabase integration for pricing catalog
- 🔒 CORS configured for Next.js frontend
- ✅ Type validation with Pydantic
- 📊 Ready for Google ADK Agents integration

## Setup

### 1. Install Python Dependencies

```bash
cd python-backend

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # On macOS/Linux
# or
venv\Scripts\activate  # On Windows

# Install dependencies
pip install -r requirements.txt
```

### 2. Configure Environment Variables

```bash
# Copy example env file
cp .env.example .env

# Edit .env and add your keys:
# - GROQ_API_KEY
# - NEXT_PUBLIC_SUPABASE_URL
# - SUPABASE_SERVICE_ROLE_KEY
```

### 3. Run the Server

```bash
# Development mode (with auto-reload)
uvicorn main:app --reload --port 8000

# Production mode
python main.py
```

The API will be available at:
- API: http://localhost:8000
- Interactive docs: http://localhost:8000/docs
- Alternative docs: http://localhost:8000/redoc

## API Endpoints

### Health Check
```bash
GET http://localhost:8000/health
```

### Generate Quote
```bash
POST http://localhost:8000/api/generate-quote

Body:
{
  "company_id": "uuid",
  "customer_name": "John Smith",
  "description": "Replace water heater, fix leaky faucet"
}
```

## Project Structure

```
python-backend/
├── main.py              # FastAPI application
├── requirements.txt     # Python dependencies
├── .env.example        # Environment variables template
├── .env                # Your environment variables (create this)
└── README.md           # This file
```

## Integration with Next.js

The Next.js frontend (`/api/generate-quote/route.ts`) will proxy requests to this Python backend.

## Future Enhancements

- [ ] Google ADK Agents integration
- [ ] OpenRouter fallback
- [ ] Caching layer (Redis)
- [ ] Rate limiting
- [ ] Logging and monitoring
- [ ] Background tasks for long-running operations

## Development

```bash
# Install dev dependencies
pip install black flake8 pytest

# Format code
black main.py

# Lint code
flake8 main.py

# Run tests
pytest
```

## Deployment

For production, use:
- Gunicorn with Uvicorn workers
- Docker container
- Environment variable management
- Reverse proxy (nginx)
