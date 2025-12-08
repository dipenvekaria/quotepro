# python-backend/app/agents/tools/discount_tools.py
import json
from typing import List, Dict, Any

def recalculate_discount(line_items: str) -> str:
    """
    Recalculates percentage-based discounts after line item changes.
    
    This function separates regular items from discounts, recalculates the subtotal,
    then updates percentage-based discounts that target the total (overall discounts).
    Item-specific discounts remain fixed.
    
    Args:
        line_items: JSON string containing array of line items with structure:
                   [{name, quantity, unit_price, total, is_discount, discount_target}, ...]
        
    Returns:
        JSON string with updated line items including recalculated discounts.
        Format: {"line_items": [...], "subtotal": float, "summary": str}
    """
    try:
        items = json.loads(line_items)
        
        # Separate regular items and discounts
        regular_items = [item for item in items if not item.get('is_discount', False) and item.get('total', 0) >= 0]
        discount_items = [item for item in items if item.get('is_discount', False) or item.get('total', 0) < 0]
        
        # Calculate subtotal of regular items (before discounts)
        regular_subtotal = sum(item.get('total', 0) for item in regular_items)
        
        # Recalculate percentage-based discounts ONLY if discount_target is "total"
        updated_discounts = []
        for discount in discount_items:
            is_overall_discount = discount.get('discount_target') == 'total'
            
            # Check if this is a percentage discount (name contains "%")
            import re
            name_match = re.search(r'(\d+(?:\.\d+)?)\s*%', discount.get('name', ''))
            
            if is_overall_discount and name_match:
                percentage = float(name_match.group(1))
                new_discount_amount = -(regular_subtotal * percentage / 100)
                updated_discount = {
                    **discount,
                    'unit_price': new_discount_amount,
                    'total': new_discount_amount
                }
                updated_discounts.append(updated_discount)
            else:
                # Item-specific discounts stay fixed
                updated_discounts.append(discount)
        
        # Combine items with updated discounts
        all_items = regular_items + updated_discounts
        
        # Calculate final subtotal (includes discounts)
        final_subtotal = sum(item.get('total', 0) for item in all_items)
        
        return json.dumps({
            "line_items": all_items,
            "subtotal": final_subtotal,
            "summary": f"Recalculated {len(updated_discounts)} discount(s). Regular subtotal: ${regular_subtotal:.2f}, Final subtotal: ${final_subtotal:.2f}"
        }, indent=2)
        
    except json.JSONDecodeError as e:
        return json.dumps({"error": f"Invalid JSON input: {str(e)}"})
    except Exception as e:
        return json.dumps({"error": f"Discount recalculation failed: {str(e)}"})
