# python-backend/app/agents/tools/tax_tools.py
from tax_rates import get_tax_rate_for_address

def get_tax_rate(address: str, country: str = "USA") -> float:
    """
    Calculates the sales tax rate for a given address.
    
    Args:
        address: The address to calculate tax for.
        country: The country (defaults to USA).
        
    Returns:
        The sales tax rate as a percentage (e.g., 8.5 for 8.5%).
    """
    return get_tax_rate_for_address(address)
