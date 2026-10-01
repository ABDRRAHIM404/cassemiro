-- New uploads stay private; a server route grants short-lived access only to
-- published projects or authenticated admins. Existing public URLs keep working
-- until they are inventoried and migrated separately.
alter table public.project_media add column storage_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-media-private',
  'project-media-private',
  false,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'video/mp4', 'video/webm']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Admins read private project media"
on storage.objects for select to authenticated
using (bucket_id = 'project-media-private' and private.is_admin());

create policy "Admins upload private project media"
on storage.objects for insert to authenticated
with check (bucket_id = 'project-media-private' and private.is_admin());

create policy "Admins update private project media"
on storage.objects for update to authenticated
using (bucket_id = 'project-media-private' and private.is_admin())
with check (bucket_id = 'project-media-private' and private.is_admin());

create policy "Admins delete private project media"
on storage.objects for delete to authenticated
using (bucket_id = 'project-media-private' and private.is_admin());
