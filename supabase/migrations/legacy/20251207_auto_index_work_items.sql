-- Auto-index work items when status changes to accepted, scheduled, or completed
-- This ensures RAG always has the latest data

-- Create function to call Python indexer API
CREATE OR REPLACE FUNCTION notify_work_item_index()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger for relevant status changes
  IF NEW.status IN ('accepted', 'scheduled', 'completed') 
     AND (OLD.status IS NULL OR OLD.status NOT IN ('accepted', 'scheduled', 'completed')) THEN
    
    -- Send notification via pg_notify
    PERFORM pg_notify(
      'work_item_index',
      json_build_object(
        'work_item_id', NEW.id,
        'company_id', NEW.company_id,
        'status', NEW.status,
        'job_name', NEW.job_name
      )::text
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS work_item_index_trigger ON work_items;
CREATE TRIGGER work_item_index_trigger
  AFTER INSERT OR UPDATE OF status ON work_items
  FOR EACH ROW
  EXECUTE FUNCTION notify_work_item_index();

-- Comment
COMMENT ON FUNCTION notify_work_item_index() IS 'Notifies indexer when work item needs to be indexed';
