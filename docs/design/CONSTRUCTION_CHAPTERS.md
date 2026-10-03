# Lightweight construction chapters

The owner approved replacing scroll-controlled frame playback with six photographic chapters. The original construction imagery, Portuguese copy, brand colors, fonts, CMS hero content, navigation, and subsequent homepage sections remain intact.

Taste direction: redesign-preserve, native CSS editorial composition. DESIGN_VARIANCE: 7, MOTION_INTENSITY: 4, VISUAL_DENSITY: 4. Existing bronze/ivory and DM Serif Display are deliberate brand constraints.

## Interaction

- Six photographs represent Fundações, Estruturas, Alvenaria, Instalações, Acabamentos, and Construção Completa.
- Native radio selectors switch the matching image and service caption.
- Arrows, horizontal drag/swipe, and keyboard navigation explore chapters.
- Vertical scrolling stays native and proceeds directly to Sérgio. There are no frame holds or wheel interception.
- A short CSS curtain transition communicates chapter changes. Reduced motion removes it entirely.
- Without JavaScript, native selectors still switch photographs and captions. Arrows are hidden.
- Failed images do not prevent reading the services or continuing through the page.

## Performance contract

Only six original WebP photographs are selectable. The responsive picture source chooses the mobile or desktop asset, never both for one viewport. The first image is eager/high priority; hidden chapters are lazy. There is no canvas, bitmap cache, full-timeline import, animation library, auto-play, continuous pointer state, or scroll listener in the new hero.

The six source files total about 424 KiB on desktop and 145 KiB on mobile, compared with the complete 190-frame source sets of approximately 14.3 MiB and 4.9 MiB. These are source asset totals, not measured initial-load bytes or whole-page metrics.

Original frame assets and optimization tools remain available for archival use. Historical frame-hold verification scripts describe the retired experience and are not acceptance tests for this replacement.

Implementation: `Hero.tsx`, `ConstructionChapters.tsx`, their CSS modules, and `src/config/construction-chapters.ts`.

## Verification

- Production build, TypeScript, ESLint, and 29 unit tests pass.
- Chromium checks at 1366, 390, and 320 pixels verify six matching chapters, one initially requested hero image, six maximum requested hero images, correct responsive source selection, arrows, native radio keyboard navigation, mouse dragging, real touch swiping, normal vertical touch/wheel scrolling, and reduced motion.
- Native selectors work without JavaScript at all three widths. A simulated image 404 leaves the service readable and allows navigation to the next photograph.
- The opening photo is about 117 KiB desktop or 38 KiB mobile. These are original file sizes, not whole-page transfer totals.
- Two local simulated-mobile Lighthouse runs scored 90 and 79 for performance, and 100 for accessibility, with zero CLS. LCP was 2.8/2.7 seconds and TBT 290/720 ms. These variable workstation results are not production measurements and do not establish that all homepage performance targets are met.
- The old bitmap renderer, unused timeline adapter, global frame styles, and early wheel interception were removed. Original image assets were not deleted; deleted source code remains recoverable through Git history.
- Changes are local only until the owner requests a push/deployment.
