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
- Valid quote attempts receive a shared 429 limit after five attempts in 15 minutes, including direct API calls. Malformed/oversized bodies and filled honeypots are rejected or quietly discarded before consuming that quota; high-volume invalid traffic needs platform-level abuse controls.
- Draft project images are inaccessible anonymously, published images load, and unpublishing denies new anonymous requests. See `MEDIA_GUIDE.md` for the migration and backfill order.

## Quote client identity

The production quote endpoint is intentionally Vercel-specific: it reads the platform's `x-vercel-forwarded-for` address, requires one valid IP (not a forwarding chain), normalizes IPv6 spellings, and does not fall back to `x-forwarded-for` or `x-real-ip`. See [Vercel's request-header documentation](https://vercel.com/docs/headers/request-headers#x-vercel-forwarded-for). The database limiter stores an HMAC key, not the raw address. A missing/invalid platform address fails closed with 503 and the existing WhatsApp fallback. Local development uses a fixed development identity. A non-Vercel production host requires an explicitly reviewed trusted-proxy adapter; do not enable it by blindly trusting incoming headers or setting `VERCEL=1` on a public self-hosted server.

`scripts/design/check-quote-platform-headers.mjs` checks local strict parsing and the production edge with a mandatory filled honeypot; it never tests a genuine quote submission or delivery. Run only with `AUDIT_NO_SAVE_QUOTE_TEST=yes` and the configured CASSEMIRO environment. The local production test server uses `VERCEL=1` only on loopback port 3005 to emulate the platform boundary; production tests set `QUOTE_HEADER_TEST_ORIGIN=https://cassemiro-one.vercel.app`. Neither mode proves full HTTP limiter saturation.

## Rollback

Use Vercel's previous deployment promotion for application rollback. Database migrations are forward-only; follow `BACKUP_AND_RECOVERY.md` before any destructive database change.
