# CASSEMIRO website

Production website and lightweight business system for **CASSEMIRO — Construção & Reformas**.

The public interface is in Brazilian Portuguese. Code, filenames, schema identifiers, and technical documentation are in English. The source of truth for business facts and scope is `CASSEMIRO_Codex_Work_Master_Plan.md`.

## Implemented system

The first public-experience milestone contains:

- responsive cinematic homepage;
- real 190-frame construction hero sequence, delivered as optimized WebP with mobile/static and reduced-motion fallbacks;
- interactive perspective service catalog;
- pinned construction-process scene;
- stacked values scene;
- Sérgio story using the unchanged source portrait;
- contact page with a validated WhatsApp handoff;
- metadata, LocalBusiness structured data, sitemap, robots, privacy, and 404 routes.
- connected Supabase project with versioned migrations;
- seven application tables with hardened row-level security;
- project-media storage bucket with public reads and admin-only writes;
- verified service and business-setting seed data;
- generated database TypeScript types;
- server-side quote endpoint with validation, rate limiting, database-first persistence, and independent email notification.
- Supabase SSR authentication and protected admin routes;
- admin overview with live metrics and recent leads;
- quote management with search, status filtering, contact actions, detail view, and status updates.

The admin now includes quote management, projects and media, services and pricing visibility, testimonial approval, homepage content and business settings. Public project and testimonial sections stay hidden until real approved content exists.

## Remaining configuration

Add the Supabase server secret and Resend values to the deployment environment. MCP intentionally exposes only publishable project keys, so server secrets must be copied through Supabase/Vercel secret settings rather than committed to the repository.

Privacy-safe Vercel Web Analytics excludes admin/auth routes and never receives lead PII. Conditional Sentry monitoring is present and activates only when DSN variables are configured.
