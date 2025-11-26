"""
US State Sales Tax Rates
Updated: November 2024
Note: These are base state rates. Local taxes may apply.
"""

STATE_TAX_RATES = {
    # No sales tax states
    'AK': 0.0,    # Alaska
    'DE': 0.0,    # Delaware
    'MT': 0.0,    # Montana
    'NH': 0.0,    # New Hampshire
    'OR': 0.0,    # Oregon
    
    # States with sales tax
    'AL': 4.0,    # Alabama
    'AR': 6.5,    # Arkansas
    'AZ': 5.6,    # Arizona
    'CA': 7.25,   # California
    'CO': 2.9,    # Colorado
    'CT': 6.35,   # Connecticut
    'DC': 6.0,    # District of Columbia
    'FL': 6.0,    # Florida
    'GA': 4.0,    # Georgia
    'HI': 4.0,    # Hawaii
    'IA': 6.0,    # Iowa
    'ID': 6.0,    # Idaho
    'IL': 6.25,   # Illinois
    'IN': 7.0,    # Indiana
    'KS': 6.5,    # Kansas
    'KY': 6.0,    # Kentucky
    'LA': 4.45,   # Louisiana
    'MA': 6.25,   # Massachusetts
    'MD': 6.0,    # Maryland
    'ME': 5.5,    # Maine
    'MI': 6.0,    # Michigan
    'MN': 6.875,  # Minnesota
    'MO': 4.225,  # Missouri
    'MS': 7.0,    # Mississippi
    'NC': 4.75,   # North Carolina
    'ND': 5.0,    # North Dakota
    'NE': 5.5,    # Nebraska
    'NJ': 6.625,  # New Jersey
    'NM': 5.125,  # New Mexico
    'NV': 6.85,   # Nevada
    'NY': 4.0,    # New York
    'OH': 5.75,   # Ohio
    'OK': 4.5,    # Oklahoma
    'PA': 6.0,    # Pennsylvania
    'RI': 7.0,    # Rhode Island
    'SC': 6.0,    # South Carolina
    'SD': 4.2,    # South Dakota
    'TN': 7.0,    # Tennessee
    'TX': 6.25,   # Texas
    'UT': 6.1,    # Utah
    'VA': 5.3,    # Virginia
    'VT': 6.0,    # Vermont
    'WA': 6.5,    # Washington
    'WI': 5.0,    # Wisconsin
    'WV': 6.0,    # West Virginia
    'WY': 4.0,    # Wyoming
}

# State name to abbreviation mapping
STATE_ABBREVIATIONS = {
    'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
    'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
    'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
    'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
    'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
    'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
    'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
    'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
    'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
    'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
    'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
    'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
    'wisconsin': 'WI', 'wyoming': 'WY', 'district of columbia': 'DC',
}


def extract_state_from_address(address: str) -> str | None:
    """
    Extract state abbreviation from an address string.
    
    Args:
        address: Full address string (e.g., "123 Main St, Austin, TX 78701")
        
    Returns:
        Two-letter state code or None if not found
    """
    if not address:
        return None
    
    address_upper = address.upper()
    
    # Try to find state abbreviation (2 capital letters)
    import re
    
    # Look for state abbreviation patterns:
    # - After comma: ", TX" or ", TX "
    # - Before ZIP: "TX 78701" or "TX78701"
    # - Standalone: " TX " or " TX,"
    state_pattern = r'\b([A-Z]{2})\b'
    matches = re.findall(state_pattern, address_upper)
    
    # Check if any match is a valid state
    for match in reversed(matches):  # Check from end (more likely to be state)
        if match in STATE_TAX_RATES:
            return match
    
    # Try to find full state name
    address_lower = address.lower()
    for state_name, abbrev in STATE_ABBREVIATIONS.items():
        if state_name in address_lower:
            return abbrev
    
    return None


def get_tax_rate_for_address(address: str, default_rate: float = 8.5) -> float:
    """
    Get the sales tax rate for a given address.
    
    Args:
        address: Full address string
        default_rate: Default tax rate if state cannot be determined
        
    Returns:
        Tax rate as a percentage (e.g., 6.25 for 6.25%)
    """
    state = extract_state_from_address(address)
    
    if state and state in STATE_TAX_RATES:
        return STATE_TAX_RATES[state]
    
    return default_rate
