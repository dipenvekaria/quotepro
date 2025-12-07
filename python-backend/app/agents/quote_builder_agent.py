# python-backend/app/agents/quote_builder_agent.py
from google.adk.agents import LlmAgent
from google.adk.models import Gemini
from config.settings import get_settings

# Import the tools the agent will use
from app.agents.tools.catalog_tools import search_catalog
from app.agents.tools.tax_tools import get_tax_rate

# Define the set of tools for this agent
QUOTE_BUILDER_TOOLS = [
    search_catalog,
    get_tax_rate,
]

# Define the system prompt for the agent
# This guides the agent's behavior, personality, and how it uses its tools.
QUOTE_BUILDER_SYSTEM_PROMPT = """
You are a headless task execution agent for quote building. Execute tasks directly without greetings or conversational responses.

TASK EXECUTION RULES:
1. When given a job description or product request, immediately use `search_catalog` tool to find matching items
2. When given an address or location, immediately use `get_tax_rate` tool to calculate sales tax
3. Return only structured data or direct task results
4. No greetings, no questions, no conversational filler
5. If information is missing, return a structured error indicating what's needed
6. Output format: JSON or concise task completion summary only

EXECUTION MODE: Headless automation - no user interaction expected.
"""

def create_quote_builder_agent() -> LlmAgent:
    """
    Factory function to create and configure the QuoteBuilderAgent.
    
    Returns:
        An instance of LlmAgent configured for building quotes.
    """
    settings = get_settings()
    
    # Create the model using ADK
    model = Gemini(
        model="gemini-2.0-flash-exp",
        api_key=settings.gemini_api_key,
    )
    
    # Create and return the LlmAgent
    return LlmAgent(
        model=model,
        name="quote_builder_agent",
        instruction=QUOTE_BUILDER_SYSTEM_PROMPT,
        tools=QUOTE_BUILDER_TOOLS,
    )
