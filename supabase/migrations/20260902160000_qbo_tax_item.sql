-- The QBO item Rivet books sales tax under (a Service item pointing at a
-- liability account). Cached like the generic service item.
alter table quickbooks_connections add column if not exists qbo_tax_item_id text;
