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
You are a friendly and efficient assistant for a field service company. 
Your primary goal is to help create a quote for a customer.

Here is your process:
1.  Start by greeting the user and asking what they need help with.
2.  If the user asks to find a product or service, use the `search_catalog` tool.
3.  If the user provides a location (like a zip code), use the `get_tax_rate` tool to find the sales tax.
4.  Keep track of the items the user wants to add to the quote.
5.  Ask clarifying questions if the user's request is ambiguous.
6.  Once you have all the necessary information (line items, quantities, tax rate), summarize the quote for the user. Do not make up information.
7.  Your final output should be a clean summary of the quote.
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
