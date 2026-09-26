# Deployment

## Recommended platform

Deploy the Next.js application to Vercel and keep Supabase as the database, authentication and media service.

1. Import the Git repository into Vercel.
2. Select the Next.js framework preset and Node.js 22.
3. Copy every required value from `.env.example` into the Production environment. Never expose `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY` or `SENTRY_AUTH_TOKEN` as public variables.
4. Set `NEXT_PUBLIC_SITE_URL` to the final HTTPS origin without a trailing slash.
5. Add the production origin and `/auth/callback` URL to the Supabase Auth redirect allow list.
6. Verify the sending domain in Resend and set `RESEND_FROM_EMAIL`.
7. Enable Web Analytics in the Vercel project dashboard.
8. Optionally create a Sentry Next.js project and provide its DSN plus source-map credentials.
9. Deploy, then run the launch checklist below.

## Launch checklist

- `/`, `/servicos`, `/contato`, `robots.txt` and `sitemap.xml` return successfully.
- `/admin` redirects to login when signed out.
- Owner passwordless login returns to the production domain.
- A marked test quote is stored, its notification arrives, and the test row is removed afterward.
- Project image upload, cover selection and deletion work.
- Vercel Analytics records public pages but not `/admin`.
- Sentry receives a controlled test error, then the test error is removed.
- Phone and WhatsApp links work on a real mobile device.

## Rollback

Use Vercel's previous deployment promotion for application rollback. Database migrations are forward-only; follow `BACKUP_AND_RECOVERY.md` before any destructive database change.
