# python-backend/app/routes/adk.py
import asyncio
from uuid import UUID, uuid4
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

from google.adk import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

from app.agents.quote_builder_agent import create_quote_builder_agent
from config.settings import get_settings

# Define the main router for this module
router = APIRouter(
    prefix="/adk",
    tags=["ADK"],
)

# Create in-memory session service
session_service = InMemorySessionService()

# --- Pydantic Models for Request and Response ---

class AdkChatRequest(BaseModel):
    message: str
    user_id: str = "default_user"  # Simple user ID for now
    session_id: Optional[str] = None

class AdkChatResponse(BaseModel):
    reply: str
    session_id: str

# --- API Endpoint ---

@router.post("/chat", response_model=AdkChatResponse)
async def adk_chat(request: AdkChatRequest):
    """
    Handles conversational chat with the QuoteBuilderAgent using in-memory sessions.
    """
    app_name = "QuoteBuilderAgent"
    session_id = request.session_id or str(uuid4())
    user_id = request.user_id

    # Create session if needed
    try:
        session = await session_service.get_session(
            app_name=app_name,
            user_id=user_id,
            session_id=session_id
        )
    except:
        session = None
    
    if not session:
        session = await session_service.create_session(
            app_name=app_name,
            user_id=user_id,
            session_id=session_id
        )

    # Run the agent
    agent = create_quote_builder_agent()
    runner = Runner(agent=agent, app_name=app_name, session_service=session_service)

    final_response = ""
    try:
        message_content = types.Content(
            role="user",
            parts=[types.Part(text=request.message)]
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
        print(f"Agent execution error: {e}")
        raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")

    if not final_response:
        raise HTTPException(status_code=500, detail="Agent did not produce a response")

    return AdkChatResponse(
        reply=final_response,
        session_id=session_id
    )
