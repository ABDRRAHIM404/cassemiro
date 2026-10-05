# Production authentication and quote email

## Canonical redirects

The deployed application always generates authentication callbacks on `https://cassemiro-one.vercel.app`, independent of incoming host headers and stale environment values. Only `next dev` allows a local origin. Reset links target `/admin/redefinir-senha`; sign-in links target `/admin` or a validated admin subpage. Callback failures go to the production login page with no-store/no-referrer headers.

Supabase also needs these hosted settings; application code cannot repair emails already sent:

1. Open [CASSEMIRO Auth URL configuration](https://supabase.com/dashboard/project/zjjepitczgffszbilfte/auth/url-configuration).
2. Set Site URL to `https://cassemiro-one.vercel.app/`.
3. Allow `https://cassemiro-one.vercel.app/auth/callback`. CASSEMIRO's hosted verification accepts this callback with its admin/reset `next` query parameter; a wildcard is unnecessary.
4. Remove localhost and unrelated origins from this production project's allow list. Use a separate development project for local emailed authentication.
5. Check confirmation, invitation, magic-link, recovery and email-change templates: none should hardcode localhost. The default `{{ .ConfirmationURL }}` preserves the requested callback. For cross-device SSR verification, use the token-hash templates below; the callback verifies the token server-side and creates session cookies.

Optional magic-link/confirmation template link:

```html
<a href="https://cassemiro-one.vercel.app/auth/callback?token_hash={{ .TokenHash }}&amp;type=email&amp;next=%2Fadmin">Entrar no painel</a>
```

Optional recovery template link:

```html
<a href="https://cassemiro-one.vercel.app/auth/callback?token_hash={{ .TokenHash }}&amp;type=recovery&amp;next=%2Fadmin%2Fredefinir-senha">Redefinir senha</a>
```

These absolute production examples do not depend on Site URL slash formatting. Invitation and email-change templates must use their matching verification type. Template editing may require custom SMTP. Never print or persist live token-hash links in logs, screenshots or documentation. Previously sent links are not rewritten; request a fresh link after saving the hosted settings.

## Low-volume Gmail notifications

1. Sign into `Cassemiro.obras@gmail.com`, enable 2-Step Verification and create an app password named CASSEMIRO using [Google App Passwords](https://myaccount.google.com/apppasswords).
2. Add it as a Sensitive Production variable named `GMAIL_APP_PASSWORD` in [Vercel environment settings](https://vercel.com/abdrrahim404s-projects/cassemiro/settings/environment-variables). Do not send it through chat or commit it.
3. Redeploy so the running function sees the new credential.
4. Submit one clearly marked test quote, confirm its row in the admin and receipt in the intended Gmail inbox. Inspect spam too. Remove only that exact synthetic test record afterward.

The application connects to `smtp.gmail.com:465` using TLS with certificate verification enabled. Sender and sole recipient are fixed to `Cassemiro.obras@gmail.com`; there are no CC/BCC destinations or customer-supplied recipient fields. The notification includes all seven requested fields, Brazilian date formatting, submission time in Brasília's timezone and a protected admin link. User text is HTML-escaped and also supplied as plain text. Sending is attempted only after the database confirms a saved quote. Transport errors are sanitized and never turn a saved lead into a failed submission. Missing configuration is visible in the admin warning and does not imply email delivery.

Gmail is suitable for this low-volume setup, not a guaranteed bulk delivery service. Provider acceptance is not proof of inbox receipt. There is no durable retry queue; if a delivery fails, the quote remains in the admin for follow-up. Resend with a verified sender remains an alternative; it also uses the fixed recipient and a quote-ID idempotency key.

## Supabase authentication emails (separate configuration)

To send real admin auth emails through the same Gmail account, enable custom SMTP in [CASSEMIRO email settings](https://supabase.com/dashboard/project/zjjepitczgffszbilfte/auth/smtp):

- Host: `smtp.gmail.com`
- Port: `465`
- Username and sender address: `Cassemiro.obras@gmail.com`
- Password: a Gmail app password (enter securely in Supabase, not in SQL).
- Sender name: `CASSEMIRO`

Vercel's `GMAIL_APP_PASSWORD` does not automatically configure Supabase SMTP. Prefer a separate app password per service so either can be revoked independently. Verify fresh magic-link and recovery emails, destination, successful sign-in/reset, consumed/expired-link rejection and final admin destination. Do not mark real delivery verified from generated links or synthetic unit tests.

Sources: [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), [Google app-password requirements](https://support.google.com/accounts/answer/185833), [Nodemailer SMTP configuration](https://nodemailer.com/smtp).
