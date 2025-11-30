"""
AI services for QuotePro
"""
from .gemini_client import GeminiClient, get_gemini_client
from .quote_generator import QuoteGeneratorService
from .job_namer import JobNamerService

__all__ = [
    "GeminiClient",
    "get_gemini_client",
    "QuoteGeneratorService",
    "JobNamerService",
]
