-- The historical objects have been copied and verified in the private bucket.
-- Keep the empty legacy bucket admin-readable for safe project cleanup only.
update storage.buckets
set public = false
where id = 'project-media';

drop policy if exists "Public reads project media objects" on storage.objects;

create policy "Admins read legacy project media objects"
on storage.objects for select to authenticated
using (bucket_id = 'project-media' and private.is_admin());
