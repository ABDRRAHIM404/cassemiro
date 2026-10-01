-- The quote endpoint calls this only with the server-side service key.
create table private.quote_rate_limits (
  key_hash text primary key check (key_hash ~ '^[0-9a-f]{64}$'),
  attempts integer not null check (attempts > 0),
  window_ends_at timestamptz not null
);

create index quote_rate_limits_expiry_idx on private.quote_rate_limits (window_ends_at);
alter table private.quote_rate_limits enable row level security;
revoke all on private.quote_rate_limits from public, anon, authenticated;
grant usage on schema private to service_role;
grant select, insert, update, delete on private.quote_rate_limits to service_role;

create function public.consume_quote_rate_limit(
  p_key_hash text,
  p_max_attempts integer default 5,
  p_window_seconds integer default 900
)
returns boolean
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_now timestamptz := now();
  v_attempts integer;
begin
  if p_key_hash !~ '^[0-9a-f]{64}$'
     or p_max_attempts not between 1 and 100
     or p_window_seconds not between 60 and 86400 then
    raise exception 'Invalid rate-limit parameters';
  end if;

  -- Opportunistic cleanup avoids retaining client fingerprints indefinitely.
  delete from private.quote_rate_limits
  where key_hash in (
    select key_hash from private.quote_rate_limits
    where window_ends_at < v_now - interval '1 day'
    order by window_ends_at
    limit 50
  );

  insert into private.quote_rate_limits as current_window (key_hash, attempts, window_ends_at)
  values (p_key_hash, 1, v_now + make_interval(secs => p_window_seconds))
  on conflict (key_hash) do update
  set attempts = case
        when current_window.window_ends_at <= v_now then 1
        else current_window.attempts + 1
      end,
      window_ends_at = case
        when current_window.window_ends_at <= v_now then v_now + make_interval(secs => p_window_seconds)
        else current_window.window_ends_at
      end
  where current_window.window_ends_at <= v_now or current_window.attempts < p_max_attempts
  returning attempts into v_attempts;

  return v_attempts is not null;
end;
$$;

revoke all on function public.consume_quote_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_quote_rate_limit(text, integer, integer) to service_role;
