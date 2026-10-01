# Media guide

## Hero frames

The unchanged supplied sequence lives at `public/media/hero/frames/` and contains 190 PNG files named `frame_001.png` through `frame_190.png`.

Optimized delivery files live in `public/media/hero/frames-webp/`. Run `npm run media:hero` to regenerate all WebP derivatives at quality 80. The generated sequence is approximately 15 MB instead of 270 MB, while the PNG sources remain untouched.

Frame order is configured in `src/config/hero.ts`. Do not rename, regenerate, reorder, or edit the supplied source frames without explicit approval. Desktop uses the WebP sequence for scroll scrub and preloads only the current neighboring frames. Coarse-pointer/mobile devices and reduced-motion visitors receive the first WebP frame as a static poster.

## Reference images

- `public/images/references/sergio-portrait-original.jpg` is the unchanged portrait source. Do not edit it without approval.
- `public/images/references/brand-board-reference.png` is visual direction only. It is not production logo artwork.

Never add stock or AI houses as completed CASSEMIRO projects. All project media needs truthful metadata and useful alternative text.

## Project uploads

New project media is uploaded through `/admin/projetos` to the private `project-media-private` Supabase Storage bucket. The `/api/project-media/[id]` route checks publication (or an admin session for drafts) before issuing a 60-second signed URL. Older published images in the public `project-media` bucket remain available until the controlled backfill below is completed. Supported formats are JPG, PNG, WebP, AVIF, MP4 and WebM, with a 50 MB limit per file.

Use a concise alternative description for every meaningful image. Before/after photos must share the same comparison-group name so the public project page pairs them correctly. Deleting a project through the admin also deletes the files in its storage folder.

## Private-media rollout

Do not deploy the application code before applying `quote_rate_limit` and `private_project_media` migrations to the target database: uploads and quote requests fail closed without them. Test the complete rollout in staging before production.

1. Apply both migrations through the normal Supabase migration workflow. Verify the new bucket is **private** and the rate-limit RPC is callable only with the server-side service key.
2. Deploy the application code. Confirm an admin can upload a draft photo and view it in the editor, while an anonymous request to its `/api/project-media/<id>` URL returns 404.
3. Publish the draft and confirm the same URL becomes available; unpublish it and confirm anonymous requests are denied again. A previously issued signed URL can remain usable for up to 60 seconds.
4. Run `node scripts/migrate-project-media-to-private.mjs` for a read-only count. After reviewing the exact target and backups, run it with `--apply --project-ref=<verified-project-ref>`; it copies each legacy object to the private bucket and updates its database URLs while retaining the old public copy. The script is resumable after a partial failure.
5. Verify every published image, admin thumbnail and social preview. Prerendered pages may need a fresh deployment to pick up the new media URLs. Then rerun with `--apply --prune-public --project-ref=<verified-project-ref>` to remove the old public copies. Check old public URLs and CDN behavior.
6. Once the legacy bucket is empty, apply `lock_down_legacy_project_media` to make it private and replace its public-read policy with an admin-only policy. Keep the bucket for safe cleanup of any older project records; do not remove it until no legacy links remain.
