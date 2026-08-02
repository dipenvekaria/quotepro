-- Add discount_target column to quote_items
-- "total" = percentage discount recalculates when items change
-- "<item name>" = discount fixed to specific item, doesn't recalculate

ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS discount_target TEXT;

-- Comment for documentation
COMMENT ON COLUMN quote_items.discount_target IS 'For discounts: "total" means overall discount that recalculates, or item name for item-specific fixed discounts';
