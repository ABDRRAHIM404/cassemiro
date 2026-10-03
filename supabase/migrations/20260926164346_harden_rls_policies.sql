create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role in ('owner', 'admin', 'editor')
  );
$$;

revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to authenticated;

drop policy if exists "Users read own profile" on public.profiles;
drop policy if exists "Admins manage profiles" on public.profiles;
drop policy if exists "Admins read quotes" on public.quote_requests;
drop policy if exists "Admins update quotes" on public.quote_requests;
drop policy if exists "Admins delete quotes" on public.quote_requests;
drop policy if exists "Public reads visible services" on public.services;
drop policy if exists "Admins manage services" on public.services;
drop policy if exists "Public reads published projects" on public.projects;
drop policy if exists "Admins manage projects" on public.projects;
drop policy if exists "Public reads published project media" on public.project_media;
drop policy if exists "Admins manage project media" on public.project_media;
drop policy if exists "Public reads approved testimonials" on public.testimonials;
drop policy if exists "Admins manage testimonials" on public.testimonials;
drop policy if exists "Public reads public settings" on public.site_settings;
drop policy if exists "Admins manage settings" on public.site_settings;

drop function if exists public.is_admin();
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

create policy "Authenticated users read permitted profiles"
on public.profiles for select to authenticated
using (id = (select auth.uid()) or private.is_admin());
create policy "Admins insert profiles"
on public.profiles for insert to authenticated
with check (private.is_admin());
create policy "Admins update profiles"
on public.profiles for update to authenticated
using (private.is_admin()) with check (private.is_admin());
create policy "Admins delete profiles"
on public.profiles for delete to authenticated
using (private.is_admin());

create policy "Admins read quotes"
on public.quote_requests for select to authenticated
using (private.is_admin());
create policy "Admins update quotes"
on public.quote_requests for update to authenticated
using (private.is_admin()) with check (private.is_admin());
create policy "Admins delete quotes"
on public.quote_requests for delete to authenticated
using (private.is_admin());

create policy "Anonymous users read visible services"
on public.services for select to anon
using (is_visible);
create policy "Authenticated users read permitted services"
on public.services for select to authenticated
using (is_visible or private.is_admin());
create policy "Admins insert services"
on public.services for insert to authenticated
with check (private.is_admin());
create policy "Admins update services"
on public.services for update to authenticated
using (private.is_admin()) with check (private.is_admin());
create policy "Admins delete services"
on public.services for delete to authenticated
using (private.is_admin());

create policy "Anonymous users read published projects"
on public.projects for select to anon
using (is_published);
create policy "Authenticated users read permitted projects"
on public.projects for select to authenticated
using (is_published or private.is_admin());
create policy "Admins insert projects"
on public.projects for insert to authenticated
with check (private.is_admin());
create policy "Admins update projects"
on public.projects for update to authenticated
using (private.is_admin()) with check (private.is_admin());
create policy "Admins delete projects"
on public.projects for delete to authenticated
using (private.is_admin());

create policy "Anonymous users read published project media"
on public.project_media for select to anon
using (exists (
  select 1 from public.projects
  where projects.id = project_media.project_id and projects.is_published
));
create policy "Authenticated users read permitted project media"
on public.project_media for select to authenticated
using (exists (
  select 1 from public.projects
  where projects.id = project_media.project_id and (projects.is_published or private.is_admin())
));
create policy "Admins insert project media"
on public.project_media for insert to authenticated
with check (private.is_admin());
create policy "Admins update project media"
on public.project_media for update to authenticated
using (private.is_admin()) with check (private.is_admin());
create policy "Admins delete project media"
on public.project_media for delete to authenticated
using (private.is_admin());

create policy "Anonymous users read approved testimonials"
on public.testimonials for select to anon
using (is_approved);
create policy "Authenticated users read permitted testimonials"
on public.testimonials for select to authenticated
using (is_approved or private.is_admin());
create policy "Admins insert testimonials"
on public.testimonials for insert to authenticated
with check (private.is_admin());
create policy "Admins update testimonials"
on public.testimonials for update to authenticated
using (private.is_admin()) with check (private.is_admin());
create policy "Admins delete testimonials"
on public.testimonials for delete to authenticated
using (private.is_admin());

create policy "Anonymous users read public settings"
on public.site_settings for select to anon
using (is_public);
create policy "Authenticated users read permitted settings"
on public.site_settings for select to authenticated
using (is_public or private.is_admin());
create policy "Admins insert settings"
on public.site_settings for insert to authenticated
with check (private.is_admin());
create policy "Admins update settings"
on public.site_settings for update to authenticated
using (private.is_admin()) with check (private.is_admin());
create policy "Admins delete settings"
on public.site_settings for delete to authenticated
using (private.is_admin());
