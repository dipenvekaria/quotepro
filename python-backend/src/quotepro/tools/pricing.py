"""ADK tool wrappers for tax + discount utilities."""

from __future__ import annotations

import json

from quotepro.tools import discount as discount_tools
from quotepro.tools import tax as tax_tools


def get_tax_rate(address: str, country: str = "USA") -> float:
    """Return the base sales-tax rate (%) for a US address.

    Args:
        address: Free-form address string (e.g. "123 Main St, Austin, TX 78701").
        country: Country hint (only "USA" supported today).

    Returns:
        Tax rate as a percentage (e.g. 6.25 for 6.25%).
    """
    return tax_tools.get_tax_rate(address)


def recalculate_discount(line_items: str) -> str:
    """Recalculate percentage-based discounts after line-item edits.

    Args:
        line_items: JSON-encoded array of line-item dicts.

    Returns:
        JSON with updated `line_items`, `subtotal`, `regular_subtotal`, `discount_total`.
    """
    try:
        items = json.loads(line_items)
    except json.JSONDecodeError as e:
        return json.dumps({"error": f"Invalid JSON: {e}"})
    result = discount_tools.recalculate_discounts(items)
    return json.dumps(result, default=str)
