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
from app.agents.tools.rag_tools import set_company_id


class AdkQuoteService:
    """Service for generating and updating quotes using ADK agent"""
    
    def __init__(self, company_id: str = None):
        self.session_service = InMemorySessionService()
        self.app_name = "QuoteBuilderAgent"
        self.company_id = company_id
    
    async def generate_quote(
        self,
        description: str,
        existing_items: List[dict] = None,
        customer_address: Optional[str] = None
    ) -> dict:
        """
        Generate or update quote using ADK agent
        
        Args:
            description: Job description or update instruction
            existing_items: Existing line items (for updates)
            customer_address: Customer address (for context only)
            
        Returns:
            dict with line_items array
        """
        # Create session with company_id in state
        session_id = str(uuid4())
        user_id = "api_user"
        
        session = await self.session_service.create_session(
            app_name=self.app_name,
            user_id=user_id,
            session_id=session_id
        )
        
        # Store company_id in session state for tools to access
        if self.company_id:
            session.state["company_id"] = self.company_id
            # Also set in context var for catalog tool
            set_company_id(self.company_id)
        
        # Build the prompt
        if existing_items:
            prompt = f"""Update the existing quote based on this instruction: {description}

Current line items:
{json.dumps(existing_items, indent=2)}

Requirements:
- Modify line items according to the instruction
- After modifying, call recalculate_discount tool to update percentage-based discounts
- Return the updated line_items array"""
        else:
            prompt = f"""Generate a quote for: {description}

Requirements:
1. FIRST call retrieve_catalog_items(query="{description}") to get products with REAL prices
2. OPTIONALLY call retrieve_similar_quotes(query="{description}") to see past pricing patterns
3. Build line_items using ONLY retrieved catalog data - DO NOT make up prices
4. If no catalog items found, return empty line_items array
5. Return structured JSON with line_items array"""
        
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
        
        # Log raw response for debugging
        print(f"🤖 ADK agent raw response (first 500 chars):\n{final_response[:500]}")
        
        # With output_schema, the response should be valid JSON
        try:
            result = json.loads(final_response)
            
            # Ensure we have line_items array
            if isinstance(result, list):
                result = {"line_items": result}
            elif "line_items" not in result:
                print(f"❌ Response missing line_items. Response keys: {result.keys() if isinstance(result, dict) else 'not a dict'}")
                raise Exception(f"Response missing line_items array. Got: {list(result.keys()) if isinstance(result, dict) else type(result)}")
            
            return {"line_items": result["line_items"]}
            
        except json.JSONDecodeError as e:
            # Fallback: try to extract JSON from markdown (shouldn't happen with output_schema)
            print(f"⚠️  JSON parse failed, trying markdown extraction...")
            try:
                if "```json" in final_response:
                    json_match = final_response.split("```json")[1].split("```")[0].strip()
                elif "```" in final_response:
                    json_match = final_response.split("```")[1].split("```")[0].strip()
                else:
                    json_match = final_response.strip()
                
                result = json.loads(json_match)
                
                if isinstance(result, list):
                    result = {"line_items": result}
                elif "line_items" not in result:
                    raise Exception(f"Extracted JSON missing line_items array. Got: {list(result.keys()) if isinstance(result, dict) else type(result)}")
                
                return {"line_items": result["line_items"]}
                
            except Exception as fallback_error:
                print(f"❌ Fallback extraction also failed: {str(fallback_error)}")
                print(f"Raw response:\n{final_response}")
                raise Exception(f"Failed to parse agent response as JSON: {str(e)}")
