"""
Integration Tests for AI Quote Generation API
Tests the complete flow from request to response
"""
import pytest
from unittest.mock import patch, MagicMock

class TestQuoteGeneration:
    """Test AI quote generation endpoints"""
    
    def test_health_check(self, test_client):
        """Test basic health check endpoint"""
        response = test_client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "version" in data
    
    @patch("api.routes.ai.get_db_session")
    @patch("api.routes.ai.get_gemini_client")
    def test_generate_quote_success(
        self,
        mock_gemini,
        mock_db,
        test_client,
        sample_quote_request,
        sample_pricing_items
    ):
        """Test successful quote generation"""
        # Setup mocks
        mock_db_instance = MagicMock()
        mock_gemini_instance = MagicMock()
        
        # Mock catalog response
        catalog_response = MagicMock()
        catalog_response.data = sample_pricing_items
        mock_db_instance.table().select().eq().execute.return_value = catalog_response
        
        # Mock Gemini response
        gemini_response = MagicMock()
        gemini_response.text = '''
        {
          "line_items": [
            {
              "name": "50 Gallon Water Heater",
              "description": "Rheem Professional Series",
              "quantity": 1,
              "unit_price": 850.00,
              "total": 850.00
            }
          ],
          "subtotal": 850.00,
          "total": 850.00,
          "notes": "Professional installation recommended"
        }
        '''
        mock_gemini_instance.generate_content.return_value = gemini_response
        
        mock_db.return_value = mock_db_instance
        mock_gemini.return_value = mock_gemini_instance
        
        # Make request
        response = test_client.post("/api/generate-quote", json=sample_quote_request)
        
        # Verify response
        assert response.status_code == 200
        data = response.json()
        assert "line_items" in data
        assert "total" in data
        assert len(data["line_items"]) > 0
    
    @patch("api.routes.ai.get_db_session")
    def test_generate_quote_no_catalog(
        self,
        mock_db,
        test_client,
        sample_quote_request
    ):
        """Test quote generation fails when no catalog exists"""
        # Setup mock - empty catalog
        mock_db_instance = MagicMock()
        catalog_response = MagicMock()
        catalog_response.data = []  # No pricing items
        mock_db_instance.table().select().eq().execute.return_value = catalog_response
        mock_db.return_value = mock_db_instance
        
        # Make request
        response = test_client.post("/api/generate-quote", json=sample_quote_request)
        
        # Verify error response
        assert response.status_code == 400
        data = response.json()
        assert "NO_PRICING_CATALOG" in str(data)
    
    def test_generate_quote_missing_fields(self, test_client):
        """Test validation error when required fields missing"""
        invalid_request = {
            "company_id": "123",
            # Missing description and customer_name
        }
        
        response = test_client.post("/api/generate-quote", json=invalid_request)
        assert response.status_code == 422  # Validation error


class TestQuoteUpdate:
    """Test quote update/chat endpoints"""
    
    @patch("api.routes.ai.get_db_session")
    @patch("api.routes.ai.get_gemini_client")
    def test_update_quote_success(
        self,
        mock_gemini,
        mock_db,
        test_client,
        sample_pricing_items,
        sample_line_items
    ):
        """Test successful quote update via chat"""
        # Setup mocks
        mock_db_instance = MagicMock()
        mock_gemini_instance = MagicMock()
        
        # Mock catalog
        catalog_response = MagicMock()
        catalog_response.data = sample_pricing_items
        mock_db_instance.table().select().eq().execute.return_value = catalog_response
        
        # Mock Gemini
        gemini_response = MagicMock()
        gemini_response.text = '''
        {
          "line_items": [
            {
              "name": "75 Gallon Water Heater",
              "quantity": 1,
              "unit_price": 1050.00,
              "total": 1050.00
            }
          ],
          "subtotal": 1050.00,
          "total": 1050.00
        }
        '''
        mock_gemini_instance.generate_content.return_value = gemini_response
        
        mock_db.return_value = mock_db_instance
        mock_gemini.return_value = mock_gemini_instance
        
        # Make request
        update_request = {
            "quote_id": "quote-123",
            "company_id": "company-123",
            "user_prompt": "Change to 75 gallon water heater",
            "existing_items": sample_line_items,
            "customer_name": "John Smith",
            "conversation_history": []
        }
        
        response = test_client.post("/api/update-quote", json=update_request)
        
        # Verify
        assert response.status_code == 200
        data = response.json()
        assert "line_items" in data


class TestJobNaming:
    """Test AI job name generation"""
    
    @patch("api.routes.ai.get_gemini_client")
    def test_generate_job_name_success(self, mock_gemini, test_client):
        """Test successful job name generation"""
        # Setup mock
        mock_gemini_instance = MagicMock()
        gemini_response = MagicMock()
        gemini_response.text = "Water Heater Replacement"
        mock_gemini_instance.generate_content.return_value = gemini_response
        mock_gemini.return_value = mock_gemini_instance
        
        # Make request
        request = {
            "description": "Replace old 50 gallon water heater with new unit",
            "customer_name": "John Smith"
        }
        
        response = test_client.post("/api/generate-job-name", json=request)
        
        # Verify
        assert response.status_code == 200
        data = response.json()
        assert "job_name" in data
        assert len(data["job_name"]) > 0


class TestRateLimit:
    """Test API rate limiting"""
    
    @pytest.mark.skip(reason="Rate limiting not yet implemented")
    def test_rate_limit_exceeded(self, test_client):
        """Test rate limit enforcement"""
        # Make many rapid requests
        for i in range(100):
            response = test_client.get("/health")
            if i < 50:
                assert response.status_code == 200
            else:
                # Should start getting rate limited
                assert response.status_code in [200, 429]


class TestErrorHandling:
    """Test error handling and edge cases"""
    
    def test_invalid_json(self, test_client):
        """Test handling of malformed JSON"""
        response = test_client.post(
            "/api/generate-quote",
            data="not valid json",
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 422
    
    def test_missing_content_type(self, test_client):
        """Test handling of missing Content-Type header"""
        response = test_client.post(
            "/api/generate-quote",
            data='{"company_id": "123"}'
        )
        # Should still work or fail gracefully
        assert response.status_code in [200, 400, 422]
    
    @patch("api.routes.ai.get_gemini_client")
    def test_ai_service_error(self, mock_gemini, test_client, sample_quote_request):
        """Test handling when AI service fails"""
        # Setup mock to raise exception
        mock_gemini_instance = MagicMock()
        mock_gemini_instance.generate_content.side_effect = Exception("AI service unavailable")
        mock_gemini.return_value = mock_gemini_instance
        
        response = test_client.post("/api/generate-quote", json=sample_quote_request)
        
        # Should handle error gracefully
        assert response.status_code in [500, 503]
