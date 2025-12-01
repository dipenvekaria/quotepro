"""
Integration Tests for Catalog and Analytics APIs
Tests catalog indexing and AI analytics tracking
"""
import pytest
from unittest.mock import patch, MagicMock

class TestCatalogIndexing:
    """Test catalog management endpoints"""
    
    @patch("api.routes.catalog.get_db_session")
    @patch("api.routes.catalog.get_auto_indexer")
    def test_bulk_index_catalog(
        self,
        mock_indexer,
        mock_db,
        test_client
    ):
        """Test bulk catalog indexing"""
        # Setup mocks
        mock_indexer_instance = MagicMock()
        mock_indexer_instance.index_company_catalog.return_value = {
            "indexed": 10,
            "skipped": 0,
            "failed": 0
        }
        mock_indexer.return_value = mock_indexer_instance
        
        # Make request
        request = {
            "company_id": "company-123",
            "force_reindex": False
        }
        
        response = test_client.post("/api/catalog/index", json=request)
        
        # Verify
        assert response.status_code == 200
        data = response.json()
        assert data["indexed"] == 10
        assert data["failed"] == 0
    
    @patch("api.routes.catalog.get_auto_indexer")
    def test_index_single_item(
        self,
        mock_indexer,
        test_client
    ):
        """Test indexing single catalog item"""
        mock_indexer_instance = MagicMock()
        mock_indexer_instance.index_item.return_value = True
        mock_indexer.return_value = mock_indexer_instance
        
        request = {
            "item_id": "item-123",
            "company_id": "company-123"
        }
        
        response = test_client.post("/api/catalog/index-item", json=request)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
    
    @patch("api.routes.catalog.get_auto_indexer")
    def test_delete_item_embedding(
        self,
        mock_indexer,
        test_client
    ):
        """Test deleting item embedding"""
        mock_indexer_instance = MagicMock()
        mock_indexer_instance.delete_item_embedding.return_value = True
        mock_indexer.return_value = mock_indexer_instance
        
        response = test_client.delete(
            "/api/catalog/index-item/item-123",
            params={"company_id": "company-123"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
    
    @patch("api.routes.catalog.get_db_session")
    def test_get_index_status(
        self,
        mock_db,
        test_client
    ):
        """Test getting catalog index status"""
        # Setup mocks
        mock_db_instance = MagicMock()
        
        # Mock pricing items count
        pricing_response = MagicMock()
        pricing_response.count = 50
        
        # Mock embeddings count
        embeddings_response = MagicMock()
        embeddings_response.data = [{"id": f"emb-{i}"} for i in range(45)]
        embeddings_response.count = 45
        
        mock_db_instance.table().select().eq().execute.return_value = pricing_response
        mock_db_instance.table().select().eq().execute.return_value = embeddings_response
        mock_db.return_value = mock_db_instance
        
        response = test_client.get("/api/catalog/index-status/company-123")
        
        assert response.status_code == 200
        data = response.json()
        assert "total_items" in data
        assert "indexed_items" in data
        assert "coverage_percent" in data


class TestAIAnalytics:
    """Test AI analytics endpoints"""
    
    @patch("api.routes.ai_analytics.get_db_session")
    def test_get_analytics_summary(
        self,
        mock_db,
        test_client
    ):
        """Test getting analytics summary"""
        # Setup mock
        mock_db_instance = MagicMock()
        
        # Mock analytics data
        analytics_response = MagicMock()
        analytics_response.data = [
            {
                "analysis_type": "optimizer",
                "win_probability": 0.75,
                "suggestion_applied": True
            },
            {
                "analysis_type": "upsell",
                "suggestions_count": 3,
                "suggestions_accepted": 2,
                "potential_increase": 500.00
            }
        ]
        analytics_response.count = 25
        
        mock_db_instance.table().select().eq().gte().lte().execute.return_value = analytics_response
        mock_db.return_value = mock_db_instance
        
        # Make request
        request = {
            "company_id": "company-123",
            "days": 30
        }
        
        response = test_client.post("/api/ai-analytics/summary", json=request)
        
        # Verify
        assert response.status_code == 200
        data = response.json()
        assert "total_ai_quotes" in data
        assert "usage_breakdown" in data
    
    @patch("api.routes.ai_analytics.get_db_session")
    def test_track_ai_usage(
        self,
        mock_db,
        test_client
    ):
        """Test tracking AI usage"""
        # Setup mock
        mock_db_instance = MagicMock()
        insert_response = MagicMock()
        insert_response.data = [{"id": "analytics-123"}]
        mock_db_instance.table().insert().execute.return_value = insert_response
        mock_db.return_value = mock_db_instance
        
        # Make request
        request = {
            "company_id": "company-123",
            "quote_id": "quote-123",
            "analysis_type": "optimizer",
            "win_probability": 0.73,
            "price_position": "competitive",
            "suggestion_applied": True
        }
        
        response = test_client.post("/api/ai-analytics/track", json=request)
        
        # Verify
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
    
    @patch("api.routes.ai_analytics.get_db_session")
    def test_analytics_daily_breakdown(
        self,
        mock_db,
        test_client
    ):
        """Test analytics with daily breakdown"""
        mock_db_instance = MagicMock()
        
        # Mock view query for daily aggregations
        daily_response = MagicMock()
        daily_response.data = [
            {
                "date": "2025-01-01",
                "optimizer_uses": 10,
                "upsell_uses": 8,
                "avg_win_probability": 0.72
            },
            {
                "date": "2025-01-02",
                "optimizer_uses": 15,
                "upsell_uses": 12,
                "avg_win_probability": 0.75
            }
        ]
        mock_db_instance.table().select().eq().gte().lte().execute.return_value = daily_response
        mock_db.return_value = mock_db_instance
        
        request = {
            "company_id": "company-123",
            "days": 7
        }
        
        response = test_client.post("/api/ai-analytics/summary", json=request)
        
        assert response.status_code == 200
        data = response.json()
        if "daily_breakdown" in data:
            assert len(data["daily_breakdown"]) > 0


class TestPerformance:
    """Test API performance requirements"""
    
    @pytest.mark.skip(reason="Performance testing requires load test setup")
    def test_quote_generation_performance(self, test_client):
        """Test quote generation completes within 3 seconds"""
        import time
        
        request = {
            "company_id": "company-123",
            "description": "Replace water heater",
            "customer_name": "John Smith"
        }
        
        start = time.time()
        response = test_client.post("/api/generate-quote", json=request)
        duration = time.time() - start
        
        assert response.status_code == 200
        assert duration < 3.0  # Must complete in under 3 seconds
    
    @pytest.mark.skip(reason="Load testing requires concurrent request setup")
    def test_concurrent_requests(self, test_client):
        """Test handling multiple concurrent requests"""
        import concurrent.futures
        
        def make_request():
            return test_client.get("/health")
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(make_request) for _ in range(50)]
            results = [f.result() for f in futures]
        
        # All requests should succeed
        assert all(r.status_code == 200 for r in results)
