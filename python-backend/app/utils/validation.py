"""
Input Validation & Sanitization Utilities
Protects against injection attacks and malformed data
"""

import re
import bleach
from typing import Any, Optional
from pydantic import validator

from app.logging_config import get_logger

logger = get_logger(__name__)

# Common injection patterns to detect
INJECTION_PATTERNS = [
    r'ignore\s+previous',
    r'system\s*:',
    r'assistant\s*:',
    r'forget\s+everything',
    r'<script',
    r'javascript:',
    r'onerror\s*=',
    r'onclick\s*=',
]

# Compile patterns for efficiency
COMPILED_PATTERNS = [re.compile(pattern, re.IGNORECASE) for pattern in INJECTION_PATTERNS]


def sanitize_html(text: str) -> str:
    """
    Remove HTML tags and potentially dangerous content
    
    Args:
        text: Input text that may contain HTML
        
    Returns:
        str: Sanitized text with HTML removed
    """
    if not text:
        return ""
    
    # Remove all HTML tags
    cleaned = bleach.clean(text, tags=[], strip=True)
    
    # Remove extra whitespace
    cleaned = ' '.join(cleaned.split())
    
    return cleaned


def sanitize_ai_prompt(prompt: str, max_length: int = 5000) -> str:
    """
    Sanitize AI prompt to prevent injection attacks
    
    Args:
        prompt: User-provided prompt text
        max_length: Maximum allowed length
        
    Returns:
        str: Sanitized prompt
        
    Raises:
        ValueError: If suspicious patterns detected
    """
    if not prompt:
        return ""
    
    # Check for injection patterns
    prompt_lower = prompt.lower()
    for pattern in COMPILED_PATTERNS:
        if pattern.search(prompt_lower):
            logger.warning(
                f"Suspicious AI prompt detected",
                extra={'extra_data': {'pattern': pattern.pattern}}
            )
            raise ValueError(f"Prompt contains suspicious content")
    
    # Remove HTML
    sanitized = sanitize_html(prompt)
    
    # Limit length
    if len(sanitized) > max_length:
        logger.info(f"Prompt truncated from {len(sanitized)} to {max_length} characters")
        sanitized = sanitized[:max_length]
    
    return sanitized.strip()


def validate_email(email: str) -> bool:
    """
    Validate email format
    
    Args:
        email: Email address to validate
        
    Returns:
        bool: True if valid email format
    """
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def validate_phone(phone: str) -> bool:
    """
    Validate phone number format (US/international)
    
    Args:
        phone: Phone number to validate
        
    Returns:
        bool: True if valid phone format
    """
    # Remove common separators
    cleaned = re.sub(r'[\s\-\(\)\.]', '', phone)
    
    # Check if valid format: optional +, 10-15 digits
    pattern = r'^\+?1?\d{10,14}$'
    return bool(re.match(pattern, cleaned))


def validate_uuid(uuid_str: str) -> bool:
    """
    Validate UUID format
    
    Args:
        uuid_str: UUID string to validate
        
    Returns:
        bool: True if valid UUID format
    """
    pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    return bool(re.match(pattern, uuid_str.lower()))


def sanitize_filename(filename: str) -> str:
    """
    Sanitize filename to prevent directory traversal
    
    Args:
        filename: Original filename
        
    Returns:
        str: Safe filename
    """
    # Remove path separators
    safe_name = filename.replace('/', '').replace('\\', '')
    
    # Remove potentially dangerous characters
    safe_name = re.sub(r'[^\w\s\-\.]', '', safe_name)
    
    # Remove leading/trailing dots and spaces
    safe_name = safe_name.strip('. ')
    
    # Limit length
    if len(safe_name) > 255:
        extension = safe_name.split('.')[-1] if '.' in safe_name else ''
        safe_name = safe_name[:250] + ('.' + extension if extension else '')
    
    return safe_name or 'unnamed'


def validate_file_upload(
    filename: str,
    content_type: str,
    file_size: int,
    allowed_extensions: set[str] = {'.csv', '.xlsx', '.xls'},
    max_size: int = 10 * 1024 * 1024  # 10MB
) -> tuple[bool, Optional[str]]:
    """
    Validate file upload
    
    Args:
        filename: Name of uploaded file
        content_type: MIME type
        file_size: Size in bytes
        allowed_extensions: Set of allowed extensions
        max_size: Maximum file size in bytes
        
    Returns:
        tuple: (is_valid, error_message)
    """
    # Check extension
    import os
    ext = os.path.splitext(filename)[1].lower()
    if ext not in allowed_extensions:
        return False, f"File type not allowed. Allowed: {', '.join(allowed_extensions)}"
    
    # Check size
    if file_size > max_size:
        max_mb = max_size / (1024 * 1024)
        return False, f"File too large. Maximum size: {max_mb}MB"
    
    # Check MIME type (basic)
    allowed_mime_types = {
        '.csv': ['text/csv', 'application/csv'],
        '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        '.xls': ['application/vnd.ms-excel'],
    }
    
    if ext in allowed_mime_types:
        if content_type not in allowed_mime_types[ext]:
            logger.warning(
                f"MIME type mismatch",
                extra={'extra_data': {
                    'extension': ext,
                    'content_type': content_type,
                    'expected': allowed_mime_types[ext]
                }}
            )
            # Don't block, just warn (MIME types can be unreliable)
    
    return True, None


def validate_numeric_range(
    value: float,
    min_val: Optional[float] = None,
    max_val: Optional[float] = None,
    field_name: str = "Value"
) -> None:
    """
    Validate numeric value is within range
    
    Args:
        value: Value to check
        min_val: Minimum allowed value (inclusive)
        max_val: Maximum allowed value (inclusive)
        field_name: Name of field for error message
        
    Raises:
        ValueError: If value out of range
    """
    if min_val is not None and value < min_val:
        raise ValueError(f"{field_name} must be at least {min_val}")
    
    if max_val is not None and value > max_val:
        raise ValueError(f"{field_name} must be at most {max_val}")


# Pydantic validator decorators for common cases
def email_validator(cls, v):
    """Pydantic validator for email fields"""
    if v and not validate_email(v):
        raise ValueError("Invalid email format")
    return v


def phone_validator(cls, v):
    """Pydantic validator for phone fields"""
    if v and not validate_phone(v):
        raise ValueError("Invalid phone number format")
    return v


def uuid_validator(cls, v):
    """Pydantic validator for UUID fields"""
    if v and not validate_uuid(v):
        raise ValueError("Invalid UUID format")
    return v


def sanitize_html_validator(cls, v):
    """Pydantic validator to sanitize HTML"""
    return sanitize_html(v) if v else v


def sanitize_ai_prompt_validator(cls, v):
    """Pydantic validator to sanitize AI prompts"""
    return sanitize_ai_prompt(v) if v else v
