-- Company branding assets (logos). Public on purpose: the logo must load
-- inside customers' email clients, which cannot present signed URLs, and a
-- logo is the one asset a business wants seen. 2MB cap, images only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('branding', 'branding', true, 2097152, array['image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;
