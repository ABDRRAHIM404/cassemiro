# Audit remediation progress

Updated: 2 October 2026. Source reports: `.audit/` at baseline `5ed4f02`. This is a live record, not a claim that the old reports themselves are updated. Record the change, evidence, and remaining verification after **each** fix, in the same commit where possible. Do not mark a finding complete from code inspection alone when it requires production or staged workflow proof.

## Fix log

| Fix | Commit | Evidence / remaining verification |
| --- | --- | --- |
| Private project media delivery, durable quote limit | `a68f7e1`, `d3b514b` | Code and database migration deployed; staging abuse/media lifecycle tests remain. |
| JSON-LD escaping, canonicals, metadata, social fallback | `0f4c55c` | Source updated; rendered SEO checks remain across every route. |
| Admin write error reporting and atomic service order | `56e3203` | Source and migration deployed; staged mutation tests remain. |
| Retryable project uploads and atomic media order | `5d0c6f0`, `86705aa` | Source and migration deployed; staged upload-failure tests remain. |
| Image alt-text publication rules | `faa8fad` | Source updated; existing project descriptions still need owner-supplied text. |
| Password recovery affordance | `6db8090` | Source updated; reset email and expired-link tests remain. |
| Testimonial permission attestation | `3974ded` | Source and migration deployed; the RAiDEN sample is intentionally left for the owner to delete later. |
| Route scroll position and hero reverse-wheel intent | `4c8d2f2`, `7ca0fd8` | Production interactions verified; broader device testing remains. |
| Avoid below-fold project image preload | `b45ad85` | Production HTML and image loading verified. |
| Readability of project hint/footer small text | `f082e67` | Production computed styles: 0.58 white opacity, 11.5 px; 390 px layout has no horizontal overflow. Full contrast audit remains. |
| Quote honeypot validation | `71bb82d` | A nonempty hidden field now parses so the route can return its quiet success without saving a quote. Added regression tests; production/staging abuse checks remain. |
| Admin operating guide corrected | `97d6bc5` | Guide now matches the one-form photo upload/retry flow and states the owner's full-access role decision. Staged workflow tests remain. |
| Baseline CSP protection | `97d6bc5` | Production header verified on `/`, `/contato`, `/admin/login`, and `/admin`; those pages render at 390 px with no error overlay/overflow. Blocks object embeds, cross-site base URLs, outside form actions, and cross-site framing. A restrictive script/style policy remains open. |
| Admin warning for missing quote email | `c6ded5c` | The protected server component renders a warning when any required Resend/destination setting is absent; it does not imply delivery has been tested. Deployment is READY; production signed-in rendering remains to be checked. |
| Additional dark-surface text contrast | `bb0fd3a` | Production computed styles verified for trust footnote, testimonial source, and quote privacy note at 390 px; no horizontal overflow. Admin sidebar and full contrast audit remain to be checked. |
| Portuguese quote date entry | `9ff48fc` | Production at 390 px shows `DD/MM/AAAA`. An impossible date displays an associated error, receives focus, and makes zero fetch calls; parser tests prove ISO conversion. No real quote was submitted. |
| Carousel landmark and keyboard context | `1c8f459` | Production DOM exposes localized `carrossel` region, instructed focusable group, and polite live caption. After hydration, Right Arrow changes 1/2 to 2/2 without moving focus or causing page overflow. Actual screen-reader announcement quality remains unverified. |
| Reuse loaded hero poster as frame 001 | `4cd00bd` | Before: a live 390 px session fetched frame 001 twice. After: local production build/browser at 390 px and 1366 px requests it once (`img`), the canvas becomes ready, the service phase advances, and neither viewport overflows. Avoids one approximately 41 KB mobile / 132 KB desktop image transfer in these tests. Cross-device field performance remains unmeasured. |
| Compact static sequence on constrained devices | `51a359d` | Before: simulated 1 GiB/2-core device suppressed canvas decoding but kept a roughly 5064 px hero and hid the service list. After: local production build/browser with simulated low memory or `saveData` shows the six static stages and services link in a roughly 1387 px hero at 390 px; normal motion remains unchanged. Reduced-motion CSS was also checked at 390/1366 px. Real device testing remains open. |
| Private, uncached auth callback redirects | `a82c94b` | An invalid recovery code previously produced a public-cacheable 307. Production now returns a 307 with `Cache-Control: private, no-store, max-age=0` and `Referrer-Policy: no-referrer`; this does not prove a real recovery email or successful code exchange. |
| Remove unused GSAP packages | `e14811d` | No source import referenced `gsap` or `@gsap/react`; removed both from the manifest and lockfile. Lint, typecheck, all 12 tests, and production build pass. This reduces unused install surface, not measured client JavaScript or frame latency. Inactive legacy components still need separate review. |
| Fix measured accessibility findings | `31633a3` | Local production browser axe WCAG 2/2.1 A/AA at 390 and 1366 px found an unlabeled generic hero-service container, low-contrast optional-date text, and low-contrast admin-login divider. Expanded scan found low-contrast service index numbers. After fixes, the four core routes pass at both widths; all 11 additional public/auth routes and mobile menu/form-error states pass at 390 px. Live 390 px browser confirmed the hero region and optional-date color with no overflow. Automated scans do not replace real screen-reader or visual contrast review over images. |
| Prevent stale/failed public CMS reads from publishing empty pages | `4924edc` | A clean local build was still caching September 26 Supabase project responses for one year, so its homepage and sitemap omitted two projects that a fresh read returned. Public Supabase reads now revalidate every five minutes, and query errors throw instead of being rendered as genuine empty data. A production build contains both projects and both sitemap URLs. Local production browser arrow and swipe changed carousel index 1/2 ↔ 2/2 at 390 and 1366 px without horizontal overflow. Lint, typecheck, and 14 tests pass. Vercel deployment for this SHA is READY, and the production alias HTML/sitemap contain the carousel and both project URLs. |

## Remaining work, in priority order

Performance measurement note (2 Oct): `next experimental-analyze --output` was stopped after six minutes on this 3.6 GiB workspace because it consumed over 800 MiB and produced no report. P-02 is **not verified**; use a lower-cost production resource trace or a larger build environment before claiming bundle attribution.

Synthetic performance baseline (2 Oct, local production build at `31633a3`): three Chromium mobile runs at 390 × 844 with 150 ms RTT, 200 KB/s download and 4× CPU throttling yielded FCP/LCP 1008–1124 ms, CLS 0, five long tasks, and about 201 KB of hero frames requested within three seconds. Three unthrottled desktop runs at 1366 × 768 yielded FCP/LCP 312–320 ms, CLS 0, two to three long tasks, and about 953 KB of initial hero frames. These are repeatable lab observations, **not** p75 field Core Web Vitals, and they do not attribute JS chunks or prove scroll frame timing.

Home resource trace (2 Oct, local production build at `4924edc`, 390 px): the browser transferred roughly 262 KB across script/chunk/CSS resource entries during the first 2.5 seconds. The largest JavaScript chunk was about 141 KB transferred, followed by one at 44 KB; the rest were mostly under 17 KB. This is a transfer-size inventory, not source-module attribution or proof that the site's custom carousel/sequence code dominates the bundle. No dependency was removed on this evidence alone.

Wheel-snap check (2 Oct, local production build at `31633a3`): once the canvas is ready at 1366 px, a large `deltaY=5000` wheel event snaps only to Fundações; a second event during its hold is suppressed; a later event advances only to Estruturas. A wheel event dispatched before hydration can still native-scroll through the long hero without stage holds. This is an initial-load interaction risk, not proof that normal wheel or trackpad gestures skip phases after readiness. Real mouse/trackpad testing remains open.

Vercel environment-name check (2 Oct, values not decrypted): Production and Preview each have `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. No `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, or `QUOTE_NOTIFICATION_EMAIL` is configured, so the quote endpoint currently skips notification email. Sentry variables are also absent; do not claim Sentry monitoring is active. This resolves the environment *inventory* part of D-03 but not delivery verification.

Vercel build-log check (2 Oct, deployment `97d6bc5`): 81 build events were available. Next 16.3.6 completed its build and deployed successfully. The only actionable warning is npm's unapproved `unrs-resolver@1.12.2` postinstall script; investigate whether its fallback affects build/lint performance before approving any dependency script. D-03's build-log visibility is now closed; the missing notification/monitoring configuration remains separate work.

Rendered SEO check (2 Oct, production `51a359d`): all 13 sitemap URLs returned HTTP 200 with a matching canonical and title. The homepage JSON-LD parsed as `GeneralContractor`, and `robots.txt` links the sitemap while excluding `/admin/`. An invalid auth callback code and an unauthenticated password-reset page both redirected to login; this does not test real recovery delivery.

Owner fact check (2 Oct): the owner confirmed the public legal name “CASSEMIRO CONSTRUÇÕES LTDA,” the approximate 50 km Sorocaba service radius, and that both published projects are completed. The “Residência Contemporânea Linear” hero photo visibly records construction work, so the photo should not be interpreted as the project's current status. No photo or Sérgio portrait was altered.

Public content cache check (2 Oct): a local static build had cached `/rest/v1/projects` responses dated September 26 with zero rows and a one-year lifetime, even after the local `.next` directory was moved aside for a clean build. Direct authenticated-to-anon public reads returned two rows. Adding a five-minute Next fetch revalidation policy produced fresh October 2 responses and a complete prerender. This fixes the observed stale-build behavior; it does not verify future CMS edits, cache invalidation latency on Vercel, or every external cache layer.

| Priority | Audit references | Required proof / next action |
| --- | --- | --- |
| P1 | D-01, A-06, A-05, S-07 | Configure a verified quote-notification email provider and destination, then run safe staging fixtures through quote submission, email, admin create/edit/publish/delete, failed upload retry, honeypot behavior, and rate limiting. Never use real production leads for destructive tests. |
| P2 | S-01, S-06 | Owner decision (2 Oct): all admin roles have full access. Current shared authorization matches that policy; still verify direct-action access with separate staging identities and document the meaning of each role label. |
| P2 | S-05 | Verify Supabase Auth's current leaked-password protection setting and availability; enable and recheck if supported. |
| P2 | S-02 | Verify the baseline enforcing CSP on public/admin responses, then test a restrictive script/style policy without breaking prerendered Next scripts, Supabase uploads, analytics, or Sentry. |
| P2 | S-03, A-03, U-04 | Owner decision (2 Oct): quote requests should be kept for 12 months after last contact. Implement reliable last-contact tracking and deletion/anonymization before stating this as operational fact. Legal name, approximate service radius, and both projects' completed status are owner-confirmed; image-stage captions/alt text remain editorial work. |
| P2 | P-01, P-02, P-03, M-01 | Duplicate first-frame request fixed locally; gather repeatable mobile/desktop frame decoding/transfer, JS attribution, and field Core Web Vitals where available. Optimize only demonstrated costs. |
| P2 | X-01, X-03, M-03 | Complete real screen-reader carousel check, visual image-overlay contrast review, real low-memory device check, and exact viewport review. Automated axe scans now pass on tested routes/states at 390/1366 px; simulated reduced-motion, 1 GiB/2-core, and data-saver fallbacks passed local production browser checks. |
| P2 | D-02, D-03 | Test password recovery/expired links with a safe account. Build logs and environment-variable names/targets were checked without decrypting values; investigate the `unrs-resolver` install-script warning. |
| Owner-held | U-03 | The user explicitly required the exact real Sérgio photo without alteration. Keep it unchanged, including the existing shirt mark, unless the user later explicitly authorizes an edit. |
| P3 | A-07, U-06, E-04 | Unused GSAP dependencies removed; review inactive legacy components and add only verified service/project material. Older horizontal-reel and separate-services instructions were superseded by later user direction. |
| Owner-held | A-01, U-01, D-06 | RAiDEN is explicitly a temporary test the owner will delete. Do not replace it with invented praise. Verify authentic testimonial permission before publishing a replacement. |

## Completion gates

- All in-scope code changes pass lint, typecheck, build, relevant automated tests, and a live browser check.
- Production deployment SHA matches the tracked commit for deployed fixes.
- Staging tests prove quote/email and admin write workflows without modifying customer data.
- Separate owner/editor identities prove the agreed full-access policy.
- The 12-month-after-last-contact retention policy is implemented and verified, not just written in the privacy notice; verified business/project facts are reflected accurately and any portrait edit requires separate owner authorization.
- Performance and accessibility are measured at representative phone/desktop widths; remaining failures are fixed and rechecked.
