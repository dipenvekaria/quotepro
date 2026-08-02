-- ============================================================================
-- QuotePro 2.0 — Seed Data (local dev / demo)
-- ============================================================================
-- Run with: psql "$SUPABASE_DB_URL" -f supabase/seed.sql
-- or: supabase db reset  (auto-applies this file after migrations)
--
-- Passwords for demo users: "demo1234"
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Demo auth.users (owner, office, technician)
-- ----------------------------------------------------------------------------

-- Fixed UUIDs so seed is idempotent when re-run
DO $$
DECLARE
  v_owner_id UUID := '11111111-1111-1111-1111-111111111111';
  v_office_id UUID := '22222222-2222-2222-2222-222222222222';
  v_tech_id UUID := '33333333-3333-3333-3333-333333333333';
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES
    ('00000000-0000-0000-0000-000000000000', v_owner_id, 'authenticated', 'authenticated',
     'owner@acme.demo', crypt('demo1234', gen_salt('bf')),
     NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"full_name":"Alex Owner"}'::jsonb,
     '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_office_id, 'authenticated', 'authenticated',
     'office@acme.demo', crypt('demo1234', gen_salt('bf')),
     NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"full_name":"Sam Office"}'::jsonb,
     '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_tech_id, 'authenticated', 'authenticated',
     'tech@acme.demo', crypt('demo1234', gen_salt('bf')),
     NOW(), NOW(), NOW(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"full_name":"Tam Tech"}'::jsonb,
     '', '', '', '')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at, last_sign_in_at)
  VALUES
    (gen_random_uuid(), v_owner_id,  v_owner_id::text,  jsonb_build_object('sub', v_owner_id::text,  'email', 'owner@acme.demo'),  'email', NOW(), NOW(), NOW()),
    (gen_random_uuid(), v_office_id, v_office_id::text, jsonb_build_object('sub', v_office_id::text, 'email', 'office@acme.demo'), 'email', NOW(), NOW(), NOW()),
    (gen_random_uuid(), v_tech_id,   v_tech_id::text,   jsonb_build_object('sub', v_tech_id::text,   'email', 'tech@acme.demo'),   'email', NOW(), NOW(), NOW())
  ON CONFLICT DO NOTHING;
END $$;

-- ----------------------------------------------------------------------------
-- 2. Company
-- ----------------------------------------------------------------------------

INSERT INTO public.companies (id, name, phone, email, address, settings, plan)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Acme HVAC & Plumbing',
  '+1-555-0100',
  'hello@acmehvac.demo',
  '2400 Market St, San Francisco, CA 94114',
  jsonb_build_object(
    'tax_rate', 8.625,
    'currency', 'USD',
    'timezone', 'America/Los_Angeles',
    'ai', jsonb_build_object('model', 'gemini-2.0-flash', 'temperature', 0.1)
  ),
  'pro'
) ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3. Team members (public.users)
-- ----------------------------------------------------------------------------

INSERT INTO public.users (id, company_id, role, profile, is_active) VALUES
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'owner',
   jsonb_build_object('first_name','Alex','last_name','Owner','phone','+1-555-0101'), TRUE),
  ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'office',
   jsonb_build_object('first_name','Sam','last_name','Office','phone','+1-555-0102'), TRUE),
  ('33333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'technician',
   jsonb_build_object('first_name','Tam','last_name','Tech','phone','+1-555-0103'), TRUE)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 4. Catalog (40 realistic HVAC + plumbing items)
-- ----------------------------------------------------------------------------

INSERT INTO public.catalog_items (company_id, name, description, category, subcategory, base_price, unit, tags, typical_quantity, labor_hours)
SELECT 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name, description, category, subcategory, base_price, unit, tags, typical_quantity, labor_hours
FROM (VALUES
  -- HVAC — Air Conditioning
  ('3-Ton AC Condenser — Carrier',        'Carrier Comfort Series 16 SEER, 3-ton',    'HVAC', 'Air Conditioning', 2450.00, 'each',   ARRAY['ac','carrier','16seer'], 1, 6.0),
  ('4-Ton AC Condenser — Carrier',        'Carrier Comfort Series 16 SEER, 4-ton',    'HVAC', 'Air Conditioning', 2850.00, 'each',   ARRAY['ac','carrier','16seer'], 1, 6.5),
  ('AC Coil Replacement',                 'Evaporator coil replacement',              'HVAC', 'Air Conditioning',  650.00, 'each',   ARRAY['ac','coil'],             1, 3.0),
  ('Refrigerant Recharge (R-410A)',       'Per pound',                                'HVAC', 'Air Conditioning',   85.00, 'lb',     ARRAY['refrigerant','r410a'],   3, 0.5),
  ('AC Tune-up',                          '19-point inspection & clean',              'HVAC', 'Air Conditioning',  149.00, 'each',   ARRAY['tune-up','maintenance'], 1, 1.5),
  -- HVAC — Heating
  ('80% AFUE Gas Furnace — 60k BTU',      'Standard efficiency, 60,000 BTU',           'HVAC', 'Heating',          1650.00, 'each',   ARRAY['furnace','gas'],         1, 5.0),
  ('96% AFUE Gas Furnace — 80k BTU',      'High-efficiency modulating furnace',       'HVAC', 'Heating',          2650.00, 'each',   ARRAY['furnace','gas','high-eff'], 1, 6.0),
  ('Heat Pump 3-Ton',                      'Air-source heat pump, 3-ton',              'HVAC', 'Heating',          3450.00, 'each',   ARRAY['heat-pump'],             1, 7.0),
  ('Thermostat — Ecobee Smart',           'Wi-Fi enabled with room sensors',          'HVAC', 'Controls',          299.00, 'each',   ARRAY['thermostat','smart'],    1, 1.0),
  ('Thermostat — Nest',                    'Wi-Fi enabled learning thermostat',        'HVAC', 'Controls',          249.00, 'each',   ARRAY['thermostat','nest'],     1, 1.0),
  -- HVAC — Ductwork
  ('Duct Sealing (Aeroseal)',              'Per system',                               'HVAC', 'Ductwork',         1850.00, 'system', ARRAY['aeroseal','ducts'],      1, 4.0),
  ('Return Air Ductwork',                  'Per linear foot, insulated',               'HVAC', 'Ductwork',           28.00, 'lf',     ARRAY['duct','return'],        20, 0.15),
  ('Supply Air Ductwork',                  'Per linear foot, insulated',               'HVAC', 'Ductwork',           32.00, 'lf',     ARRAY['duct','supply'],        20, 0.15),
  ('Duct Cleaning',                        'Whole home, per system',                   'HVAC', 'Ductwork',          450.00, 'system', ARRAY['cleaning','ducts'],      1, 3.0),
  -- HVAC — Indoor Air Quality
  ('UV Air Purifier',                      'Installed inline with air handler',        'HVAC', 'IAQ',               499.00, 'each',   ARRAY['uv','iaq'],              1, 1.5),
  ('HEPA Filter Media',                    '4-inch pleated filter',                    'HVAC', 'IAQ',                39.00, 'each',   ARRAY['filter','hepa'],         1, 0.1),
  ('Whole-Home Humidifier',                'Bypass style with humidistat',             'HVAC', 'IAQ',               649.00, 'each',   ARRAY['humidifier'],            1, 2.5),
  -- Plumbing — Water Heaters
  ('Water Heater — 50gal Gas',             'Standard atmospheric vent',                'Plumbing', 'Water Heater',  1250.00, 'each',   ARRAY['water-heater','gas'],    1, 3.0),
  ('Water Heater — 50gal Electric',        'Standard resistance element',              'Plumbing', 'Water Heater',   950.00, 'each',   ARRAY['water-heater','electric'], 1, 2.5),
  ('Tankless Water Heater — Rinnai',       'RU199iN 199k BTU tankless',                'Plumbing', 'Water Heater',  3450.00, 'each',   ARRAY['tankless','rinnai'],     1, 6.0),
  ('Water Heater Flush',                   'Drain and refill service',                 'Plumbing', 'Water Heater',   139.00, 'each',   ARRAY['maintenance'],           1, 1.0),
  ('Expansion Tank',                       '2-gallon inline',                          'Plumbing', 'Water Heater',    89.00, 'each',   ARRAY['expansion-tank'],        1, 0.5),
  -- Plumbing — Fixtures
  ('Toilet Installation — Standard',       'Round bowl, dual flush',                   'Plumbing', 'Fixtures',       349.00, 'each',   ARRAY['toilet'],                1, 2.0),
  ('Toilet Installation — Comfort Height', 'Elongated ADA-compliant',                  'Plumbing', 'Fixtures',       449.00, 'each',   ARRAY['toilet','ada'],          1, 2.0),
  ('Faucet — Kitchen',                     'Single-lever with pull-down',              'Plumbing', 'Fixtures',       249.00, 'each',   ARRAY['faucet','kitchen'],      1, 1.5),
  ('Faucet — Bathroom',                    'Single-hole widespread',                   'Plumbing', 'Fixtures',       179.00, 'each',   ARRAY['faucet','bathroom'],     1, 1.0),
  ('Garbage Disposal',                     '3/4 HP continuous feed',                   'Plumbing', 'Fixtures',       229.00, 'each',   ARRAY['disposal'],              1, 1.5),
  -- Plumbing — Repairs
  ('Main Water Shutoff Valve',             'Full-port ball valve replacement',         'Plumbing', 'Repair',         189.00, 'each',   ARRAY['shutoff','valve'],       1, 1.5),
  ('Drain Cleaning — Sink',                'Snake and clean',                          'Plumbing', 'Repair',         149.00, 'each',   ARRAY['drain','clean'],         1, 1.0),
  ('Drain Cleaning — Main Line',           'Auger clean-out, up to 100 ft',            'Plumbing', 'Repair',         349.00, 'each',   ARRAY['drain','main'],          1, 2.5),
  ('Hydro Jetting',                        'High-pressure sewer line cleaning',        'Plumbing', 'Repair',         549.00, 'each',   ARRAY['hydro-jet','sewer'],     1, 3.0),
  ('Pipe Leak Repair — Copper',            'Per joint',                                'Plumbing', 'Repair',         149.00, 'each',   ARRAY['leak','copper'],         1, 1.0),
  -- Labor & Trip
  ('Standard Labor',                        'Hourly technician rate',                   'Labor', 'General',           125.00, 'hour',   ARRAY['labor'],                 1, 1.0),
  ('Emergency Labor',                       'After-hours or weekend rate',              'Labor', 'General',           195.00, 'hour',   ARRAY['labor','emergency'],     1, 1.0),
  ('Trip Fee',                              'Diagnostic visit',                         'Labor', 'General',            89.00, 'each',   ARRAY['trip','fee'],            1, 0.5),
  ('Permit Fee',                            'City building permit pass-through',        'Labor', 'General',           150.00, 'each',   ARRAY['permit'],                1, 0.0),
  -- Warranties & Plans
  ('1-Year Labor Warranty',                'Extended labor coverage',                  'Warranty', 'Extended',        149.00, 'each',   ARRAY['warranty'],              1, 0.0),
  ('Maintenance Plan — Annual',            '2 visits per year',                        'Warranty', 'Plan',            299.00, 'year',   ARRAY['maintenance','plan'],    1, 0.0),
  ('Whole-Home Surge Protector',           'Panel-mounted with 5-yr warranty',         'Electrical', 'Panel',          349.00, 'each',   ARRAY['surge','electrical'],    1, 1.5),
  ('Recessed LED Light — 6-inch',          'Dimmable, 3000K',                          'Electrical', 'Lighting',        59.00, 'each',   ARRAY['led','light'],           4, 0.5)
) AS t(name, description, category, subcategory, base_price, unit, tags, typical_quantity, labor_hours);

-- ----------------------------------------------------------------------------
-- 5. Customers (20)
-- ----------------------------------------------------------------------------

WITH new_customers AS (
  INSERT INTO public.customers (company_id, name, email, phone) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'John Smith',      'john.smith@example.com',   '+1-555-1001'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Maria Garcia',    'mgarcia@example.com',       '+1-555-1002'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'David Chen',      'dchen@example.com',         '+1-555-1003'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Sarah Johnson',   'sjohnson@example.com',      '+1-555-1004'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Michael Brown',   'mbrown@example.com',        '+1-555-1005'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Jennifer Wilson', 'jwilson@example.com',       '+1-555-1006'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Robert Davis',    'rdavis@example.com',        '+1-555-1007'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Emily Rodriguez', 'erodriguez@example.com',    '+1-555-1008'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'James Martinez',  'jmartinez@example.com',     '+1-555-1009'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Linda Anderson',  'landerson@example.com',     '+1-555-1010'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'William Taylor',  'wtaylor@example.com',       '+1-555-1011'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Patricia Thomas', 'pthomas@example.com',       '+1-555-1012'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Charles Moore',   'cmoore@example.com',        '+1-555-1013'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Barbara Jackson', 'bjackson@example.com',      '+1-555-1014'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Joseph White',    'jwhite@example.com',        '+1-555-1015'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Susan Harris',    'sharris@example.com',       '+1-555-1016'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Thomas Martin',   'tmartin@example.com',       '+1-555-1017'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Nancy Thompson',  'nthompson@example.com',     '+1-555-1018'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Christopher Lee', 'clee@example.com',          '+1-555-1019'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Karen Walker',    'kwalker@example.com',       '+1-555-1020')
  RETURNING id, phone
)
INSERT INTO public.customer_addresses (customer_id, address, city, state, zip, is_primary)
SELECT
  c.id,
  '10' || substr(c.phone, length(c.phone)-3, 4) || ' Market St',
  'San Francisco', 'CA', '94103', TRUE
FROM new_customers c;

-- ----------------------------------------------------------------------------
-- 6. Work items (15 across lifecycle) + quote_items for a few
-- ----------------------------------------------------------------------------

-- Helper: 3 leads, 5 quotes (various states), 4 jobs (various states), 3 archived
INSERT INTO public.work_items (
  company_id, customer_id, address_id, created_by, status, job_name, description,
  subtotal, tax_rate, tax_amount, total,
  scheduled_start, scheduled_end, sent_at, accepted_at, completed_at,
  quote_number
)
SELECT
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  c.id,
  (SELECT id FROM public.customer_addresses WHERE customer_id = c.id LIMIT 1),
  '22222222-2222-2222-2222-222222222222',
  d.status::public.work_item_status,
  d.job_name,
  d.description,
  d.subtotal,
  8.625,
  round((d.subtotal * 0.08625)::numeric, 2),
  round((d.subtotal * 1.08625)::numeric, 2),
  d.scheduled_start,
  d.scheduled_end,
  d.sent_at,
  d.accepted_at,
  d.completed_at,
  d.quote_number
FROM (VALUES
  ('John Smith',      'lead',              'Kitchen faucet leak',       'Says it drips overnight, needs urgent look',  0.0,     NULL::timestamptz, NULL::timestamptz, NULL::timestamptz, NULL::timestamptz, NULL::timestamptz, NULL::text),
  ('Maria Garcia',    'lead',              'New water heater',          'Tank is 15 years old, considering tankless',  0.0,     NULL, NULL, NULL, NULL, NULL, NULL),
  ('David Chen',      'lead',              'Furnace not heating',       'Called about a stuck igniter',                 0.0,     NULL, NULL, NULL, NULL, NULL, NULL),
  ('Sarah Johnson',   'quote_draft',       'AC replacement estimate',    '3-ton carrier + labor + permits',              4200.0, NULL, NULL, NULL, NULL, NULL, 'Q-1001'),
  ('Michael Brown',   'quote_sent',        'Tankless water heater',      'Rinnai + relocation',                          5100.0, NULL, NULL, NOW() - INTERVAL '2 days', NULL, NULL, 'Q-1002'),
  ('Jennifer Wilson', 'quote_viewed',      'Duct cleaning + UV',        'Whole home cleaning w/ UV',                     1450.0, NULL, NULL, NOW() - INTERVAL '5 days', NULL, NULL, 'Q-1003'),
  ('Robert Davis',    'quote_accepted',    'AC tune-up + refrigerant',   'Tune-up plus 3 lbs recharge',                    535.0, NULL, NULL, NOW() - INTERVAL '10 days', NOW() - INTERVAL '8 days', NULL, 'Q-1004'),
  ('Emily Rodriguez', 'quote_rejected',    'Furnace upgrade',            'Rejected on pricing',                          3200.0, NULL, NULL, NOW() - INTERVAL '12 days', NULL, NULL, 'Q-1005'),
  ('James Martinez',  'job_scheduled',     'Water heater 50gal gas',    'Scheduled Thu 9am',                            1450.0, NOW() + INTERVAL '2 days', NOW() + INTERVAL '2 days 4 hours', NOW() - INTERVAL '20 days', NOW() - INTERVAL '15 days', NULL, 'Q-1006'),
  ('Linda Anderson',  'job_in_progress',   'Furnace + smart thermostat', 'On-site today',                                3000.0, NOW() - INTERVAL '3 hours', NOW() + INTERVAL '2 hours', NOW() - INTERVAL '25 days', NOW() - INTERVAL '20 days', NULL, 'Q-1007'),
  ('William Taylor',  'job_completed',     'Kitchen faucet replacement',  'Completed 2 weeks ago',                         425.0, NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days' + INTERVAL '1.5 hours', NOW() - INTERVAL '30 days', NOW() - INTERVAL '25 days', NOW() - INTERVAL '14 days', 'Q-1008'),
  ('Patricia Thomas', 'job_completed',     'Duct sealing',               'Aeroseal complete',                            1850.0, NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days' + INTERVAL '4 hours', NOW() - INTERVAL '40 days', NOW() - INTERVAL '30 days', NOW() - INTERVAL '20 days', 'Q-1009'),
  ('Charles Moore',   'archived',          'Bathroom remodel',           'Went with another contractor',                 6500.0, NULL, NULL, NOW() - INTERVAL '45 days', NULL, NULL, 'Q-1010'),
  ('Barbara Jackson', 'archived',          'HVAC quote',                 'No response after 30 days',                    3400.0, NULL, NULL, NOW() - INTERVAL '60 days', NULL, NULL, 'Q-1011'),
  ('Joseph White',    'quote_accepted',    'AC + heat pump',             'Waiting to schedule',                          6800.0, NULL, NULL, NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day', NULL, 'Q-1012')
) AS d(customer_name, status, job_name, description, subtotal, scheduled_start, scheduled_end, sent_at, accepted_at, completed_at, quote_number)
JOIN public.customers c
  ON c.company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' AND c.name = d.customer_name;

-- Assign completed & in-progress jobs to the technician
UPDATE public.work_items
   SET assigned_to = '33333333-3333-3333-3333-333333333333'
 WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
   AND status IN ('job_scheduled','job_in_progress','job_completed');

-- Quote items for a few
INSERT INTO public.quote_items (work_item_id, name, description, quantity, unit_price, sort_order)
SELECT w.id, i.name, i.description, i.quantity, i.unit_price, i.sort_order
FROM public.work_items w
CROSS JOIN LATERAL (
  VALUES
    ('AC Condenser 3-Ton Carrier',  'Carrier 16 SEER',    1, 2450.00, 0),
    ('Standard Labor',              'Installation labor', 6, 125.00,  1),
    ('Permit Fee',                  'City permit',        1, 150.00,  2),
    ('Refrigerant Recharge',        '3 lbs R-410A',       3, 85.00,   3)
) AS i(name, description, quantity, unit_price, sort_order)
WHERE w.quote_number = 'Q-1001';

INSERT INTO public.quote_items (work_item_id, name, description, quantity, unit_price, sort_order)
SELECT w.id, i.name, i.description, i.quantity, i.unit_price, i.sort_order
FROM public.work_items w
CROSS JOIN LATERAL (
  VALUES
    ('Water Heater — 50gal Gas', 'Standard atmospheric vent', 1, 1250.00, 0),
    ('Standard Labor',           'Installation labor',        3, 125.00,  1),
    ('Expansion Tank',           '2-gallon inline',           1, 89.00,   2)
) AS i(name, description, quantity, unit_price, sort_order)
WHERE w.quote_number = 'Q-1006';

INSERT INTO public.quote_items (work_item_id, name, description, quantity, unit_price, is_upsell, sort_order)
SELECT w.id, i.name, i.description, i.quantity, i.unit_price, i.is_upsell, i.sort_order
FROM public.work_items w
CROSS JOIN LATERAL (
  VALUES
    ('96% AFUE Gas Furnace 80k BTU', 'High-eff modulating',    1, 2650.00, FALSE, 0),
    ('Standard Labor',               'Installation labor',     4, 125.00,  FALSE, 1),
    ('Thermostat — Ecobee Smart',    'Wi-Fi enabled',          1, 299.00,  TRUE,  2)
) AS i(name, description, quantity, unit_price, is_upsell, sort_order)
WHERE w.quote_number = 'Q-1007';

-- ----------------------------------------------------------------------------
-- 7. Invoices for completed jobs
-- ----------------------------------------------------------------------------

INSERT INTO public.invoices (company_id, work_item_id, customer_id, invoice_number, subtotal, tax_amount, total, status, due_date, sent_at, paid_at, payment_method)
SELECT
  w.company_id,
  w.id,
  w.customer_id,
  'INV-' || substring(w.quote_number FROM 3),
  w.subtotal,
  w.tax_amount,
  w.total,
  CASE WHEN w.quote_number = 'Q-1008' THEN 'paid'::public.invoice_status
       WHEN w.quote_number = 'Q-1009' THEN 'sent'::public.invoice_status
       ELSE 'draft'::public.invoice_status
  END,
  (NOW() + INTERVAL '14 days')::date,
  CASE WHEN w.quote_number IN ('Q-1008','Q-1009') THEN NOW() - INTERVAL '10 days' END,
  CASE WHEN w.quote_number = 'Q-1008' THEN NOW() - INTERVAL '2 days' END,
  CASE WHEN w.quote_number = 'Q-1008' THEN 'card'::public.payment_method END
FROM public.work_items w
WHERE w.company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  AND w.status = 'job_completed';

-- Update amount_paid for paid invoice
UPDATE public.invoices i
   SET amount_paid = i.total
 FROM public.work_items w
 WHERE i.work_item_id = w.id
   AND w.quote_number = 'Q-1008';

-- Payments for paid invoices
INSERT INTO public.payments (invoice_id, amount, method, reference_number, recorded_by, notes)
SELECT i.id, i.total, 'card', 'ch_demo_' || substring(i.invoice_number FROM 5), '22222222-2222-2222-2222-222222222222', 'Payment via Stripe test mode'
FROM public.invoices i WHERE i.status = 'paid';

-- ----------------------------------------------------------------------------
-- 8. Activity log samples
-- ----------------------------------------------------------------------------

INSERT INTO public.activity_log (company_id, user_id, entity_type, entity_id, action, description)
SELECT
  w.company_id,
  '22222222-2222-2222-2222-222222222222',
  'work_item',
  w.id,
  CASE
    WHEN w.status = 'quote_sent'     THEN 'sent'
    WHEN w.status = 'quote_accepted' THEN 'accepted'
    WHEN w.status = 'job_completed'  THEN 'completed'
    WHEN w.status = 'archived'       THEN 'archived'
    ELSE 'created'
  END,
  'Seeded activity for ' || w.job_name
FROM public.work_items w
WHERE w.company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

-- ----------------------------------------------------------------------------
-- 9. AI conversations sample (cost tracking demo)
-- ----------------------------------------------------------------------------

INSERT INTO public.ai_conversations (company_id, user_id, agent_name, model, purpose, tokens_input, tokens_output, cost_usd, latency_ms, entity_type, entity_id)
SELECT
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '22222222-2222-2222-2222-222222222222',
  'quote_builder',
  'gemini-2.0-flash',
  'quote_generation',
  1800, 620, 0.0092, 2400,
  'work_item',
  w.id
FROM public.work_items w
WHERE w.company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  AND w.quote_number IS NOT NULL
LIMIT 5;

COMMIT;

-- ============================================================================
-- Login credentials for local dev:
--   Owner:      owner@acme.demo   / demo1234
--   Office:     office@acme.demo  / demo1234
--   Technician: tech@acme.demo    / demo1234
-- ============================================================================
