-- The pipeline board orders by updated_at and had no index for it — at a
-- hundred jobs a week the sort walks every row the company owns. Serves the
-- board's windowed fetch and the per-column counts alongside the existing
-- (company_id, status) index.
create index if not exists work_items_company_updated_idx
  on work_items (company_id, updated_at desc);
