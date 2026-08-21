-- The Stripe webhook's double-credit protection was application-only: a
-- read-then-write that both of the parallel checkout events (session +
-- payment_intent) could pass before either inserted. This is the constraint
-- that actually enforces it. Partial on not-null so manual (cash/check)
-- payments, which may repeat a null reference, are unaffected.
create unique index if not exists payments_reference_number_key
  on payments (reference_number)
  where reference_number is not null;
