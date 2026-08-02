"""Tax rate lookup by US state extracted from a customer address.

Ported from legacy `python-backend/tax_rates.py` — same data, cleaner API.
"""

from __future__ import annotations

import re

# Base state sales-tax rates (%). Local taxes may apply on top.
_STATE_TAX_RATES: dict[str, float] = {
    # No sales tax
    "AK": 0.0, "DE": 0.0, "MT": 0.0, "NH": 0.0, "OR": 0.0,
    # Sales tax states
    "AL": 4.0, "AR": 6.5, "AZ": 5.6, "CA": 7.25, "CO": 2.9, "CT": 6.35, "DC": 6.0,
    "FL": 6.0, "GA": 4.0, "HI": 4.0, "IA": 6.0, "ID": 6.0, "IL": 6.25, "IN": 7.0,
    "KS": 6.5, "KY": 6.0, "LA": 4.45, "MA": 6.25, "MD": 6.0, "ME": 5.5, "MI": 6.0,
    "MN": 6.875, "MO": 4.225, "MS": 7.0, "NC": 4.75, "ND": 5.0, "NE": 5.5, "NJ": 6.625,
    "NM": 5.125, "NV": 6.85, "NY": 4.0, "OH": 5.75, "OK": 4.5, "PA": 6.0, "RI": 7.0,
    "SC": 6.0, "SD": 4.2, "TN": 7.0, "TX": 6.25, "UT": 6.1, "VA": 5.3, "VT": 6.0,
    "WA": 6.5, "WI": 5.0, "WV": 6.0, "WY": 4.0,
}

_STATE_NAMES: dict[str, str] = {
    "alabama": "AL", "alaska": "AK", "arizona": "AZ", "arkansas": "AR",
    "california": "CA", "colorado": "CO", "connecticut": "CT", "delaware": "DE",
    "florida": "FL", "georgia": "GA", "hawaii": "HI", "idaho": "ID",
    "illinois": "IL", "indiana": "IN", "iowa": "IA", "kansas": "KS",
    "kentucky": "KY", "louisiana": "LA", "maine": "ME", "maryland": "MD",
    "massachusetts": "MA", "michigan": "MI", "minnesota": "MN", "mississippi": "MS",
    "missouri": "MO", "montana": "MT", "nebraska": "NE", "nevada": "NV",
    "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY",
    "north carolina": "NC", "north dakota": "ND", "ohio": "OH", "oklahoma": "OK",
    "oregon": "OR", "pennsylvania": "PA", "rhode island": "RI", "south carolina": "SC",
    "south dakota": "SD", "tennessee": "TN", "texas": "TX", "utah": "UT",
    "vermont": "VT", "virginia": "VA", "washington": "WA", "west virginia": "WV",
    "wisconsin": "WI", "wyoming": "WY", "district of columbia": "DC",
}

_STATE_ABBR_RE = re.compile(r"\b([A-Z]{2})\b")


def extract_state(address: str) -> str | None:
    """Best-effort state extraction from a free-form address."""
    if not address:
        return None
    for match in reversed(_STATE_ABBR_RE.findall(address.upper())):
        if match in _STATE_TAX_RATES:
            return match
    lower = address.lower()
    for name, code in _STATE_NAMES.items():
        if name in lower:
            return code
    return None


def get_tax_rate(address: str, *, default_rate: float = 8.5) -> float:
    """Return the base state sales tax rate for the address (or default)."""
    state = extract_state(address)
    if state and state in _STATE_TAX_RATES:
        return _STATE_TAX_RATES[state]
    return default_rate
