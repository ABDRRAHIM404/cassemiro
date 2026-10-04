# Scroll-led architectural story (V1 history)

V1 is superseded for artwork/rendering by [Construction artwork V2](CONSTRUCTION_ARTWORK_V2.md). The owner approved this story structure but requested clearer construction images and smoother transitions. V1 measurements below are historical, not the current five-image contract.

The six-photo arrow/radio carousel was rejected by the owner. The replacement unfolds automatically through normal vertical scrolling. No old construction frames are used by the hero.

Taste direction: DESIGN_VARIANCE 8, MOTION_INTENSITY 6, VISUAL_DENSITY 3. CASSEMIRO's dark, ivory and bronze palette and established typography are preserved. New architectural artwork is inspired by the verified real project portfolio; it is explicitly illustrative, not a documentary photograph. Sérgio's original photo and all real portfolio images are unchanged.

## Experience

- An opening house visualization accompanies the CMS headline and quote/service links.
- Six naturally scrolling chapters reveal Fundações, Estruturas, Alvenaria, Instalações, Acabamentos and Construção Completa.
- A sticky architectural scene reveals clipped foundation, structural, masonry and installation/roof layers of the generated cutaway, then returns to the finished home. Changing focus and native CSS scroll-driven camera movement keep the house connected to the service story.
- No arrows, radios, scroll interception, canvas, bitmap caches or per-scroll React state are involved. A cleaned-up IntersectionObserver handles only discrete phase changes and older-browser fallback.
- Mobile uses a taller image-led composition with copy below. Reduced motion disables animation and transitions. All six service headings remain in server-rendered HTML without JavaScript or working images.
- The final chapter leads directly to the existing Sérgio section. The rest of the homepage order is preserved.

## Generated assets

Mode: built-in image generation. Real reference: the cover of Residência Contemporânea Linear. Original generated PNGs are retained in the generation workspace; optimized project-bound WebPs are saved under public/images/story/.

| Asset | Desktop bytes | Mobile bytes |
| --- | ---: | ---: |
| house-finished-v1.webp / house-finished-mobile-v1.webp | 162764 | 59996 |
| house-cutaway-v1.webp / house-cutaway-mobile-v1.webp | 147734 | 49214 |

Total illustration file bytes: 310498 desktop, 109210 mobile. These are source totals, not total page transfer or measured performance scores.

### Finished-house prompt

Use case: stylized-concept
Asset type: final website hero architectural visualization, not a UI mockup.
Input images: image 1 is an architectural style/shape reference ONLY, a real CASSEMIRO construction photograph. Generate new artwork; do not edit or retouch that photograph.
Subject: a premium architectural scale model inspired closely by the reference's single-storey Brazilian contemporary residence: clean ivory rectangular volumes, stepped flat parapet roofs, deep projecting garage/carport portico, black slim window frames and warm recessed doorway. Keep a plausible modest residential scale, not a fantasy mansion. Show the whole house, ground slab, slight landscaping, all silhouettes fully inside the canvas.
Style: exceptionally refined realistic 3D architectural maquette, sharp tactile plaster/concrete and black aluminium, editorial premium construction studio.
Camera: three-quarter front-left axonometric perspective, slightly elevated, complete isolated house, horizontal 3:2 canvas. House centred with 15% breathing room on every side, suitable for scaling on both desktop and portrait websites.
Lighting: dramatic soft warm bronze rim light and cool-neutral ivory surfaces, readable details against a dark website.
Background: genuinely transparent, with a restrained soft contact shadow, no sky, no surrounding buildings, no screen/UI.
Constraints: NO text, letters, logos, numbers, labels, watermarks, people, faces, cranes, random ornate details, neon, blue/purple glow. This is illustrative website artwork inspired by a real house, not documentary project photography.

### Cutaway prompt

Use case: stylized-concept
Asset type: final CASSEMIRO website construction-story illustration.
Input image: architectural geometry and camera reference, not documentary photography.
Create a new exploded architectural cutaway maquette of EXACTLY this contemporary Brazilian house: same white stepped flat-roof volumes and projecting garage portico, same camera direction and overall footprint. Show coherent construction layers separated vertically: dark concrete foundation footings and floor slab at bottom, reinforced concrete columns/beams above, partial masonry walls at mid height, restrained copper electrical conduits and plumbing exposed within walls, roof slab floating slightly above. Remove landscaping to make structural elements legible. Construction components must read as one plausible house, not random stacked shapes.
Use sophisticated realistic 3D materials, neutral ivory masonry and charcoal concrete, bronze/copper installation lines and warm rim lighting. Entire model fits horizontal 3:2 canvas with breathing room around every edge. Dark charcoal seamless background matching #11120f. Camera slightly elevated three-quarter front-left; architectural editorial quality.
NO text, logos, watermarks, arrows, people, face, cranes, neon or surrounding buildings. This is conceptual architectural artwork, not a real project photo.

## Acceptance checks

The updated browser scripts test automatic phase selection by scrolling, reverse scrolling, responsive asset requests, readable service headings, no horizontal overflow, visible opening CTA, reduced motion, no-JavaScript service access, and image-failure navigation. Browser and Lighthouse results must be recorded after they have actually run; old carousel measurements are not evidence for this redesign.

## Verification results

- Production build, TypeScript, ESLint and 29 unit tests pass.
- Chromium checks at 1366, 390 and 320 pixels verify automatic chapter changes without clicks, native wheel/touch movement, reverse scrolling, all six headings, correct two-image responsive requests, no old frame requests, no canvas, opening CTA visibility, and reduced motion.
- All six service headings remain readable without JavaScript at all three widths; the real project archive remains accessible. A simulated failure of both illustrations leaves all six services and the founder link usable.
- Regression browser checks at all three widths confirm Sérgio's original image and both real project covers load, no horizontal overflow, trust click/keyboard selection, project arrows/keyboard/drag/touch navigation, and project detail links. No page errors were reported.
- Screenshots exposed a mobile copy/progress overlap; the mobile lower inset was increased and the opening progress marker hidden. Readable copy no longer fades to low-contrast opacity. Offscreen service layout uses native content visibility.
- Local simulated-mobile Lighthouse: initial run 29 performance / 96 accessibility, with a very low host benchmark (11.5) while browser checks were also running. After the contrast/layout fixes and closing the review browser, a sequential run scored 87 performance / 100 accessibility, LCP 3.58 seconds, TBT 218 ms and CLS 0, with host benchmark 1079.5. These runs are not a controlled before/after comparison or production measurements. LCP remains above the 2.5-second target; no blanket speed-target claim is made.
- No new animation dependency, database mutation or deployment was required. Changes remain local until a push is requested.
