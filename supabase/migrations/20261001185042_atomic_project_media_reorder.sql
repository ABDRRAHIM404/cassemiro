create function public.swap_project_media_order(p_project_id uuid, p_media_id uuid, p_direction integer)
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
  if p_project_id is null or p_media_id is null
     or p_direction is null or p_direction not in (-1, 1) then
    raise exception 'Invalid project media or direction' using errcode = '22023';
  end if;

  -- Keep every swap within one project and lock rows in a stable order.
  perform 1 from public.project_media
    where project_id = p_project_id order by id for update;
  select array_agg(id order by sort_order, created_at, id)
    into ordered_ids from public.project_media where project_id = p_project_id;
  current_index := array_position(ordered_ids, p_media_id);
  if current_index is null
     or current_index + p_direction < 1
     or current_index + p_direction > coalesce(array_length(ordered_ids, 1), 0) then
    return false;
  end if;

  neighbor_id := ordered_ids[current_index + p_direction];
  select sort_order into current_order from public.project_media where id = p_media_id;
  select sort_order into neighbor_order from public.project_media where id = neighbor_id;
  update public.project_media
    set sort_order = case when id = p_media_id then neighbor_order else current_order end
    where project_id = p_project_id and id in (p_media_id, neighbor_id);
  get diagnostics updated_rows = row_count;
  if updated_rows <> 2 then
    raise exception 'Project media order was not updated' using errcode = 'P0001';
  end if;
  return true;
end;
$$;

revoke all on function public.swap_project_media_order(uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.swap_project_media_order(uuid, uuid, integer) to authenticated;
