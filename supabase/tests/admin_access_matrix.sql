-- Run as postgres through the project-scoped SQL connection.
-- Independent synthetic identities; no passwords, emails, sessions or Storage writes.
-- Every fixture and JWT claim rolls back inside the caught subtransaction.
do $test$
declare
  actor uuid;
  spare uuid;
  fixture_project uuid;
  service_id uuid;
  media_id uuid;
  testimonial_id uuid;
  quote_id uuid;
  role_name text;
  fixture_key text := 'codex-access-matrix-' || gen_random_uuid()::text;
  affected integer;
  completed boolean := false;
begin
  begin
    foreach role_name in array array['owner', 'admin', 'editor'] loop
      actor := gen_random_uuid();
      spare := gen_random_uuid();
      insert into auth.users(id) values (actor), (spare);
      insert into public.profiles(id, display_name, role) values (actor, 'Rollback access fixture', role_name);
      insert into public.quote_requests(name,phone,city,work_type,description)
        values ('Rollback quote fixture','00000000000','Fixture city','Fixture work','Synthetic rollback-only request')
        returning id into quote_id;
      perform set_config('request.jwt.claim.sub', actor::text, true);
      perform set_config('request.jwt.claims', jsonb_build_object('sub',actor,'role','authenticated')::text, true);
      perform set_config('role', 'authenticated', true);
      if not private.is_admin() then raise exception '% must have full admin access', role_name; end if;

      insert into public.profiles(id,display_name,role) values (spare,'Synthetic managed profile','editor');
      update public.profiles set role='admin' where id=spare;
      get diagnostics affected = row_count;
      if affected <> 1 then raise exception '% cannot manage profiles',role_name; end if;
      delete from public.profiles where id=spare;
      get diagnostics affected = row_count;
      if affected <> 1 then raise exception '% cannot delete profiles',role_name; end if;

      insert into public.services(slug,title,is_visible) values (fixture_key || '-' || role_name,'Synthetic service',false)
        returning id into service_id;
      select saved_id into fixture_project from public.save_project_with_services(null,
        jsonb_build_object('slug',fixture_key || '-' || role_name,'title','Synthetic project','is_published',false),array[service_id]);
      insert into public.project_media(project_id,type,url,alt_text)
        values (fixture_project,'image','https://example.invalid/fixture.webp','Synthetic illustration; no uploaded file')
        returning id into media_id;
      update public.project_media set sort_order=1 where id=media_id;
      get diagnostics affected = row_count;
      if affected <> 1 then raise exception '% cannot edit media',role_name; end if;
      perform public.save_project_with_services(fixture_project,
        jsonb_build_object('slug',fixture_key || '-' || role_name,'title','Edited synthetic project','is_published',true),array[service_id]);
      if not exists(select 1 from public.projects where id=fixture_project and is_published) then
        raise exception '% cannot publish projects',role_name;
      end if;

      insert into public.testimonials(customer_name,text,is_approved,permission_attested_at)
        values ('Synthetic fixture','Rollback-only text',false,now()) returning id into testimonial_id;
      update public.testimonials set text='Edited rollback-only text' where id=testimonial_id;
      get diagnostics affected = row_count;
      if affected <> 1 then raise exception '% cannot edit testimonials',role_name; end if;
      insert into public.site_settings(key,value,is_public) values (fixture_key,'"synthetic"',false);
      update public.site_settings set value='"edited"' where key=fixture_key;
      get diagnostics affected = row_count;
      if affected <> 1 then raise exception '% cannot manage private settings',role_name; end if;
      update public.quote_requests set status='Em contato',last_contact_at=now() where id=quote_id;
      get diagnostics affected = row_count;
      if affected <> 1 then raise exception '% cannot manage quotes',role_name; end if;

      -- Profile revocation must take effect without relying on refreshed JWT claims.
      perform set_config('role','postgres',true);
      delete from public.profiles where id=actor;
      perform set_config('role','authenticated',true);
      if private.is_admin() then raise exception 'Revoked % retains admin access',role_name; end if;
      if exists(select 1 from public.quote_requests where id=quote_id)
         or exists(select 1 from public.site_settings where key=fixture_key) then
        raise exception 'Revoked % can read private records',role_name;
      end if;
      update public.projects set title='Forbidden change' where id=fixture_project;
      get diagnostics affected = row_count;
      if affected <> 0 then raise exception 'Revoked % can edit projects',role_name; end if;
      begin
        perform public.save_project_with_services(fixture_project,'{}',array[]::uuid[]);
        raise exception 'Revoked % can invoke project save',role_name;
      exception when insufficient_privilege then null;
      end;
      perform set_config('role','postgres',true);
      insert into public.profiles(id,display_name,role) values(actor,'Restored synthetic profile',role_name);
      perform set_config('role','authenticated',true);
      delete from public.quote_requests where id=quote_id;
      get diagnostics affected = row_count;
      if affected <> 1 then raise exception '% cannot delete quotes',role_name; end if;
      delete from public.site_settings where key=fixture_key;
      get diagnostics affected = row_count;
      if affected <> 1 then raise exception '% cannot delete settings',role_name; end if;
      delete from public.testimonials where id=testimonial_id;
      get diagnostics affected = row_count;
      if affected <> 1 then raise exception '% cannot delete testimonials',role_name; end if;
      delete from public.project_media where id=media_id;
      get diagnostics affected = row_count;
      if affected <> 1 then raise exception '% cannot delete media',role_name; end if;
      delete from public.projects where id=fixture_project;
      get diagnostics affected = row_count;
      if affected <> 1 then raise exception '% cannot delete projects',role_name; end if;
      if exists(select 1 from public.project_services where project_id=fixture_project) then
        raise exception 'Project deletion must remove service links';
      end if;
      delete from public.services where id=service_id;
      get diagnostics affected = row_count;
      if affected <> 1 then raise exception '% cannot delete services',role_name; end if;
      perform set_config('role','postgres',true);
    end loop;

    -- User-editable JWT metadata is never authority for an unprofiled identity.
    perform set_config('request.jwt.claim.sub',spare::text,true);
    perform set_config('request.jwt.claims',jsonb_build_object('sub',spare,'role','authenticated','user_metadata',jsonb_build_object('role','owner'))::text,true);
    perform set_config('role','authenticated',true);
    if private.is_admin() then raise exception 'User metadata granted administrative access'; end if;
    begin
      insert into public.profiles(id,display_name,role) values(spare,'Forbidden self promotion','owner');
      raise exception 'Unprofiled identity can promote itself';
    exception when insufficient_privilege then null;
    end;
    if has_function_privilege('anon','public.save_project_with_services(uuid,jsonb,uuid[])','execute')
       or has_function_privilege('authenticated','public.consume_quote_rate_limit(text,integer,integer)','execute')
       or has_function_privilege('anon','public.consume_quote_rate_limit(text,integer,integer)','execute') then
      raise exception 'Privileged RPC grants are too broad';
    end if;
    completed := true;
    raise exception 'Rollback all access fixtures' using errcode='ZX001';
  exception when sqlstate 'ZX001' then null;
  end;
  if not completed then raise exception 'Access matrix did not complete'; end if;
  if exists(select 1 from auth.users where id in (actor,spare))
     or exists(select 1 from public.projects where slug like fixture_key || '%')
     or exists(select 1 from public.site_settings where key=fixture_key) then
    raise exception 'Fixture rollback failed';
  end if;
end $test$;
