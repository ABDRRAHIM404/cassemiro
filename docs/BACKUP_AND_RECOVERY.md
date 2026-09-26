# Backup and recovery

## Database

- Enable Supabase daily backups before launch.
- Export `quote_requests`, projects, services, testimonials, settings, and profiles before material schema changes.
- Test a database restore in a non-production project before relying on the procedure.
- Keep every migration in `supabase/migrations/` under version control.

## Media

- Keep original project uploads outside the production storage bucket as a second copy.
- The supplied hero PNG frames are the source files. WebP files are reproducible with `npm run media:hero`.
- Back up production storage before bulk deletion or path migration.

## Recovery order

1. Restore or recreate the Supabase project.
2. Apply migrations in filename order.
3. Restore database rows and storage objects.
4. Recreate server-only environment secrets in the hosting provider.
5. Deploy and verify authentication, quote submission, and media access.
