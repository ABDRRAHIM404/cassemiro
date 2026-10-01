-- Legacy testimonials remain unchanged. New publication actions record when an
-- administrator explicitly attests that the quoted customer permitted use.
alter table public.testimonials
  add column if not exists permission_attested_at timestamptz;

comment on column public.testimonials.permission_attested_at is
  'Time an administrator confirmed permission to publish the testimonial; not independent proof of consent.';
