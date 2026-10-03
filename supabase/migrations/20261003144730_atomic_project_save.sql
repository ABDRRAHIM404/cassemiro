-- Save form fields and service associations in one transaction, using the caller's RLS.
create function public.save_project_with_services(
  p_project_id uuid,
  p_project jsonb,
  p_service_ids uuid[]
)
returns table (saved_id uuid, previous_slug text)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  details public.projects%rowtype;
  was_published boolean;
begin
  if not coalesce(private.is_admin(), false) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if p_project is null or jsonb_typeof(p_project) <> 'object'
     or p_service_ids is null or cardinality(p_service_ids) > 30
     or array_position(p_service_ids, null) is not null then
    raise exception 'Invalid project input' using errcode = '22023';
  end if;
  details := jsonb_populate_record(null::public.projects, p_project);
  if details.title is null or char_length(btrim(details.title)) not between 2 and 120
     or details.slug is null or char_length(details.slug) not between 1 and 140
     or details.slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'Invalid project title or slug' using errcode = '22023';
  end if;

  if p_project_id is null then
    -- Media is uploaded afterward; a new project stays private until completion.
    insert into public.projects (
      title, slug, city, category, summary, content, duration,
      video_url, seo_title, seo_description, is_published
    ) values (
      details.title, details.slug, details.city, details.category,
      coalesce(details.summary, ''), coalesce(details.content, ''), details.duration,
      details.video_url, details.seo_title, details.seo_description, false
    ) returning id into saved_id;
  else
    -- Serialize simultaneous form saves for the same project, including its links.
    select p.slug, p.is_published into previous_slug, was_published
      from public.projects p where p.id = p_project_id for update;
    if not found then
      raise exception 'Project not found' using errcode = 'P0002';
    end if;
    if coalesce(details.is_published, false) and not was_published then
      if not exists (
        select 1 from public.project_media m
        where m.project_id = p_project_id and m.type <> 'video'
      ) or exists (
        select 1 from public.project_media m
        where m.project_id = p_project_id and m.type <> 'video'
          and char_length(btrim(m.alt_text)) < 5
      ) then
        raise exception 'Publication requires described project images' using errcode = '23514';
      end if;
    end if;
    update public.projects p set
      title = details.title, slug = details.slug, city = details.city,
      category = details.category, summary = coalesce(details.summary, ''),
      content = coalesce(details.content, ''), duration = details.duration,
      video_url = details.video_url, seo_title = details.seo_title,
      seo_description = details.seo_description,
      is_published = coalesce(details.is_published, false)
      where p.id = p_project_id;
    saved_id := p_project_id;
  end if;

  insert into public.project_services (project_id, service_id)
    select saved_id, requested.id
    from (select distinct unnest(p_service_ids) as id) requested
    on conflict (project_id, service_id) do nothing;
  delete from public.project_services ps
    where ps.project_id = saved_id and not (ps.service_id = any(p_service_ids));

  return next;
end;
$$;

revoke all on function public.save_project_with_services(uuid, jsonb, uuid[]) from public, anon, authenticated;
grant execute on function public.save_project_with_services(uuid, jsonb, uuid[]) to authenticated;
