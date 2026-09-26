create table public.project_services (
  project_id uuid not null references public.projects(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  primary key (project_id, service_id)
);

create index project_services_service_idx on public.project_services(service_id);

alter table public.project_services enable row level security;

create policy "Public reads published project services"
on public.project_services for select to anon, authenticated
using (
  exists (
    select 1 from public.projects
    where projects.id = project_services.project_id
      and (projects.is_published or private.is_admin())
  )
);

create policy "Admins insert project services"
on public.project_services for insert to authenticated
with check (private.is_admin());

create policy "Admins update project services"
on public.project_services for update to authenticated
using (private.is_admin()) with check (private.is_admin());

create policy "Admins delete project services"
on public.project_services for delete to authenticated
using (private.is_admin());

grant select on public.project_services to anon;
grant select, insert, update, delete on public.project_services to authenticated;
