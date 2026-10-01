create function public.swap_service_order(p_service_id uuid, p_direction integer)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  ordered_ids uuid[];
  current_index integer;
  neighbor_id uuid;
  current_order integer;
  neighbor_order integer;
  updated_rows integer;
begin
  if not private.is_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if p_service_id is null or p_direction is null or p_direction not in (-1, 1) then
    raise exception 'Invalid service or direction' using errcode = '22023';
  end if;

  -- Lock in a stable order so concurrent reorders cannot interleave.
  perform 1 from public.services order by id for update;
  select array_agg(id order by sort_order, title, id)
    into ordered_ids from public.services;
  current_index := array_position(ordered_ids, p_service_id);
  if current_index is null
     or current_index + p_direction < 1
     or current_index + p_direction > coalesce(array_length(ordered_ids, 1), 0) then
    return false;
  end if;

  neighbor_id := ordered_ids[current_index + p_direction];
  select sort_order into current_order from public.services where id = p_service_id;
  select sort_order into neighbor_order from public.services where id = neighbor_id;
  update public.services
    set sort_order = case when id = p_service_id then neighbor_order else current_order end
    where id in (p_service_id, neighbor_id);
  get diagnostics updated_rows = row_count;
  if updated_rows <> 2 then
    raise exception 'Service order was not updated' using errcode = 'P0001';
  end if;
  return true;
end;
$$;

revoke all on function public.swap_service_order(uuid, integer) from public, anon, authenticated;
grant execute on function public.swap_service_order(uuid, integer) to authenticated;
