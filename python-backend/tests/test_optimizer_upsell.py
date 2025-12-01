"""
Integration Tests for Quote Optimizer and Upsell Suggester
Tests AI-powered pricing optimization and upsell recommendations
"""
import pytest
from unittest.mock import patch, MagicMock

class TestQuoteOptimizer:
    """Test quote optimizer endpoint"""
    
    @patch("api.routes.ai.get_db_session")
    @patch("api.routes.ai.get_quote_optimizer")
    def test_optimize_quote_success(
        self,
        mock_optimizer,
        mock_db,
        test_client
    ):
        """Test successful quote optimization"""
        # Setup mocks
        mock_optimizer_instance = MagicMock()
        mock_optimizer_instance.optimize_quote.return_value = {
            "win_probability": 0.73,
            "price_position": "competitive",
            "suggested_total": 1450.00,
            "current_total": 1500.00,
            "recommendation": "maintain",
            "margin_analysis": {
                "estimated_profit": 450.00,
                "profit_margin_percent": 30.0
            },
            "market_data": {
                "won_quotes_analyzed": 15,
                "lost_quotes_analyzed": 5,
                "avg_won_quote": 1400.00,
                "avg_lost_quote": 1800.00
            },
            "insights": [
                "Price is competitive with market rates",
                "Win probability is strong at 73%"
            ]
        }
        mock_optimizer.return_value = mock_optimizer_instance
        
        # Make request
        request = {
            "company_id": "company-123",
            "job_description": "Water heater replacement",
            "proposed_total": 1500.00,
            "line_items": [
                {
                    "name": "50 Gallon Water Heater",
                    "quantity": 1,
                    "unit_price": 850.00
                }
            ]
        }
        
        response = test_client.post("/api/optimize-quote", json=request)
        
        # Verify
        assert response.status_code == 200
        data = response.json()
        assert "win_probability" in data
        assert data["win_probability"] == 0.73
        assert data["price_position"] == "competitive"
        assert "margin_analysis" in data
        assert "market_data" in data
    
    @patch("api.routes.ai.get_quote_optimizer")
    def test_optimize_quote_high_win_probability(
        self,
        mock_optimizer,
        test_client
    ):
        """Test optimizer with high win probability"""
        mock_optimizer_instance = MagicMock()
        mock_optimizer_instance.optimize_quote.return_value = {
            "win_probability": 0.92,
            "price_position": "aggressive",
            "suggested_total": 1200.00,
            "current_total": 1000.00,
            "recommendation": "increase",
            "margin_analysis": {"estimated_profit": 300.00},
            "market_data": {"won_quotes_analyzed": 20},
            "insights": ["Very high win probability - consider increasing price"]
        }
        mock_optimizer.return_value = mock_optimizer_instance
        
        request = {
            "company_id": "company-123",
            "job_description": "Simple water heater swap",
            "proposed_total": 1000.00,
            "line_items": []
        }
        
        response = test_client.post("/api/optimize-quote", json=request)
        
        assert response.status_code == 200
        data = response.json()
        assert data["win_probability"] > 0.9
        assert data["recommendation"] == "increase"


class TestUpsellSuggester:
    """Test upsell suggester endpoint"""
    
    @patch("api.routes.ai.get_db_session")
    @patch("api.routes.ai.get_upsell_suggester")
    def test_suggest_upsells_success(
        self,
        mock_suggester,
        mock_db,
        test_client
    ):
        """Test successful upsell suggestions"""
        # Setup mocks
        mock_suggester_instance = MagicMock()
        mock_suggester_instance.suggest_upsells.return_value = {
            "suggestions": [
                {
                    "name": "Expansion Tank",
                    "description": "2 gallon thermal expansion tank",
                    "estimated_price": 150.00,
                    "confidence": "high",
                    "frequency": 75.0,
                    "source": "pattern"
                },
                {
                    "name": "Water Softener System",
                    "description": "Whole-house water softening",
                    "estimated_price": 800.00,
                    "confidence": "medium",
                    "frequency": 35.0,
                    "source": "ai"
                }
            ],
            "potential_increase": 950.00,
            "confidence": "high",
            "market_insights": "Customers who buy water heaters often add expansion tanks"
        }
        mock_suggester.return_value = mock_suggester_instance
        
        # Make request
        request = {
            "company_id": "company-123",
            "job_description": "Water heater replacement",
            "current_items": [
                {
                    "name": "50 Gallon Water Heater",
                    "quantity": 1,
                    "unit_price": 850.00
                }
            ],
            "current_total": 1200.00
        }
        
        response = test_client.post("/api/suggest-upsells", json=request)
        
        # Verify
        assert response.status_code == 200
        data = response.json()
        assert "suggestions" in data
        assert len(data["suggestions"]) == 2
        assert data["suggestions"][0]["name"] == "Expansion Tank"
        assert data["potential_increase"] == 950.00
        assert data["confidence"] == "high"
    
    @patch("api.routes.ai.get_upsell_suggester")
    def test_suggest_upsells_no_recommendations(
        self,
        mock_suggester,
        test_client
    ):
        """Test upsell suggester with no recommendations"""
        mock_suggester_instance = MagicMock()
        mock_suggester_instance.suggest_upsells.return_value = {
            "suggestions": [],
            "potential_increase": 0.00,
            "confidence": "low",
            "market_insights": "No clear upsell patterns found"
        }
        mock_suggester.return_value = mock_suggester_instance
        
        request = {
            "company_id": "company-123",
            "job_description": "Emergency repair",
            "current_items": [],
            "current_total": 250.00
        }
        
        response = test_client.post("/api/suggest-upsells", json=request)
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["suggestions"]) == 0
    
    @patch("api.routes.ai.get_upsell_suggester")
    def test_suggest_upsells_high_value(
        self,
        mock_suggester,
        test_client
    ):
        """Test upsell suggestions for high-value opportunities"""
        mock_suggester_instance = MagicMock()
        mock_suggester_instance.suggest_upsells.return_value = {
            "suggestions": [
                {
                    "name": "Premium Water Heater Upgrade",
                    "estimated_price": 500.00,
                    "confidence": "high",
                    "frequency": 60.0,
                    "source": "pattern"
                },
                {
                    "name": "Smart Leak Detection System",
                    "estimated_price": 350.00,
                    "confidence": "medium",
                    "frequency": 40.0,
                    "source": "ai"
                }
            ],
            "potential_increase": 850.00,
            "confidence": "high"
        }
        mock_suggester.return_value = mock_suggester_instance
        
        request = {
            "company_id": "company-123",
            "job_description": "Full plumbing system overhaul",
            "current_items": [{"name": "Water Heater", "unit_price": 2000.00}],
            "current_total": 5000.00
        }
        
        response = test_client.post("/api/suggest-upsells", json=request)
        
        assert response.status_code == 200
        data = response.json()
        assert data["potential_increase"] > 500.00


class TestCombinedWorkflow:
    """Test optimizer + upsell together (realistic workflow)"""
    
    @patch("api.routes.ai.get_db_session")
    @patch("api.routes.ai.get_gemini_client")
    @patch("api.routes.ai.get_quote_optimizer")
    @patch("api.routes.ai.get_upsell_suggester")
    def test_full_quote_workflow(
        self,
        mock_suggester,
        mock_optimizer,
        mock_gemini,
        mock_db,
        test_client
    ):
        """Test complete workflow: generate → optimize → upsell"""
        # 1. Generate quote
        mock_db_instance = MagicMock()
        catalog_response = MagicMock()
        catalog_response.data = [{"id": "1", "name": "Water Heater", "price": 850.00}]
        mock_db_instance.table().select().eq().execute.return_value = catalog_response
        mock_db.return_value = mock_db_instance
        
        mock_gemini_instance = MagicMock()
        gemini_response = MagicMock()
        gemini_response.text = '{"line_items": [{"name": "Water Heater", "quantity": 1, "unit_price": 850.00, "total": 850.00}], "subtotal": 850.00, "total": 850.00}'
        mock_gemini_instance.generate_content.return_value = gemini_response
        mock_gemini.return_value = mock_gemini_instance
        
        quote_request = {
            "company_id": "company-123",
            "description": "Water heater replacement",
            "customer_name": "John Smith"
        }
        
        gen_response = test_client.post("/api/generate-quote", json=quote_request)
        assert gen_response.status_code == 200
        quote_data = gen_response.json()
        
        # 2. Optimize quote
        mock_optimizer_instance = MagicMock()
        mock_optimizer_instance.optimize_quote.return_value = {
            "win_probability": 0.75,
            "price_position": "competitive",
            "suggested_total": 900.00
        }
        mock_optimizer.return_value = mock_optimizer_instance
        
        opt_request = {
            "company_id": "company-123",
            "job_description": "Water heater replacement",
            "proposed_total": quote_data["total"],
            "line_items": quote_data["line_items"]
        }
        
        opt_response = test_client.post("/api/optimize-quote", json=opt_request)
        assert opt_response.status_code == 200
        opt_data = opt_response.json()
        assert "win_probability" in opt_data
        
        # 3. Get upsells
        mock_suggester_instance = MagicMock()
        mock_suggester_instance.suggest_upsells.return_value = {
            "suggestions": [{"name": "Expansion Tank", "estimated_price": 150.00}],
            "potential_increase": 150.00
        }
        mock_suggester.return_value = mock_suggester_instance
        
        upsell_request = {
            "company_id": "company-123",
            "job_description": "Water heater replacement",
            "current_items": quote_data["line_items"],
            "current_total": quote_data["total"]
        }
        
        upsell_response = test_client.post("/api/suggest-upsells", json=upsell_request)
        assert upsell_response.status_code == 200
        upsell_data = upsell_response.json()
        assert len(upsell_data["suggestions"]) > 0
