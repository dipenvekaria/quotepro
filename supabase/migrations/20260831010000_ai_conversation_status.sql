-- Widen ai_conversations.status to the values the code actually writes.
--
-- The check allowed success/error/partial. Since then the table gained two
-- more writers: failed-hard AI runs record status 'degraded' (the alerting
-- signal for an outage), and the ADK session service marks sessions 'active'
-- and closes them as 'closed'. Every one of those inserts violated the check —
-- and because the run logger deliberately never throws, the violation was
-- swallowed and the rows silently did not exist. An alert that watches
-- status='degraded' was watching rows that could never be written.
--
-- Found by an integration test, not in production traffic: production has
-- only ever written 'success' so far.

alter table ai_conversations drop constraint ai_conversations_status_check;
alter table ai_conversations add constraint ai_conversations_status_check
  check (status in ('success', 'error', 'partial', 'degraded', 'active', 'closed'));
