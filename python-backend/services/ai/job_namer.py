"""
Job type classification service using Gemini AI and product catalog
"""
from .gemini_client import GeminiClient


class JobNamerService:
    """
    Service for classifying job types from descriptions using product catalog
    """
    
    def __init__(self, gemini: GeminiClient, db_connection=None):
        """
        Initialize job type classifier
        
        Args:
            gemini: Gemini client
            db_connection: Optional database connection for catalog lookup
        """
        self.gemini = gemini
        self.db = db_connection
    
    def generate_job_name(self, description: str, customer_name: str = "", company_id: str = None) -> str:
        """
        Generate standardized job type from description using product catalog
        
        Args:
            description: Job description or quote details
            customer_name: Optional customer name for context
            company_id: Company ID for catalog lookup
        
        Returns:
            Standardized job type (e.g., "Faucet Replacement", "HVAC Installation")
        """
        # Get available job types from catalog
        job_types = self._get_catalog_job_types(company_id) if company_id and self.db else []
        
        if job_types:
            # AI selects from catalog
            prompt = f"""You are classifying a job into ONE standardized job type.

AVAILABLE JOB TYPES (select ONE that best matches):
{chr(10).join(f"- {jt}" for jt in job_types)}

RULES:
- Select ONLY ONE job type from the list above
- Choose the MOST specific match
- Output ONLY the job type name (no explanation)
- If no perfect match, choose the closest category

TASK:
Description: {description}"""
        else:
            # Fallback: Generate standard job type
            prompt = f"""You are creating a standardized job type classification.

RULES:
- Maximum 40 characters
- Use standard industry terminology
- Format: "[Service Type]" (e.g., "Faucet Replacement", "HVAC Installation")
- NO customer names, NO locations, NO quotes
- Output ONLY the job type

EXAMPLES:
- Faucet Replacement
- HVAC Installation
- Water Heater Repair
- Drain Cleaning
- Emergency Plumbing

TASK:
Description: {description}"""
        
        if customer_name and not job_types:
            prompt += f"\nCustomer: {customer_name}"
        
        prompt += "\n\nJob type:"
        
        job_type = self.gemini.generate_text(prompt, temperature=0.0)
        
        # Clean up response
        lines = job_type.strip().split('\n')
        job_type = lines[0].strip().strip('"').strip("'")
        
        # Remove common prefixes
        prefixes = ["Job type:", "Job name:", "Here is", "Option", "The job"]
        for prefix in prefixes:
            if job_type.lower().startswith(prefix.lower()):
                job_type = job_type.split(':', 1)[-1].strip()
                break
        
        # Truncate to 40 chars if needed
        if len(job_type) > 40:
            job_type = job_type[:37] + "..."
        
        return job_type
    
    def _get_catalog_job_types(self, company_id: str) -> list:
        """
        Get distinct job types from product catalog (new schema)
        
        Args:
            company_id: Company ID
            
        Returns:
            List of job types
        """
        if not self.db:
            return []
        
        try:
            cursor = self.db.cursor()
            # Try new schema first (catalog_items)
            cursor.execute("""
                SELECT DISTINCT job_type 
                FROM catalog_items 
                WHERE company_id = %s 
                  AND job_type IS NOT NULL 
                  AND job_type != ''
                ORDER BY job_type
            """, (company_id,))
            
            return [row[0] for row in cursor.fetchall()]
        except Exception as e:
            print(f"Error fetching catalog job types: {e}")
            return []
