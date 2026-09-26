# Troubleshooting

## Build hangs while reading Supabase

This development machine requires its network proxy. Use the package scripts, which set `NODE_USE_ENV_PROXY=1` for build, start and development.

## Admin redirects to login

Confirm the user exists in Supabase Auth and has a matching `profiles` row with `owner`, `admin` or `editor`. Check the production Auth redirect allow list for passwordless links.

## Project upload fails

Confirm the user is authenticated, the `project-media` bucket exists, the file uses an allowed MIME type, and it is no larger than 50 MB.

## Quote saves but email does not arrive

The database write intentionally succeeds independently. Check `RESEND_API_KEY`, the verified sender, notification recipient and deployment logs.

## Analytics has no data

Enable Web Analytics in Vercel and redeploy. Local development is not a reliable analytics verification environment.

## Sentry has no events

Set `NEXT_PUBLIC_SENTRY_DSN` and `SENTRY_DSN`. Source maps additionally require `SENTRY_ORG`, `SENTRY_PROJECT` and `SENTRY_AUTH_TOKEN` during the build.
