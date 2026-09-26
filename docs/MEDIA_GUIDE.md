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

Project media is uploaded through `/admin/projetos` to the public `project-media` Supabase Storage bucket. Supported formats are JPG, PNG, WebP, AVIF, MP4 and WebM, with a 50 MB limit per file.

Use a concise alternative description for every meaningful image. Before/after photos must share the same comparison-group name so the public project page pairs them correctly. Deleting a project through the admin also deletes the files in its storage folder.
