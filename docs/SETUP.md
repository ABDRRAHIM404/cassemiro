# Local setup

## Requirements

- Node.js 22 or newer
- npm 11 or newer

## Start the application

1. Copy `.env.example` to `.env.local`.
2. Set `NEXT_PUBLIC_SITE_URL` to the canonical site URL or `http://localhost:3000` locally.
3. Run `npm install`.
4. Run `npm run dev`.
5. Open `http://localhost:3000`.

Supabase public credentials are required because services, settings and portfolio visibility are database-driven. Email transport and Sentry remain optional for local development. Never commit `.env.local` or server credentials.

## Quote backend

1. Create a Supabase project.
2. Apply every migration in `supabase/migrations/` in filename order, preferably with `supabase db push`.
3. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and the server-only `SUPABASE_SERVICE_ROLE_KEY`.
4. For low-volume quote alerts, enable Google 2-Step Verification on `Cassemiro.obras@gmail.com`, create an app password and store it as server-only `GMAIL_APP_PASSWORD` in Vercel Production. Never use or share the regular Gmail password.
5. Alternatively, configure Resend with `RESEND_API_KEY` and a verified `RESEND_FROM_EMAIL`. Gmail takes precedence if both are configured. The sole recipient is fixed to `Cassemiro.obras@gmail.com`; legacy `QUOTE_NOTIFICATION_EMAIL` values are ignored.

Quote insertion occurs through the server API using the service role. The public database roles cannot insert leads directly. A saved lead remains successful even if notification email delivery fails.

See [Auth and email setup](AUTH_EMAIL_SETUP.md) for production redirects and the separate Supabase SMTP settings.

## Monitoring and analytics

Vercel Web Analytics needs no local ID; enable it in the deployed project dashboard. Sentry is disabled when its DSN variables are empty. Source-map upload additionally requires the Sentry organization, project and auth token during production builds.

## Quality commands

- `npm run typecheck`
- `npm run lint`
- `npm run build`
