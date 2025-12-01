"""
Google Gemini API client wrapper
Centralized client for all Gemini operations
"""
import google.generativeai as genai
from typing import Optional, Dict, Any
from functools import lru_cache
from config.settings import get_settings


class GeminiClient:
    """
    Wrapper for Google Gemini API
    Handles configuration and common operations
    """
    
    def __init__(
        self,
        api_key: str,
        model_name: str = "gemini-2.0-flash",
        temperature: float = 0.1,
        max_tokens: int = 8192
    ):
        """
        Initialize Gemini client
        
        Args:
            api_key: Gemini API key
            model_name: Model to use
            temperature: Randomness (0.0-1.0, lower = more deterministic)
            max_tokens: Maximum output tokens
        """
        genai.configure(api_key=api_key)
        
        self.model_name = model_name
        self.temperature = temperature
        self.max_tokens = max_tokens
        
        # Create model instance
        self.model = genai.GenerativeModel(
            model_name=model_name,
            generation_config={
                'temperature': temperature,
                'top_p': 0.95,
                'top_k': 40,
                'max_output_tokens': max_tokens,
                'response_mime_type': 'application/json',
            }
        )
        
        print(f"✅ Gemini client initialized: {model_name} (temp={temperature})")
    
    def generate_json(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Generate JSON response from prompts
        
        Args:
            system_prompt: System instructions
            user_prompt: User request
            temperature: Override default temperature
        
        Returns:
            Parsed JSON response
        """
        import json
        
        # Combine prompts
        full_prompt = f"{system_prompt}\n\n{user_prompt}"
        
        # Override temperature if provided
        if temperature is not None:
            model = genai.GenerativeModel(
                model_name=self.model_name,
                generation_config={
                    'temperature': temperature,
                    'top_p': 0.95,
                    'top_k': 40,
                    'max_output_tokens': self.max_tokens,
                    'response_mime_type': 'application/json',
                }
            )
        else:
            model = self.model
        
        # Generate response
        response = model.generate_content(full_prompt)
        
        # Parse JSON
        return json.loads(response.text)
    
    def generate_text(
        self,
        prompt: str,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None
    ) -> str:
        """
        Generate text response
        
        Args:
            prompt: Full prompt
            temperature: Override temperature
            max_tokens: Override max tokens
        
        Returns:
            Generated text
        """
        # ALWAYS create new model for text generation (NOT JSON mode)
        model = genai.GenerativeModel(
            model_name=self.model_name,
            generation_config={
                'temperature': temperature if temperature is not None else self.temperature,
                'top_p': 0.95,
                'top_k': 40,
                'max_output_tokens': max_tokens or self.max_tokens,
                # NO response_mime_type - plain text only
            }
        )
        
        response = model.generate_content(prompt)
        return response.text
    
    def generate_embedding(self, text: str) -> list[float]:
        """
        Generate embedding vector for text (for RAG)
        
        Args:
            text: Text to embed
        
        Returns:
            Embedding vector (1536 dimensions)
        """
        result = genai.embed_content(
            model="models/text-embedding-004",
            content=text,
            task_type="retrieval_document"
        )
        return result['embedding']


@lru_cache()
def get_gemini_client() -> GeminiClient:
    """
    Get cached Gemini client instance (singleton)
    
    Returns:
        Configured Gemini client
    """
    settings = get_settings()
    return GeminiClient(
        api_key=settings.gemini_api_key,
        model_name=settings.gemini_model,
        temperature=settings.gemini_temperature,
        max_tokens=settings.gemini_max_tokens
    )
