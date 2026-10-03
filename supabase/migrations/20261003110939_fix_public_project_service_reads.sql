-- Do not call the authenticated-only admin function from the anonymous SELECT path.
drop policy if exists "Public reads published project services" on public.project_services;

create policy "Anonymous users read published project services"
on public.project_services for select to anon
using (
  exists (
    select 1 from public.projects
    where projects.id = project_services.project_id
      and projects.is_published
  )
);

create policy "Authenticated users read permitted project services"
on public.project_services for select to authenticated
using (
  exists (
    select 1 from public.projects
    where projects.id = project_services.project_id
      and (projects.is_published or private.is_admin())
  )
);
