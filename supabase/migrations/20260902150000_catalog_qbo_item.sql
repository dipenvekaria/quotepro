-- Each price book item remembers its QuickBooks Item id, so synced invoice
-- lines post under the real thing that was sold rather than one generic
-- service item. Custom one-off lines still use the generic item.
alter table catalog_items add column if not exists qbo_item_id text;
