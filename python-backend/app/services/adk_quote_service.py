# python-backend/app/services/adk_quote_service.py
"""
ADK Quote Service - Unified service for calling ADK agent from regular API endpoints
"""
import json
import asyncio
from typing import List, Dict, Any, Optional
from uuid import uuid4

from google.adk import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

from app.agents.quote_builder_agent import create_quote_builder_agent


class AdkQuoteService:
    """Service for generating and updating quotes using ADK agent"""
    
    def __init__(self):
        self.session_service = InMemorySessionService()
        self.app_name = "QuoteBuilderAgent"
    
    async def generate_quote_async(
        self, 
        description: str,
        existing_items: List[Dict] = None,
        customer_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate or update quote using ADK agent
        
        Args:
            description: Job description or update instruction
            existing_items: Existing line items (for updates)
            customer_address: Customer address for tax calculation
            
        Returns:
            dict with line_items array and metadata
        """
        # Create session
        session_id = str(uuid4())
        user_id = "api_user"
        
        session = await self.session_service.create_session(
            app_name=self.app_name,
            user_id=user_id,
            session_id=session_id
        )
        
        # Build the prompt
        if existing_items:
            prompt = f"""Update the existing quote based on this instruction: {description}

Current line items:
{json.dumps(existing_items, indent=2)}

Return updated line items as JSON array."""
        else:
            prompt = f"""Generate a quote for: {description}

Return line items as JSON array with name, description, quantity, unit_price, total fields."""
        
        if customer_address:
            prompt += f"\n\nCustomer address: {customer_address}"
        
        # Run the agent
        agent = create_quote_builder_agent()
        runner = Runner(agent=agent, app_name=self.app_name, session_service=self.session_service)
        
        final_response = ""
        try:
            message_content = types.Content(
                role="user",
                parts=[types.Part(text=prompt)]
            )
            
            async for event in runner.run_async(
                user_id=user_id,
                session_id=session_id,
                new_message=message_content,
            ):
                if event.is_final_response() and event.content and event.content.parts:
                    final_response = event.content.parts[0].text
                    break
        except Exception as e:
            raise Exception(f"ADK agent execution failed: {str(e)}")
        
        if not final_response:
            raise Exception("ADK agent did not produce a response")
        
        # Parse JSON response
        try:
            # Extract JSON from response (agent might wrap it in markdown)
            json_match = final_response
            if "```json" in final_response:
                json_match = final_response.split("```json")[1].split("```")[0].strip()
            elif "```" in final_response:
                json_match = final_response.split("```")[1].split("```")[0].strip()
            
            result = json.loads(json_match)
            
            # Ensure we have line_items array
            if isinstance(result, list):
                result = {"line_items": result}
            elif "line_items" not in result:
                raise Exception("Response missing line_items array")
            
            return result
            
        except json.JSONDecodeError as e:
            raise Exception(f"Failed to parse agent response as JSON: {str(e)}\nResponse: {final_response}")
    
    def generate_quote(
        self, 
        description: str,
        existing_items: List[Dict] = None,
        customer_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """Synchronous wrapper for generate_quote_async"""
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(
                self.generate_quote_async(description, existing_items, customer_address)
            )
        finally:
            loop.close()


def get_adk_quote_service() -> AdkQuoteService:
    """Dependency injection for ADK quote service"""
    return AdkQuoteService()
