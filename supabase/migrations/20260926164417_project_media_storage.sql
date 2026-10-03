insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'project-media',
  'project-media',
  true,
  52428800,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif',
    'video/mp4',
    'video/webm'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Public reads project media objects"
on storage.objects for select to anon, authenticated
using (bucket_id = 'project-media');

create policy "Admins upload project media objects"
on storage.objects for insert to authenticated
with check (bucket_id = 'project-media' and private.is_admin());

create policy "Admins update project media objects"
on storage.objects for update to authenticated
using (bucket_id = 'project-media' and private.is_admin())
with check (bucket_id = 'project-media' and private.is_admin());

create policy "Admins delete project media objects"
on storage.objects for delete to authenticated
using (bucket_id = 'project-media' and private.is_admin());
