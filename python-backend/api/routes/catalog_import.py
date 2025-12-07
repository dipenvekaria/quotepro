"""
AI-Powered CSV Import for Catalog Items
Intelligently maps user CSV columns to database schema
"""

import io
import csv
import json
import logging
from typing import Dict, List, Optional, Any
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from pydantic import BaseModel
import google.generativeai as genai
from config.settings import get_settings

settings = get_settings()

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/catalog", tags=["catalog-import"])

# Configure Gemini
genai.configure(api_key=settings.gemini_api_key)


class ColumnMapping(BaseModel):
    """AI-suggested column mapping"""
    csv_column: str
    db_field: str
    confidence: float
    sample_values: List[str]


class MappingSuggestion(BaseModel):
    """Complete mapping suggestion from AI"""
    mappings: List[ColumnMapping]
    unmapped_columns: List[str]
    missing_required_fields: List[str]
    row_count: int
    preview_rows: List[Dict[str, Any]]


class ConfirmedMapping(BaseModel):
    """User-confirmed column mappings"""
    mappings: Dict[str, str]  # csv_column -> db_field
    upload_mode: str  # 'replace' or 'append'


# Database schema for catalog items
CATALOG_SCHEMA = {
    "name": {
        "type": "string",
        "required": True,
        "description": "Product or service name",
        "examples": ["Plumbing Service", "Widget Model X", "Consultation Fee"]
    },
    "description": {
        "type": "text",
        "required": False,
        "description": "Detailed description of the item",
        "examples": ["Standard hourly rate for plumbing services"]
    },
    "category": {
        "type": "string",
        "required": False,
        "description": "Category or department",
        "examples": ["Plumbing", "Electrical", "HVAC", "Parts", "Labor"]
    },
    "subcategory": {
        "type": "string",
        "required": False,
        "description": "Subcategory for more granular organization",
        "examples": ["Residential", "Commercial", "Emergency"]
    },
    "base_price": {
        "type": "decimal",
        "required": True,
        "description": "Base price per unit in dollars",
        "examples": ["150.00", "29.99", "0.50"]
    },
    "unit": {
        "type": "string",
        "required": False,
        "description": "Unit of measurement",
        "examples": ["hour", "each", "sqft", "lf", "job"]
    },
    "tags": {
        "type": "array",
        "required": False,
        "description": "Tags for search and AI matching",
        "examples": [["urgent", "residential"], ["commercial", "warranty"]]
    },
    "typical_quantity": {
        "type": "decimal",
        "required": False,
        "description": "Typical quantity used per job",
        "examples": ["1.0", "4.5", "100.0"]
    },
    "labor_hours": {
        "type": "decimal",
        "required": False,
        "description": "Typical labor hours required",
        "examples": ["2.0", "0.5", "8.0"]
    },
    "material_cost": {
        "type": "decimal",
        "required": False,
        "description": "Cost of materials (for margin calculation)",
        "examples": ["100.00", "15.50"]
    }
}


def analyze_csv_with_ai(csv_content: str, headers: List[str], sample_rows: List[Dict]) -> Dict:
    """Use Gemini to intelligently map CSV columns to database schema"""
    
    prompt = f"""You are an expert data analyst specializing in mapping CSV data to database schemas.
Your task is to analyze a CSV file containing products/services catalog data and map each column to the correct database field.

=== DATABASE SCHEMA (Target Fields) ===
{json.dumps(CATALOG_SCHEMA, indent=2)}

=== CSV HEADERS FROM USER'S FILE ===
{json.dumps(headers, indent=2)}

=== SAMPLE DATA (First 5 rows) ===
{json.dumps(sample_rows[:5], indent=2)}

=== YOUR DETAILED ANALYSIS TASK ===

STEP 1: Analyze each CSV column individually
For EACH column in the CSV headers:
- Look at the column header name
- Look at the actual data values in that column across all sample rows
- Determine what type of data it contains (text, numbers, prices, categories, etc.)
- Match it to the most appropriate database field

STEP 2: Required Field Detection (CRITICAL)
You MUST find mappings for these required fields:
- "name" - The product/service name. Look for columns like: Item, Product, Service, Title, Name, Description, Item Name, Product Name, Service Name, Line Item, SKU Name, etc.
- "base_price" - The price/rate. Look for columns like: Price, Rate, Cost, Amount, Unit Price, Sales Price, List Price, Retail, Fee, Charge, $, etc.

STEP 3: Optional Field Detection
Also try to find these optional fields:
- "description" - Detailed description text
- "category" - Category, Type, Department, Group, Class
- "subcategory" - Subcategory, Sub-Category, Sub Type
- "unit" - Unit, UOM, Unit of Measure (hour, each, sqft, etc.)
- "tags" - Tags, Keywords, Labels
- "typical_quantity" - Qty, Quantity, Default Qty
- "labor_hours" - Hours, Labor Hours, Time
- "material_cost" - Material Cost, Cost, COGS

STEP 4: Data Pattern Recognition
Use these patterns to identify columns:
- If values look like "$123.45" or "99.99" → likely a price field
- If values are short text like "Plumbing", "HVAC", "Electrical" → likely category
- If values are longer descriptive text → likely description or name
- If values are "hour", "each", "sqft", "job" → likely unit field
- If values are comma-separated words → likely tags

STEP 5: Handle Ambiguous Cases
- If a column could be "name" or "description", prefer mapping to "name" if it's the first text column
- If there are multiple price-like columns, map the one that looks like selling price to "base_price"
- If column header is unclear, USE THE DATA VALUES to determine the mapping

=== OUTPUT FORMAT (STRICT JSON) ===
Return ONLY valid JSON in this exact format:
{{
    "mappings": [
        {{
            "csv_column": "exact column header from CSV",
            "db_field": "database field name",
            "confidence": 0.95,
            "reasoning": "why this mapping makes sense"
        }}
    ],
    "unmapped_columns": ["columns that don't fit any database field"],
    "missing_required_fields": ["name and/or base_price if not found"]
}}

=== CRITICAL RULES ===
1. ALWAYS try to find "name" mapping - this is the product/service identifier
2. ALWAYS try to find "base_price" mapping - this is the selling price
3. Look at ACTUAL DATA VALUES, not just column headers
4. Confidence should be 0.9+ if column header clearly matches
5. Confidence should be 0.6-0.8 if only data values suggest the mapping
6. Do NOT leave required fields unmapped if there's ANY reasonable match
7. Map EVERY column that has a reasonable match - be thorough!

Now analyze the CSV and return the JSON mapping."""

    try:
        model = genai.GenerativeModel('gemini-2.0-flash-exp')
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                temperature=0.1,
                response_mime_type="application/json"
            )
        )
        
        result = json.loads(response.text)
        logger.info(f"AI mapping result: {json.dumps(result, indent=2)}")
        return result
        
    except Exception as e:
        logger.error(f"AI mapping failed: {e}")
        # Fallback to basic heuristics
        return fallback_mapping(headers, sample_rows)


def fallback_mapping(headers: List[str], sample_rows: List[Dict]) -> Dict:
    """Simple heuristic mapping when AI fails"""
    mappings = []
    unmapped = []
    
    # Common column name patterns
    name_patterns = ['name', 'item', 'product', 'service', 'description', 'title']
    price_patterns = ['price', 'rate', 'cost', 'amount', 'unit_price', 'unit price', 'base_price', 'base price']
    category_patterns = ['category', 'type', 'dept', 'department', 'group']
    subcategory_patterns = ['subcategory', 'sub_category', 'sub category', 'subcat']
    unit_patterns = ['unit', 'uom', 'unit of measure', 'measurement']
    
    for header in headers:
        lower = header.lower().strip()
        matched = False
        
        if any(p in lower for p in name_patterns):
            mappings.append({
                "csv_column": header,
                "db_field": "name",
                "confidence": 0.7,
                "reasoning": "Column name suggests item name"
            })
            matched = True
        elif any(p in lower for p in price_patterns):
            mappings.append({
                "csv_column": header,
                "db_field": "base_price",
                "confidence": 0.8,
                "reasoning": "Column name suggests pricing"
            })
            matched = True
        elif any(p in lower for p in category_patterns):
            mappings.append({
                "csv_column": header,
                "db_field": "category",
                "confidence": 0.6,
                "reasoning": "Column name suggests categorization"
            })
            matched = True
        elif any(p in lower for p in subcategory_patterns):
            mappings.append({
                "csv_column": header,
                "db_field": "subcategory",
                "confidence": 0.6,
                "reasoning": "Column name suggests subcategory"
            })
            matched = True
        elif any(p in lower for p in unit_patterns):
            mappings.append({
                "csv_column": header,
                "db_field": "unit",
                "confidence": 0.7,
                "reasoning": "Column name suggests unit of measure"
            })
            matched = True
        
        if not matched:
            unmapped.append(header)
    
    # Check for missing required fields
    mapped_fields = [m['db_field'] for m in mappings]
    missing_required = [
        field for field, schema in CATALOG_SCHEMA.items()
        if schema.get('required') and field not in mapped_fields
    ]
    
    return {
        "mappings": mappings,
        "type_detection": {
            "detected_type": "product",
            "confidence": 0.5,
            "reasoning": "Fallback default"
        },
        "unmapped_columns": unmapped,
        "missing_required_fields": missing_required
    }


def parse_csv_smart(csv_text: str) -> tuple[List[str], List[Dict]]:
    """
    Smart CSV parser that handles:
    - Empty first rows
    - Empty columns
    - Header detection
    """
    lines = csv_text.strip().split('\n')
    
    # Find header row (first row with at least 2 non-empty values)
    header_row_idx = 0
    for i, line in enumerate(lines):
        values = [v.strip().strip('"') for v in line.split(',')]
        non_empty = [v for v in values if v]
        if len(non_empty) >= 2:
            header_row_idx = i
            break
    
    # Parse header row
    raw_headers = [v.strip().strip('"') for v in lines[header_row_idx].split(',')]
    
    # Find valid column indices (non-empty headers)
    valid_indices = []
    headers = []
    for i, h in enumerate(raw_headers):
        if h:
            valid_indices.append(i)
            headers.append(h)
    
    if not headers:
        return [], []
    
    # Parse data rows
    rows = []
    for line in lines[header_row_idx + 1:]:
        if not line.strip():
            continue
        values = [v.strip().strip('"') for v in line.split(',')]
        row = {}
        for idx, header in enumerate(headers):
            orig_idx = valid_indices[idx]
            row[header] = values[orig_idx] if orig_idx < len(values) else ''
        # Skip empty rows
        if any(v for v in row.values()):
            rows.append(row)
    
    return headers, rows


@router.post("/analyze-csv")
async def analyze_csv(file: UploadFile = File(...)):
    """
    Step 1: Analyze uploaded CSV and return AI-suggested column mapping
    """
    try:
        # Read file
        contents = await file.read()
        
        # Try to decode
        try:
            csv_text = contents.decode('utf-8')
        except UnicodeDecodeError:
            csv_text = contents.decode('latin-1')
        
        # Smart parse CSV (handles empty rows/columns)
        headers, rows = parse_csv_smart(csv_text)
        
        if not rows:
            raise HTTPException(400, "CSV file is empty or couldn't parse headers")
        
        logger.info(f"Parsed CSV: {len(headers)} columns, {len(rows)} rows")
        logger.info(f"Headers: {headers}")
        
        # Get AI mapping
        ai_result = analyze_csv_with_ai(csv_text, headers, rows[:5])
        
        # Build response
        mappings = []
        for mapping in ai_result.get('mappings', []):
            csv_col = mapping['csv_column']
            sample_values = [
                str(row.get(csv_col, ''))[:50] 
                for row in rows[:3] 
                if row.get(csv_col)
            ]
            
            mappings.append(ColumnMapping(
                csv_column=csv_col,
                db_field=mapping['db_field'],
                confidence=mapping['confidence'],
                sample_values=sample_values
            ))
        
        return MappingSuggestion(
            mappings=mappings,
            unmapped_columns=ai_result.get('unmapped_columns', []),
            missing_required_fields=ai_result.get('missing_required_fields', []),
            row_count=len(rows),
            preview_rows=rows[:5]
        )
        
    except Exception as e:
        logger.error(f"CSV analysis error: {e}")
        raise HTTPException(500, f"Failed to analyze CSV: {str(e)}")


@router.post("/import-with-mapping")
async def import_with_mapping(
    file: UploadFile = File(...),
    mapping: str = Form(...)
):
    """
    Step 2: Import CSV with user-confirmed column mapping
    """
    try:
        # Parse mapping from JSON string
        import json
        mapping_data = json.loads(mapping)
        confirmed_mapping = ConfirmedMapping(**mapping_data)
        
        # Read file again
        contents = await file.read()
        try:
            csv_text = contents.decode('utf-8')
        except UnicodeDecodeError:
            csv_text = contents.decode('latin-1')
        
        # Use smart parser
        headers, rows = parse_csv_smart(csv_text)
        
        # Transform rows using mapping
        catalog_items = []
        errors = []
        
        logger.info(f"Processing {len(rows)} rows with mapping: {confirmed_mapping.mappings}")
        
        for idx, row in enumerate(rows):
            try:
                item = {}
                for csv_col, db_field in confirmed_mapping.mappings.items():
                    value = row.get(csv_col, '').strip()
                    if value:
                        # Type conversion
                        if db_field in ['base_price', 'material_cost', 'typical_quantity', 'labor_hours']:
                            # Remove currency symbols, commas
                            clean_value = value.replace('$', '').replace(',', '').strip()
                            # Handle values like "65.00 per ¼ hour" - extract first number
                            import re
                            match = re.match(r'^[\d.]+', clean_value)
                            if match:
                                item[db_field] = float(match.group())
                            else:
                                logger.warning(f"Row {idx+1}: Could not parse price from '{value}'")
                        elif db_field == 'tags':
                            # Split by comma or semicolon
                            item[db_field] = [t.strip() for t in value.replace(';', ',').split(',') if t.strip()]
                        else:
                            item[db_field] = value
                
                if idx < 3:
                    logger.info(f"Row {idx+1} item: {item}")
                
                # Validate required fields
                if 'name' not in item or not item['name']:
                    errors.append(f"Row {idx + 1}: Missing name")
                    continue
                if 'base_price' not in item or not item['base_price']:
                    errors.append(f"Row {idx + 1}: Missing price")
                    continue
                
                # Default unit if not mapped
                if 'unit' not in item:
                    item['unit'] = 'each'
                
                catalog_items.append(item)
                
            except Exception as e:
                errors.append(f"Row {idx + 1}: {str(e)}")
        
        return {
            "success": True,
            "imported_count": len(catalog_items),
            "error_count": len(errors),
            "errors": errors[:10],  # First 10 errors
            "items": catalog_items  # Return items for frontend to insert via Supabase
        }
        
    except Exception as e:
        logger.error(f"Import error: {e}")
        raise HTTPException(500, f"Failed to import: {str(e)}")
