-- Keep a contact's details for twelve months after the last recorded contact.
-- Existing requests start from their submission time; an administrator can record
-- a later real contact in the dashboard before the first scheduled cleanup.
alter table public.quote_requests
  add column last_contact_at timestamptz,
  add column anonymized_at timestamptz;

update public.quote_requests
set last_contact_at = created_at
where last_contact_at is null;

alter table public.quote_requests
  alter column last_contact_at set default now(),
  alter column last_contact_at set not null;

create index quote_requests_active_last_contact_idx
  on public.quote_requests (last_contact_at)
  where anonymized_at is null;

-- Retain only the submission month, fixed service category and workflow status
-- for historical counts. Every free-text/contact/tracking field is cleared.
create function private.anonymize_expired_quote_requests()
returns integer
language plpgsql
set search_path = ''
as $$
declare
  changed integer;
begin
  update public.quote_requests
  set name = 'Anonimizado',
      phone = '00000000',
      city = 'Não informado',
      work_type = case
        when work_type in (
          'Construção residencial', 'Reforma', 'Construção comercial',
          'Instalações', 'Acabamentos', 'Outro serviço'
        ) then work_type
        else 'Outro serviço'
      end,
      description = 'Dados pessoais removidos após o prazo de retenção.',
      desired_start_date = null,
      source = 'anonymized',
      utm_source = null,
      utm_medium = null,
      utm_campaign = null,
      created_at = date_trunc('month', created_at at time zone 'UTC') at time zone 'UTC',
      last_contact_at = date_trunc('month', created_at at time zone 'UTC') at time zone 'UTC',
      anonymized_at = now()
  where anonymized_at is null
    and last_contact_at < now() - interval '12 months';

  get diagnostics changed = row_count;
  return changed;
end;
$$;

revoke all on function private.anonymize_expired_quote_requests()
  from public, anon, authenticated;

-- Supabase Cron runs this as the migration owner, not through the Data API.
create extension if not exists pg_cron with schema extensions;
select cron.schedule(
  'cassemiro-anonymize-expired-quotes',
  '17 3 * * *',
  'select private.anonymize_expired_quote_requests()'
);
