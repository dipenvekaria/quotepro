"""
QuotePro Test Suite Configuration
Fixtures and utilities for testing
"""
import pytest
import os
from typing import Generator
from fastapi.testclient import TestClient
from unittest.mock import Mock, MagicMock

# Set test environment
os.environ["ENVIRONMENT"] = "test"

@pytest.fixture
def test_client() -> Generator[TestClient, None, None]:
    """
    Create FastAPI test client
    """
    from main import app
    client = TestClient(app)
    yield client

@pytest.fixture
def mock_db() -> Mock:
    """
    Mock Supabase database client
    """
    mock = MagicMock()
    
    # Mock table() chain
    mock_table = MagicMock()
    mock_select = MagicMock()
    mock_execute = MagicMock()
    
    mock.table.return_value = mock_table
    mock_table.select.return_value = mock_select
    mock_table.insert.return_value = mock_select
    mock_table.update.return_value = mock_select
    mock_table.delete.return_value = mock_select
    mock_select.eq.return_value = mock_select
    mock_select.limit.return_value = mock_select
    mock_select.execute.return_value = mock_execute
    
    # Default empty data
    mock_execute.data = []
    mock_execute.count = 0
    
    return mock

@pytest.fixture
def mock_gemini() -> Mock:
    """
    Mock Gemini AI client
    """
    mock = MagicMock()
    
    # Mock generate_content
    mock_response = MagicMock()
    mock_response.text = '{"line_items": [], "subtotal": 0, "total": 0}'
    mock.generate_content.return_value = mock_response
    
    # Mock embeddings
    mock.embed_content.return_value = MagicMock(embedding=[0.1] * 768)
    
    return mock

@pytest.fixture
def sample_company_id() -> str:
    """Sample company UUID"""
    return "550e8400-e29b-41d4-a716-446655440000"

@pytest.fixture
def sample_quote_request() -> dict:
    """Sample quote generation request"""
    return {
        "company_id": "550e8400-e29b-41d4-a716-446655440000",
        "description": "Replace 50 gallon water heater",
        "customer_name": "John Smith",
        "customer_address": "123 Main St, San Francisco, CA 94102"
    }

@pytest.fixture
def sample_pricing_items() -> list:
    """Sample pricing catalog"""
    return [
        {
            "id": "item-1",
            "name": "50 Gallon Water Heater",
            "description": "Rheem Professional Series",
            "price": 850.00,
            "category": "Water Heaters"
        },
        {
            "id": "item-2",
            "name": "Expansion Tank",
            "description": "2 gallon thermal expansion tank",
            "price": 150.00,
            "category": "Plumbing Parts"
        },
        {
            "id": "item-3",
            "name": "Main Shutoff Valve",
            "description": "3/4 inch brass ball valve",
            "price": 85.00,
            "category": "Plumbing Parts"
        }
    ]

@pytest.fixture
def sample_line_items() -> list:
    """Sample quote line items"""
    return [
        {
            "name": "50 Gallon Water Heater",
            "description": "Rheem Professional Series",
            "quantity": 1,
            "unit_price": 850.00,
            "total": 850.00
        },
        {
            "name": "Labor",
            "description": "Installation labor",
            "quantity": 3,
            "unit_price": 125.00,
            "total": 375.00
        }
    ]

@pytest.fixture(autouse=True)
def reset_mocks():
    """Reset mocks after each test"""
    yield
    # Cleanup after test
    pass
