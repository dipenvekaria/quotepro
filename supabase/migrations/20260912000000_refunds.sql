-- Refunds: negative payment rows linked to what they refund, and an invoice
-- state that says the money went back.

alter type public.invoice_status add value if not exists 'refunded';

alter table public.payments
  add column if not exists refund_of uuid references public.payments(id) on delete restrict;

create index if not exists payments_refund_of_idx
  on public.payments (refund_of) where refund_of is not null;

-- Refund rows are negative by definition; the old positive-only check made
-- them unrepresentable. The replacement is stricter, not looser: a negative
-- amount is only legal when the row is linked to the payment it refunds.
alter table public.payments drop constraint if exists payments_amount_check;
alter table public.payments add constraint payments_amount_check
  check (
    (refund_of is null and amount > 0)
    or (refund_of is not null and amount < 0)
  );
