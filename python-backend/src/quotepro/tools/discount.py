"""Recalculate percentage-based discounts after line-item changes.

Discount rules:
- `is_discount=true` items have negative unit_price + total.
- If `discount_target='total'` AND name contains "N%" pattern → recalculate
  as a percentage of the current regular subtotal.
- Otherwise the discount amount stays fixed.
"""

from __future__ import annotations

import re
from typing import Any

_PERCENT_RE = re.compile(r"(\d+(?:\.\d+)?)\s*%")


def recalculate_discounts(line_items: list[dict[str, Any]]) -> dict[str, Any]:
    """Recalculate discount amounts. Returns dict with updated items + subtotal.

    Args:
        line_items: list of dicts with keys: name, quantity, unit_price, total,
                    is_discount, discount_target

    Returns:
        {
          "line_items": [...],
          "subtotal": float,
          "regular_subtotal": float,
          "discount_total": float,
        }
    """
    regular = [i for i in line_items if not i.get("is_discount") and (i.get("total") or 0) >= 0]
    discounts = [i for i in line_items if i.get("is_discount") or (i.get("total") or 0) < 0]

    regular_subtotal = sum(float(i.get("total") or 0) for i in regular)

    updated: list[dict[str, Any]] = []
    for d in discounts:
        is_overall = d.get("discount_target") == "total"
        match = _PERCENT_RE.search(d.get("name", ""))
        if is_overall and match:
            pct = float(match.group(1))
            new_amount = round(-(regular_subtotal * pct / 100), 2)
            updated.append({**d, "unit_price": new_amount, "total": new_amount})
        else:
            updated.append(d)

    all_items = regular + updated
    discount_total = sum(float(i.get("total") or 0) for i in updated)
    subtotal = regular_subtotal + discount_total

    return {
        "line_items": all_items,
        "regular_subtotal": round(regular_subtotal, 2),
        "discount_total": round(discount_total, 2),
        "subtotal": round(subtotal, 2),
    }
