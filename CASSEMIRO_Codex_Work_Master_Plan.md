# CASSEMIRO — Codex Work Master Plan

> Primary implementation brief for Codex Work / VS Code. Treat this document as the implementation contract unless the user gives newer instructions.

---

# ROLE

You are the lead design engineer, frontend engineer, backend engineer, SEO engineer, motion designer, QA engineer, and deployment owner for the CASSEMIRO website.

Your responsibility is to build the project end-to-end as a production-quality MVP.

Do not produce a generic contractor template.

Do not stop at wireframes.

Do not spend the project endlessly proposing options.

Inspect the repository and supplied assets, make a short execution plan, then implement.

---

# 1. PRODUCT

Build a premium, immersive website and lightweight business system for:

**CASSEMIRO**  
**Construção & Reformas**

Working slogan:

**Do alicerce ao acabamento.**

The business is led by **Sérgio Cassemiro** near Sorocaba, São Paulo, Brazil.

Public site language:

**Portuguese (Brazil)**

Code language:

**English**

Use English for:

- filenames
- folder names
- variables
- functions
- database identifiers
- comments
- technical documentation

Use Portuguese for visitor-facing UI and SEO copy.

---

# 2. ABSOLUTE DESIGN REQUIREMENT

The public site must feel:

- cinematic
- architectural
- spatial
- interactive
- premium
- alive
- magical

It must **not** look like:

- a generic SaaS template
- a normal contractor WordPress theme
- a simple hero + 6 cards + gallery layout
- a page made only from flat rectangles stacked vertically

## Core design principle

> Build an experiential architecture/construction website where the interface itself moves, transforms, rotates, overlaps, reveals, and responds to the visitor.

Motion and interaction are first-class product requirements.

---

# 3. VERIFIED BUSINESS FACTS

## Brand

Public brand:

**CASSEMIRO**

Descriptor:

**Construção & Reformas**

Do not use **SC** as the new public brand.

The legal/current business name is:

**Cassemiro Construções LTDA**

## Sérgio

Owner/lead:

**Sérgio Cassemiro**

Facts:

- registered construction company
- approximately 6 workers
- Sérgio has 43+ years of hands-on construction experience
- approximately 6 years operating his own company

Do not say the company itself is 43 years old.

## Service area

- Sorocaba
- Votorantim
- Itu
- Porto Feliz
- approximately 50 km around Sorocaba

Do not invent service cities.

## Contact

Phone / WhatsApp:

`(15) 99610-1849`

Email:

`Cassemiro.obras@gmail.com`

Instagram exists; URL pending.

Facebook exists; URL pending.

Google Business Profile status is unknown.

Hide missing social URLs rather than linking to placeholders.

---

# 4. SÉRGIO'S REAL BRAND PHILOSOPHY

Use this as the source for copy and tone.

Sérgio:

- genuinely loves construction
- takes pride in doing work correctly
- values attention to detail
- values responsibility
- uses materials efficiently
- avoids waste
- respects contract deadlines
- maintains quality while meeting deadlines
- built his expertise through 43 years of hands-on experience
- values integrity
- values honesty
- values fairness
- prioritizes customer satisfaction
- wants long-term client relationships
- wants recommendations to come from work quality

Primary values:

- Qualidade
- Eficiência
- Integridade
- Compromisso
- Responsabilidade

Do not prominently mention his lack of formal college/technical training.

Frame it positively as decades of practical, hands-on knowledge.

---

# 5. BRAND SYSTEM

## Identity

Use:

**CASSEMIRO**  
**Construção & Reformas**

Working slogan:

**Do alicerce ao acabamento.**

No SC monogram.

## Visual direction

- geometric architectural C monogram
- strong CASSEMIRO wordmark
- charcoal / black
- ivory / stone
- warm bronze accents
- dark + light sections
- premium architectural composition
- modern construction character
- editorial typography

Approximate palette:

```css
--black: #0E0E0E;
--charcoal: #1F1F1F;
--bronze: #B08B5A;
--stone: #A7A7A2;
--ivory: #F6F3ED;
--warm-white: #FBF9F4;
```

Adjust for accessibility contrast.

Typography direction:

- modern sans for body/UI
- refined serif for selective editorial moments

Do not make the whole site serif-heavy.

---

# 6. REFERENCE ASSETS

The project may contain:

- selected CASSEMIRO brand board
- real photos of houses Sérgio built
- Sérgio portrait
- finished construction hero frames

Inspect any supplied reference directories before building.

Suggested structure if not already organized:

```text
references/
  brand/
  real-projects/
  sergio/
  hero-phases/
```

## Real house references

The supplied real houses show:

- contemporary Brazilian residential architecture
- two-story geometric volumes
- flat/parapet rooflines
- white/gray façades
- dark frames
- restrained accent color

Use them as authentic visual references.

Never invent project metadata.

## Sérgio portrait

A real portrait has been supplied.

**Do not edit it now.** The user explicitly asked not to start editing the picture.

Build the About section so the final edited portrait can be dropped in later with minimal code changes.

If the current source portrait is used temporarily, do not treat old SC shirt branding as part of the new identity.

---

# 7. HERO FRAME SEQUENCE — ALREADY FINISHED

The construction hero frames are finished.

The user will place/provide them in the correct file directory of the project.

Therefore:

- do not generate replacement frames
- do not edit the frames unless the user explicitly asks
- inspect the actual supplied directory and filenames
- preserve frame order
- make the frame source configurable
- build the hero around local/static supplied assets
- do not block development waiting for new hero artwork if the files are already present

Recommended default convention only if needed:

```text
public/media/hero/frames/
  frame-0001.webp
  frame-0002.webp
  frame-0003.webp
  ...
```

The actual supplied path takes priority.

The intended visual narrative is:

```text
simple ground
→ excavation/layout
→ foundation
→ concrete structure
→ masonry
→ slab/roof
→ electrical/plumbing
→ plaster/render
→ windows/doors
→ flooring/paint
→ exterior
→ completed home
```

Media rule:

**No words, labels, phase numbers, logos, captions, or watermarks should be baked into the frames.**

The site renders all text separately as HTML.

---

# 8. IMMERSIVE INTERACTION SYSTEM

This section is mandatory.

Do not downgrade these requirements into basic fade-in animations.

## 8.1 Smooth scrolling

Use a stable smooth-scroll implementation such as Lenis.

Integrate properly with ScrollTrigger.

Do not break:

- keyboard navigation
- anchor links
- browser history
- reduced motion

## 8.2 Hero scroll scrub

Desktop:

- full viewport
- supplied frame sequence scrubbed by scroll
- pinned for a controlled duration
- text overlays are separate HTML layers
- subtle depth/parallax
- preloading strategy must avoid freezing the page

Mobile:

- lighter frame strategy or converted lightweight video if needed
- reduced pin duration
- no excessive memory usage
- poster/static fallback

## 8.3 Rotating services catalog

Create a signature interactive service section.

Desktop concept:

- services arranged as a rotating ring / cylinder / perspective catalog
- scroll wheel, drag, or controlled arrows rotate the catalog
- selected service moves toward viewer
- background/description updates smoothly
- 3D perspective should feel architectural, not like an e-commerce spinner

Use CSS 3D transforms first unless WebGL provides a clear advantage.

Mobile:

- swipe/snap cards
- accessible controls
- same premium feel, less complexity

Top-level services:

- Construção Residencial
- Reformas
- Construção Comercial
- Alvenaria e Estruturas
- Instalações
- Acabamentos

## 8.4 Pinned construction-process scene

Create a second major scroll scene for:

**Do alicerce ao acabamento**

As the user scrolls:

- stages change
- architectural lines move
- layers build up
- text transitions spatially
- the section feels like one continuous scene

Avoid a boring timeline with six boxes.

## 8.5 Horizontal projects reel

When real projects exist:

- pin section
- translate project panels horizontally as vertical scroll continues
- oversized imagery
- smooth mask reveals
- project counter
- subtle parallax
- optional image hover movement

If no real projects exist:

- hide the section
- do not fill it with AI/stock houses

## 8.6 Stacked / peeling cards

Use selectively for values/process/story.

Cards can:

- stack in Z-space
- pin
- peel away
- scale subtly
- reveal the next layer

Do not use this everywhere.

## 8.7 Picture movement

Real/project imagery should use deliberate motion treatments.

Possible techniques:

- parallax within crop
- slow scroll pan
- scale reveal
- clip-path reveal
- mask expansion
- foreground/background layering
- cursor tilt
- image transitioning from card to full bleed

Never animate all images identically.

## 8.8 Magnetic CTAs

Primary desktop buttons can have subtle pointer magnetism.

Maintain obvious click target.

Disable for coarse pointers.

## 8.9 Custom cursor

Optional desktop-only.

Possible states:

- default dot/ring
- `ARRASTE` on draggable service carousel
- `VER PROJETO` on project imagery

Do not replace native cursor if it harms usability.

## 8.10 Particle / atmosphere movement

Add a subtle atmospheric system in one or two scenes.

Preferred concepts:

- construction dust
- light particulate
- moving blueprint points
- architectural line fragments

Avoid fantasy particles / stars.

Use a lightweight Canvas/WebGL layer only if performance is good.

## 8.11 Layered typography

Use oversized text selectively.

Typography can:

- pass behind image planes
- overlap boundaries
- move at different scroll speeds
- clip through masks

Always preserve readability.

## 8.12 Section morphs

Do not hard-stop every section.

Build transitions where:

- a bronze line continues into the next scene
- an image frame expands into a background
- a dark construction slab slides across the page
- a service panel becomes a CTA
- the C monogram acts as a transition device

## 8.13 Page transitions

Marketing-page navigation should feel polished.

Use short transitions such as:

- architectural mask wipe
- C-monogram reveal
- panel slide
- controlled fade/translate

Keep transition short enough that navigation feels instant.

## 8.14 Targeted true 3D

True 3D is allowed, but only where it meaningfully improves the experience.

Possible targets:

- C monogram
- small architectural object
- service ring
- structural wireframe scene

Do not make the entire site a Three.js canvas.

---

# 9. MOTION HIERARCHY

Use three levels.

## Level 1 — ambient

- tiny background particles
- slow image drift
- line movement

## Level 2 — interaction

- hover tilt
- magnetic CTA
- rotating catalog
- image mask reveal

## Level 3 — signature scenes

- hero construction scrub
- pinned process
- horizontal projects

Leave calm sections between signature moments.

---

# 10. HOMEPAGE CHOREOGRAPHY

Build the homepage around scenes, not generic sections.

## Scene 1 — Hero

Components:

- full-screen supplied frame sequence
- CASSEMIRO identity
- short copy
- CTA
- secondary CTA

Suggested visible copy:

**CASSEMIRO**

**Do alicerce ao acabamento.**

Primary:

**Solicitar orçamento**

Secondary:

**Conheça nossos serviços**

## Scene 2 — 43 years / authority

Use a visually strong transition.

Copy direction:

**Mais de 43 anos de experiência prática na construção civil.**

Support with:

- responsibility
- quality
- deadlines
- material efficiency

Avoid making a giant fake statistics dashboard.

## Scene 3 — Rotating services catalog

Signature rotating UI.

## Scene 4 — Process

Pinned build/process choreography.

## Scene 5 — Values

Use:

- Qualidade
- Eficiência
- Integridade
- Compromisso
- Responsabilidade

Consider stacked/peeling cards or large moving words.

## Scene 6 — Company / Sérgio

Do not use a basic image-left/text-right layout.

Possible implementation:

- portrait pinned
- quote/text moves around it
- experience text scrolls in layers
- bronze architectural line traces through section

Do not edit the portrait source file.

## Scene 7 — Real projects

Horizontal reel if real data exists.

## Scene 8 — Testimonials

Only real approved content.

Hide when empty.

## Scene 9 — Conversion

Large CTA moment.

Suggested:

**Tem um projeto em mente?**

Buttons:

- Solicitar orçamento
- Falar no WhatsApp

## Scene 10 — Footer

Clean, premium, not over-animated.

---

# 11. PAGES

Public routes:

```text
/
/sobre
/servicos
/servicos/[slug]
/projetos
/projetos/[slug]
/contato
/trabalhe-conosco
/faq
/politica-de-privacidade
```

Admin:

```text
/admin/login
/admin
/admin/orcamentos
/admin/projetos
/admin/servicos
/admin/depoimentos
/admin/conteudo
/admin/configuracoes
```

Blog is not required for MVP.

---

# 12. PUBLIC NAVIGATION

Desktop:

- transparent over hero
- logo
- links
- quote CTA
- transitions to a solid compact header after hero

Suggested links:

- Início
- Sobre
- Serviços
- Projetos
- Contato

Hide Projects if no published project exists.

Mobile:

- simple menu
- fast
- accessible
- no excessive 3D

---

# 13. SERVICES

Confirmed broad capabilities:

- complete house construction
- residential construction
- commercial construction
- renovations
- masonry
- foundations
- concrete
- roofing
- flooring
- painting
- electrical
- plumbing
- drywall
- bathrooms
- kitchens
- pools
- demolition
- extensions
- finishing
- small repairs
- larger jobs

Recommended top-level categories:

```text
Construção Residencial
Reformas
Construção Comercial
Alvenaria e Estruturas
Instalações
Acabamentos
```

Potential SEO routes:

```text
/servicos/construcao-de-casas
/servicos/reformas
/servicos/construcao-comercial
/servicos/alvenaria-e-estruturas
/servicos/telhados
/servicos/pisos-e-revestimentos
/servicos/pintura
/servicos/instalacoes-eletricas
/servicos/instalacoes-hidraulicas
/servicos/drywall
/servicos/banheiros-e-cozinhas
/servicos/acabamentos
```

Do not publish thin duplicate pages.

---

# 14. PROJECTS

Build CMS support now.

Project model supports:

- title
- slug
- city
- category
- summary
- description
- services
- duration
- hero image
- gallery
- video
- before/after
- testimonial
- SEO fields

Admin actions:

- create
- edit
- publish
- delete

No draft workflow required.

Never use AI/stock imagery as fake completed work.

The existing real house photos can be used only as real work, with no invented metadata.

---

# 15. QUOTE FLOW

Form fields:

```text
Nome
Telefone / WhatsApp
Cidade
Tipo de obra
Descrição do projeto
Data desejada para início
```

Do not require photo upload in MVP.

After submission:

1. validate server-side
2. rate-limit
3. write to DB
4. send company notification email
5. show success state
6. show WhatsApp continuation CTA

Generated WhatsApp continuation:

`Olá, sou {nome}, de {cidade}. Acabei de solicitar um orçamento pelo site para {tipo} e gostaria de continuar o atendimento por aqui.`

Leads remain stored even if email provider fails.

---

# 16. WHATSAPP

Phone:

`(15) 99610-1849`

Generic quote message:

`Olá, encontrei a CASSEMIRO pelo site e gostaria de solicitar um orçamento.`

Recruiting message:

`Olá, encontrei a CASSEMIRO pelo site e gostaria de saber sobre oportunidades para trabalhar com a equipe.`

## Trabalhe Conosco

Direct to WhatsApp.

No recruitment form.

Sérgio handles recruiting.

## Mobile sticky bar

Use when appropriate:

- Ligar
- WhatsApp
- Orçamento

No always-visible floating WhatsApp bubble.

---

# 17. TESTIMONIALS

Rules:

- no fake reviews
- hide when empty
- admin approval required

Admin:

- add
- edit
- approve/unapprove
- delete

Future:

- Google review URL
- `Avaliar no Google`

---

# 18. ADMIN

Expected users:

- Abderrahim
- friend
- Sérgio

Separate accounts.

Admin should be practical, not magical.

## Modules

### Overview

- new leads
- recent leads
- project count
- testimonial count

### Quote requests

- list
- filter
- detail
- status
- contact
- archive

Suggested statuses:

```text
Novo
Em contato
Orçamento
Fechado
Arquivado
```

### Projects

- create
- edit
- publish
- delete
- media
- video
- before/after

### Services

- edit
- reorder
- visibility
- optional price
- price visibility

### Testimonials

- create
- edit
- approve
- delete

### Content

- hero text
- slogan
- about copy
- CTA text

Do not build a page builder.

### Settings

- phone
- WhatsApp
- email
- CNPJ
- Instagram
- Facebook
- service areas
- legal name
- recruitment message

### Pricing

Default public pricing:

**hidden**

Support per-service:

- show/hide
- price text
- optional `a partir de`

### SEO

- title
- description
- social image
- social title/description

---

# 19. STACK

Use the latest stable compatible versions at implementation time.

Preferred:

- Next.js
- TypeScript
- Tailwind CSS
- GSAP
- `@gsap/react`
- ScrollTrigger
- Lenis
- Motion only where simple enter/exit interaction is useful
- CSS 3D transforms for most perspective interactions
- Three.js / React Three Fiber only for targeted true-3D needs
- Supabase
- Resend
- Vercel
- Sentry
- Vercel Analytics or equivalent

Do not add huge animation libraries unnecessarily.

---

# 20. ANIMATION OWNERSHIP

Prevent conflicts.

Use:

## GSAP + ScrollTrigger

For:

- pinned sections
- scrubbed hero
- horizontal scrolling
- layered choreography
- complex timelines

## Lenis

Only for scrolling.

Wire Lenis and ScrollTrigger correctly.

## CSS

For:

- hover
- simple 3D perspective
- focus
- small transitions

## Motion

Only for lightweight React enter/exit/state transitions when simpler than GSAP.

## Three.js/R3F

Only if a selected signature feature clearly requires it.

---

# 21. DATABASE

Use Supabase migrations.

Suggested schema.

## profiles

```text
id
display_name
role
created_at
```

## quote_requests

```text
id
name
phone
city
work_type
description
desired_start_date
status
source
utm_source
utm_medium
utm_campaign
created_at
updated_at
```

## services

```text
id
slug
title
short_description
content
is_visible
sort_order
price_label
show_price
seo_title
seo_description
created_at
updated_at
```

## projects

```text
id
slug
title
city
category
summary
content
duration
hero_image
video_url
is_published
seo_title
seo_description
created_at
updated_at
```

## project_media

```text
id
project_id
type
url
alt_text
sort_order
before_after_group
created_at
```

## testimonials

```text
id
customer_name
text
rating
source
is_approved
created_at
updated_at
```

## site_settings

Use typed/validated settings.

---

# 22. AUTH / SECURITY

Use Supabase Auth.

Requirements:

- protected admin routes
- server-side authorization
- RLS
- no public CMS writes
- quote creation via controlled server action/API
- service-role key server-only
- strict environment validation
- upload MIME/size validation
- sanitized content
- rate limiting
- safe public errors
- security headers
- HTTPS
- dependency audit

No shared password.

---

# 23. MEDIA

Project uploads:

- images
- video
- before/after

Requirements:

- allowed MIME types
- size limits
- normalized names
- organized storage
- alt text
- image optimization
- no executable files
- orphan cleanup where practical

Hero media system must support the **supplied local frame sequence** first, with optional future support for:

```text
desktop video
mobile video
poster
frame sequence
```

Keep media configuration easy to swap.

Do not regenerate or edit hero frames without explicit instruction.

---

# 24. PERFORMANCE

The site must remain smooth.

Target good Core Web Vitals.

Requirements:

- responsive images
- AVIF/WebP
- compressed media
- hero frame preloading strategy
- preload only nearby/current frames, not necessarily every full-resolution frame at once
- poster/static first paint
- lazy below-fold media
- dynamically import heavy scenes
- pause offscreen animation
- disable expensive pointer interactions on coarse pointers
- simplify on mobile
- reduced-motion fallback
- avoid giant JS bundle
- avoid multiple WebGL canvases

If an effect stutters on a normal Android phone, simplify it.

---

# 25. REDUCED MOTION

`prefers-reduced-motion` is mandatory.

Reduced-motion version should:

- remove inertial scroll
- remove long scrub sequences
- use static poster / simple fades
- keep navigation and content complete
- preserve all CTAs

No content can exist only inside an animation.

---

# 26. ACCESSIBILITY

Implement:

- semantic HTML
- keyboard navigation
- skip link
- focus states
- labels
- form errors
- accessible menus
- carousel controls
- touch targets
- correct heading hierarchy
- contrast
- alt text
- no autoplay audio

The rotating service catalog must also be controllable by keyboard/buttons.

---

# 27. SEO

Primary target:

Sorocaba region.

Keyword themes:

```text
construtora em Sorocaba
construção de casas em Sorocaba
reforma em Sorocaba
construção residencial em Sorocaba
reforma residencial em Sorocaba
construtor civil em Sorocaba
obras e reformas em Sorocaba
```

Do not keyword-stuff.

Implement:

- unique metadata
- canonical URLs
- sitemap
- robots
- OG
- social cards
- breadcrumbs
- LocalBusiness / Organization schema
- Service schema
- Breadcrumb schema
- FAQ schema when appropriate
- noindex admin/login
- 404
- redirects
- clean slugs

Do not invent a street address.

No service-area map is required.

---

# 28. GOOGLE BUSINESS

Status unknown.

Do not block development.

Create a documentation checklist:

1. locate existing profile
2. claim or create
3. verify
4. add website
5. add service areas
6. add real photos
7. collect legitimate reviews
8. connect Search Console

---

# 29. ANALYTICS

Track useful events:

- quote form opened
- quote submitted
- WhatsApp quote click
- phone click
- recruitment WhatsApp click
- service detail CTA
- project open

Do not send phone number or full project description to analytics.

---

# 30. EMAIL

On quote submission, notify:

`Cassemiro.obras@gmail.com`

Include:

- name
- phone
- city
- work type
- description
- desired start
- timestamp

DB storage must succeed independently of email delivery.

If email fails:

- keep lead
- report to monitoring
- show reasonable success if lead was saved

---

# 31. EMPTY STATES

Hide missing content elegantly.

Examples:

- no projects → hide portfolio section/navigation item
- no testimonials → hide testimonials
- no Instagram URL → hide icon
- no Facebook URL → hide icon
- no CNPJ → omit it
- no Google review URL → omit CTA

No Lorem Ipsum in production.

---

# 32. CONTENT TONE

Write `pt-BR` copy that is:

- confident
- concise
- premium
- warm
- professional
- real

Avoid:

- `somos líderes`
- `número 1`
- invented superlatives
- generic AI filler
- fake awards

Good working lines:

- `Do alicerce ao acabamento.`
- `Experiência que constrói confiança.`
- `Qualidade em cada etapa.`
- `Mais de quatro décadas de experiência em construção.`
- `Construir certo. Entregar com responsabilidade.`

---

# 33. PROJECT STRUCTURE

Suggested:

```text
src/
  app/
    (marketing)/
    admin/
    api/
  components/
    ui/
    motion/
    marketing/
    admin/
  features/
    quotes/
    projects/
    services/
    testimonials/
    settings/
  lib/
    animation/
    seo/
    supabase/
  server/
  config/
  types/
  styles/
public/
  media/
    hero/
  images/
references/
docs/
supabase/
```

Exact structure may change if there is a cleaner architecture.

Use strict TypeScript.

---

# 34. MOTION COMPONENTS TO BUILD

Create reusable primitives instead of coding every animation inline.

Examples:

```text
SmoothScrollProvider
ScrollScene
PinnedScene
HeroFrameSequence
ParallaxMedia
RevealMask
MagneticButton
PerspectiveCard
HorizontalReel
RotatingCatalog
StackedCards
SplitTextReveal
AmbientParticles
PageTransition
ReducedMotionBoundary
```

Naming can differ, but architecture should keep motion maintainable.

---

# 35. THREE-DAY EXECUTION PLAN

## Day 1 — Experience

### First

- inspect repository and supplied assets
- locate hero frame directory
- initialize app if needed
- design tokens
- fonts
- layout
- navigation
- footer

### Then

Build homepage signature scenes:

- hero frame-sequence system
- hero scroll scrub
- 43-year experience scene
- rotating service catalog
- pinned process scene
- values/story scene
- conversion CTA

### End of Day 1

The homepage must already look distinct and premium.

Do not postpone all motion until the final day.

## Day 2 — System

- Supabase
- schema
- RLS
- auth
- admin shell
- quote form
- email
- WhatsApp flow
- services admin
- projects admin
- testimonials
- site settings
- uploads

## Day 3 — Polish + production

- integrate real project media
- integrate Sérgio section using placeholder/current source without editing the portrait
- horizontal project reel
- page transitions
- particle/atmosphere layer
- mobile tuning
- reduced motion
- SEO
- structured data
- performance
- accessibility
- Sentry
- analytics
- deployment
- docs
- final QA

---

# 36. SCOPE GUARDRAILS

Do not add now:

- blog
- customer portal
- payment system
- quotation PDF generator
- advanced CRM
- live chat
- AI chatbot
- appointment scheduler
- Google review auto-sync
- social feed embeds
- full WebGL site

Build foundations that allow later expansion.

---

# 37. REQUIRED DOCUMENTATION

Create:

```text
docs/PROJECT.md
docs/SETUP.md
docs/DEPLOYMENT.md
docs/ADMIN_GUIDE.md
docs/CONTENT_GUIDE.md
docs/MEDIA_GUIDE.md
docs/SEO.md
docs/BACKUP_AND_RECOVERY.md
docs/TROUBLESHOOTING.md
docs/CONTENT_NEEDED.md
```

`ADMIN_GUIDE.md` should be understandable by Sérgio.

---

# 38. ENVIRONMENT

Create `.env.example`.

Expected categories:

- Supabase public URL/key
- server/service credential where required
- Resend
- notification email
- site URL
- Sentry
- analytics
- optional anti-spam values

Never commit real secrets.

---

# 39. TESTING

Prioritize critical logic.

Unit/integration:

- quote validation
- WhatsApp message builder
- project visibility
- testimonial approval filtering
- settings parsing
- SEO helpers
- hero frame ordering/path resolver

Smoke/E2E if practical:

- home loads
- hero frames load
- services works
- quote form submits in test environment
- unauthenticated admin redirect
- mobile menu works

Manual QA:

- Chrome desktop
- Android-sized viewport
- Safari/WebKit if available
- slow network
- reduced motion
- keyboard-only

---

# 40. QUALITY BAR

Before calling the homepage finished, ask:

- Does this feel like a premium architecture/construction studio?
- Does anything feel like a stock template?
- Are there at least 3 truly memorable interaction moments?
- Is there calm space between them?
- Do images move in different, deliberate ways?
- Is the rotating service catalog actually spatial?
- Does the process section feel like one scene rather than six cards?
- Does the hero feel smooth with the supplied frame sequence?
- Does mobile still feel premium?
- Is every claim real?

If the page feels generic, redesign it.

---

# 41. DEFINITION OF DONE

MVP is complete when:

- CASSEMIRO branding is consistent
- no SC branding is used as new identity
- magical/spatial UI is clearly present
- hero frame scrub/fallback works
- rotating service catalog works
- pinned process works
- picture motion treatments exist
- major animations are smooth
- mobile is performant
- reduced motion is complete
- quote form stores lead
- email notification works
- WhatsApp continuation works
- recruitment WhatsApp works
- phone CTA works
- three admins can have separate accounts
- project CMS works
- service CMS works
- testimonial approval works
- pricing toggle exists and defaults hidden
- empty states are elegant
- no fake portfolio/reviews/certifications
- SEO is implemented
- admin is noindex
- security/RLS checked
- monitoring configured
- deployment works
- docs exist

---

# 42. FINAL INSTRUCTION

Do not optimize for the fastest possible template.

Optimize for:

**a premium, magical, memorable public experience + a simple, reliable business backend.**

The site should make visitors feel the craft before they even read every word.

At the same time, never let visual effects obscure the company's real strengths:

- 43+ years of experience
- quality
- efficiency
- integrity
- commitment
- responsibility
- attention to detail
- fair dealing
- respect for deadlines
- careful use of materials

The final reaction should be:

> “This company looks serious. Their work feels thoughtful. I want to contact them.”

---

# 43. LIVE AUDIT REMEDIATION RECORD

The 1 October 2026 `.audit/` reports describe the site at commit `5ed4f02`; they are not a current-state checklist. Track every subsequent fix, its verification, and remaining gates in [docs/AUDIT_REMEDIATION_PROGRESS.md](docs/AUDIT_REMEDIATION_PROGRESS.md). Update that record with each fix before committing it. Later homepage decisions (integrated hero services and the stationary project carousel) supersede older, incompatible scene descriptions above.
