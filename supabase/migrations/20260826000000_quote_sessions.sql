-- One quoting conversation per work item.
--
-- ai_conversations has existed since the baseline with entity_type, entity_id,
-- messages and the token and cost columns, and had never held a row. Using it
-- as the ADK session store needs one thing it lacks: a way to say that a work
-- item has exactly one quoting session.
--
-- Partial, on the quoting rows only. The table is general — other agents may
-- log several conversations against the same entity later — and constraining
-- all of them to answer a need of this one would be borrowing trouble.
create unique index if not exists ai_conversations_quote_session_idx
  on public.ai_conversations (company_id, entity_type, entity_id)
  where purpose = 'quoting';

-- The session's last activity, which ADK reports as lastUpdateTime. Reading
-- created_at for this made a conversation look untouched since the day it
-- started.
alter table public.ai_conversations
  add column if not exists updated_at timestamptz not null default now();

comment on index public.ai_conversations_quote_session_idx is
  'One quoting session per work item. The work item id IS the ADK session id.';
