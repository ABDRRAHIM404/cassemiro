-- Run as postgres. All fixture writes and temporary claims roll back before return.
do $test$
declare
  admin_id uuid;
  services uuid[];
  fixture_id uuid;
  old_slug text;
  input jsonb := '{"title":"Atomic save fixture","slug":"codex-atomic-save-fixture-20261003","is_published":true}';
  completed boolean := false;
begin
  select id into admin_id from public.profiles where role = 'owner' limit 1;
  select array_agg(id order by id) into services from public.services where is_visible;
  if admin_id is null or cardinality(services) < 2 then
    raise exception 'Fixture requires an owner profile and two visible services';
  end if;
  if has_function_privilege('anon', 'public.save_project_with_services(uuid,jsonb,uuid[])', 'execute') then
    raise exception 'Anonymous callers must not execute project saves';
  end if;
  begin
    perform set_config('request.jwt.claim.sub', admin_id::text, true);
    perform set_config('request.jwt.claims', jsonb_build_object('sub', admin_id, 'role', 'authenticated')::text, true);
    perform set_config('role', 'authenticated', true);
    select saved_id into fixture_id from public.save_project_with_services(null, input, array[services[1], services[1]]);
    if (select is_published from public.projects where id = fixture_id)
       or (select count(*) from public.project_services where project_id = fixture_id) <> 1 then
      raise exception 'Create must remain a draft and deduplicate service links';
    end if;
    input := input || '{"title":"Saved atomically","is_published":false}';
    select previous_slug into old_slug from public.save_project_with_services(fixture_id, input, array[services[2]]);
    if old_slug is distinct from input->>'slug'
       or (select title from public.projects where id = fixture_id) is distinct from 'Saved atomically'
       or (select array_agg(service_id) from public.project_services where project_id = fixture_id) is distinct from array[services[2]] then
      raise exception 'Update must save the exact requested service set and fields';
    end if;
    begin
      perform public.save_project_with_services(fixture_id, input || '{"title":"Must roll back"}', array[gen_random_uuid()]);
      raise exception 'Invalid service unexpectedly succeeded';
    exception when foreign_key_violation then null;
    end;
    if (select title from public.projects where id = fixture_id) is distinct from 'Saved atomically'
       or (select array_agg(service_id) from public.project_services where project_id = fixture_id) is distinct from array[services[2]] then
      raise exception 'Failed update changed existing fields or services';
    end if;
    begin
      perform public.save_project_with_services(null, input || '{"slug":"codex-atomic-save-failed-20261003"}', array[gen_random_uuid()]);
      raise exception 'Invalid create unexpectedly succeeded';
    exception when foreign_key_violation then null;
    end;
    if exists(select 1 from public.projects where slug = 'codex-atomic-save-failed-20261003') then
      raise exception 'Failed create left a partial draft';
    end if;
    begin
      perform public.save_project_with_services(fixture_id, input || '{"is_published":true}', array[services[2]]);
      raise exception 'Undescribed publication unexpectedly succeeded';
    exception when check_violation then null;
    end;
    perform public.save_project_with_services(fixture_id, input, array[]::uuid[]);
    if exists(select 1 from public.project_services where project_id = fixture_id) then
      raise exception 'Empty selection must clear every service link';
    end if;
    perform set_config('request.jwt.claim.sub', gen_random_uuid()::text, true);
    begin
      perform public.save_project_with_services(fixture_id, input, array[]::uuid[]);
      raise exception 'Non-admin save unexpectedly succeeded';
    exception when insufficient_privilege then null;
    end;
    completed := true;
    raise exception 'Rollback fixture' using errcode = 'ZX001';
  exception when sqlstate 'ZX001' then null;
  end;
  if not completed then raise exception 'Fixture did not complete'; end if;
  if exists(select 1 from public.projects where id = fixture_id) then
    raise exception 'Fixture cleanup failed';
  end if;
end $test$;
