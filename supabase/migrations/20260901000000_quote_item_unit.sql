-- Carry the catalog item's unit onto the quote line.
--
-- Half of every starter catalog (5,237 of 9,945 items) is priced per ton,
-- sq ft, hour, visit or job, and the unit died the moment an item became a
-- line: the customer read "3 × $1,650.00" as three air conditioners when it
-- was three tons, and estimated_hours multiplied per-install labour by the
-- tonnage — a one-condenser job booked as 26.25 hours.
--
-- Snapshotted from the catalog at write time like unit_price and labor_hours
-- already are: a quote must not change because the price book was edited
-- afterwards. Null on rows from before this migration and on hand-typed lines,
-- which render exactly as they always did.

alter table quote_items add column if not exists unit text;
