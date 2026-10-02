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
| Quote honeypot validation | This tracker commit | A nonempty hidden field now parses so the route can return its quiet success without saving a quote. Added regression tests; production/staging abuse checks remain. |
| Admin operating guide corrected | This tracker commit | Guide now matches the one-form photo upload/retry flow and states the owner's full-access role decision. Staged workflow tests remain. |
| Baseline CSP protection | This tracker commit | Blocks object embeds, cross-site base URLs, outside form actions, and cross-site framing. A restrictive script/style policy still requires compatibility testing and is not claimed complete. |

## Remaining work, in priority order

Performance measurement note (2 Oct): `next experimental-analyze --output` was stopped after six minutes on this 3.6 GiB workspace because it consumed over 800 MiB and produced no report. P-02 is **not verified**; use a lower-cost production resource trace or a larger build environment before claiming bundle attribution.

| Priority | Audit references | Required proof / next action |
| --- | --- | --- |
| P1 | D-01, A-06, A-05, S-07 | Run safe staging fixtures through quote submission, email, admin create/edit/publish/delete, failed upload retry, honeypot behavior, and rate limiting. Never use real production leads for destructive tests. |
| P2 | S-01, S-06 | Owner decision (2 Oct): all admin roles have full access. Current shared authorization matches that policy; still verify direct-action access with separate staging identities and document the meaning of each role label. |
| P2 | S-05 | Verify Supabase Auth's current leaked-password protection setting and availability; enable and recheck if supported. |
| P2 | S-02 | Verify the baseline enforcing CSP on public/admin responses, then test a restrictive script/style policy without breaking prerendered Next scripts, Supabase uploads, analytics, or Sentry. |
| P2 | S-03, A-03, U-04 | Owner decision (2 Oct): quote requests should be kept for 12 months after last contact. Implement reliable last-contact tracking and deletion/anonymization before stating this as operational fact; confirm business claims, service radius, and project stage with the owner. |
| P2 | P-01, P-02, P-03, M-01 | Gather repeatable mobile/desktop performance data, frame decoding/transfer, JS attribution, and field Core Web Vitals where available. Optimize only demonstrated costs. |
| P2 | X-01, X-03, M-03 | Complete keyboard/screen-reader carousel check, measured contrast survey, reduced-motion/low-memory device check, and exact viewport review. |
| P2 | D-02, D-03 | Test password recovery/expired links with a safe account; inspect build logs and environment-variable *names/targets* without exposing values. |
| P2 | U-03, U-05 | Get owner approval before altering the exact Sérgio portrait; test localized date input behavior and add clear date guidance if ambiguous. |
| P3 | A-07, U-06, E-04 | Reconcile unused motion code/packages and add only verified service/project material; older horizontal-reel and separate-services instructions were superseded by later user direction. |
| Owner-held | A-01, U-01, D-06 | RAiDEN is explicitly a temporary test the owner will delete. Do not replace it with invented praise. Verify authentic testimonial permission before publishing a replacement. |

## Completion gates

- All in-scope code changes pass lint, typecheck, build, relevant automated tests, and a live browser check.
- Production deployment SHA matches the tracked commit for deployed fixes.
- Staging tests prove quote/email and admin write workflows without modifying customer data.
- Separate owner/editor identities prove the agreed full-access policy.
- The 12-month-after-last-contact retention policy is implemented and verified, not just written in the privacy notice; owner confirms other factual claims and any portrait edit.
- Performance and accessibility are measured at representative phone/desktop widths; remaining failures are fixed and rechecked.
