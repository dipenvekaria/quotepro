"""
Job name generation service using Gemini AI
"""
from .gemini_client import GeminiClient


class JobNamerService:
    """
    Service for generating professional job names from descriptions
    """
    
    def __init__(self, gemini: GeminiClient):
        """
        Initialize job namer
        
        Args:
            gemini: Gemini client
        """
        self.gemini = gemini
    
    def generate_job_name(self, description: str, customer_name: str = "") -> str:
        """
        Generate professional job name from description
        
        Args:
            description: Job description or quote details
            customer_name: Optional customer name for context
        
        Returns:
            Professional job name (e.g., "HVAC System Installation - Smith Residence")
        """
        system_prompt = """You are a professional scheduler creating concise job names.

Rules:
- Maximum 60 characters
- Professional tone
- Include main work type
- Include location if mentioned
- No quotes or special characters
- Format: "[Work Type] - [Location/Customer]"

Examples:
- "HVAC System Installation - 123 Oak St"
- "Water Heater Replacement - Smith Residence"
- "Emergency Plumbing Repair - Downtown Office"
- "Annual HVAC Maintenance - Johnson Home"

Output ONLY the job name, nothing else."""
        
        user_prompt = f"""Description: {description}"""
        if customer_name:
            user_prompt += f"\nCustomer: {customer_name}"
        
        user_prompt += "\n\nGenerate job name:"
        
        job_name = self.gemini.generate_text(user_prompt, temperature=0.0)
        
        # Clean up response (remove quotes if present)
        job_name = job_name.strip().strip('"').strip("'")
        
        # Truncate to 60 chars if needed
        if len(job_name) > 60:
            job_name = job_name[:57] + "..."
        
        return job_name
