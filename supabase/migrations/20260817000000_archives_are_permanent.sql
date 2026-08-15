-- Archives are kept permanently.
--
-- The original table expired them after 90 days on the reasoning that an
-- archive nobody ever deletes is itself a compliance problem. That is reversed
-- by decision: the record of a business that used Rivet is worth keeping, and a
-- contractor coming back after two years should find their history intact
-- rather than just outside a window nobody told them about.
--
-- Erasure is still possible and still a single statement — `delete from
-- archived_accounts where company_id = $1`. What is gone is the machinery that
-- did it on a timer, and the promise that it would.

drop index if exists archived_accounts_purge_idx;

alter table archived_accounts drop column if exists purge_after;

comment on table archived_accounts is
  'Snapshots of closed accounts, retained indefinitely. Contains multiple tenants'' data — service role only. Erasure requests are served by deleting the row.';
