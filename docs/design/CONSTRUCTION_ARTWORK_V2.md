# Clearer construction-stage illustrations

The owner approved the scroll-led story and requested clearer imagery with smoother transitions. V2 preserves the story, copy, finished-house illustration, brand and scroll timing. It replaces the horizontally clipped exploded cutaway with four complete stage illustrations.

## Rendering

- Five source illustrations: finished home, foundations, structural frame, masonry, installations. Finishing and final delivery use the approved finished home, with only a restrained detail-scale adjustment.
- Entire images use object-fit contain. No horizontal clipping bands, radial image masks or oversized camera zooms obscure the construction.
- Shared framing and gentle scroll-driven opacity crossfades connect the stages. Fallback browsers use 900 ms opacity transitions. No blur filters, frame playback, scroll interception or per-scroll React state.
- Mobile keeps the complete footprint visible and moves the illustration with a transform rather than abruptly changing its layout dimensions. The hero grid has an explicitly bounded column so cached offscreen content cannot force a wider layout after resizing.
- Reduced motion keeps phase selection but removes animated transitions and camera movement. All service headings and navigation remain available without images or JavaScript.

## Assets and generation

Mode: built-in image generation with the approved finished-house PNG as geometry/camera/style reference. Illustrations are conceptual, not engineering drawings or real project photos. Sérgio and the real portfolio are untouched.

New assets in public/images/story/:

- house-foundation-v2.webp (161906 bytes); house-foundation-mobile-v2.webp (53696 bytes)
- house-structure-v2.webp (117706 bytes); house-structure-mobile-v2.webp (47802 bytes)
- house-walls-v2.webp (126922 bytes); house-walls-mobile-v2.webp (45574 bytes)
- house-installations-v2.webp (130968 bytes); house-installations-mobile-v2.webp (51508 bytes)

The original house-finished-v1.webp and mobile version are retained unchanged. Total active illustration source bytes: 700266 desktop, 258576 mobile. These are five-image asset totals, not whole-page transfer measurements. Clearer distinct stages cost more than V1's two illustrations but remain bounded; old full frame sequences are not loaded. Original generated PNGs remain at their generation paths; project-bound optimized WebPs are versioned alongside V1, not destructive overwrites.

## Prompt set

## foundation

Use case: stylized-concept
Asset type: final architectural construction-stage website illustration.
Image 1: geometry/camera/style reference ONLY; generate new stage artwork for this same house, not documentary photography.
Primary request: Only the foundation stage: an exposed continuous concrete footing grid and isolated pads with short starter rebar, supporting a clearly defined ground slab perimeter. Show earth in shallow cutaway below the footings. NO full-height columns, walls, roof, doors, furnishings or landscaping.
Preserve the house's single-storey rectangular footprint, stepped flat parapet arrangement, projecting rectangular front garage/carport portico and contemporary Brazilian residential scale from the reference. Maintain exactly the reference's three-quarter front-left camera direction, horizontal 3:2 canvas, ground plane and overall scale. Entire model fully visible with at least 12% clear margin on all sides; do not crop anything. Keep footprint anchored centrally at the same position for seamless website crossfades.
Style: precise premium realistic architectural maquette, simplified coherent construction geometry, crisp readable edges, medium bright ivory/concrete surfaces, warm bronze highlights, balanced diffuse studio lighting so every important element reads on a dark website even at phone size. No dark crushed shadows, busy construction clutter, fog, tiny illegible parts, technical labels or surrounding scenery.
Background: genuinely transparent with restrained contact shadow. No text, letters, logos, people, watermarks, sky or other houses. Conceptual construction illustration, not an engineering drawing or real project photograph.

## structure

Use case: stylized-concept
Asset type: final architectural construction-stage website illustration.
Image 1: geometry/camera/style reference ONLY; generate new stage artwork for this same house, not documentary photography.
Primary request: Only the structural stage: same footing/slab footprint, full-height reinforced concrete columns and connecting perimeter beams clearly defining the garage portico and flat-roof volumes. Open skeletal single-storey frame. NO masonry walls, finished facade, glazing, doors, landscaping or second storey.
Preserve the house's single-storey rectangular footprint, stepped flat parapet arrangement, projecting rectangular front garage/carport portico and contemporary Brazilian residential scale from the reference. Maintain exactly the reference's three-quarter front-left camera direction, horizontal 3:2 canvas, ground plane and overall scale. Entire model fully visible with at least 12% clear margin on all sides; do not crop anything. Keep footprint anchored centrally at the same position for seamless website crossfades.
Style: precise premium realistic architectural maquette, simplified coherent construction geometry, crisp readable edges, medium bright ivory/concrete surfaces, warm bronze highlights, balanced diffuse studio lighting so every important element reads on a dark website even at phone size. No dark crushed shadows, busy construction clutter, fog, tiny illegible parts, technical labels or surrounding scenery.
Background: genuinely transparent with restrained contact shadow. No text, letters, logos, people, watermarks, sky or other houses. Conceptual construction illustration, not an engineering drawing or real project photograph.

## walls

Use case: stylized-concept
Asset type: final architectural construction-stage website illustration.
Image 1: geometry/camera/style reference ONLY; generate new stage artwork for this same house, not documentary photography.
Primary request: The masonry stage: the SAME structural frame and slab now filled with pale concrete block walls, with correctly aligned door and window openings and open garage portico. Unfinished raw masonry and concrete, NO finished plaster, roof floating in air, landscaping or second storey.
Preserve the house's single-storey rectangular footprint, stepped flat parapet arrangement, projecting rectangular front garage/carport portico and contemporary Brazilian residential scale from the reference. Maintain exactly the reference's three-quarter front-left camera direction, horizontal 3:2 canvas, ground plane and overall scale. Entire model fully visible with at least 12% clear margin on all sides; do not crop anything. Keep footprint anchored centrally at the same position for seamless website crossfades.
Style: precise premium realistic architectural maquette, simplified coherent construction geometry, crisp readable edges, medium bright ivory/concrete surfaces, warm bronze highlights, balanced diffuse studio lighting so every important element reads on a dark website even at phone size. No dark crushed shadows, busy construction clutter, fog, tiny illegible parts, technical labels or surrounding scenery.
Background: genuinely transparent with restrained contact shadow. No text, letters, logos, people, watermarks, sky or other houses. Conceptual construction illustration, not an engineering drawing or real project photograph.

## installations

Use case: stylized-concept
Asset type: final architectural construction-stage website illustration.
Image 1: geometry/camera/style reference ONLY; generate new stage artwork for this same house, not documentary photography.
Primary request: The installations stage: same single-storey house structure with a restrained architectural cutaway removing a few front masonry surfaces to show copper-toned electrical conduits and neutral grey plumbing clearly routed through wall channels and floor, small electrical boxes. Keep most masonry for spatial context. NO neon glowing pipes, finished decorative walls, exploded floating storeys, landscaping or second storey.
Preserve the house's single-storey rectangular footprint, stepped flat parapet arrangement, projecting rectangular front garage/carport portico and contemporary Brazilian residential scale from the reference. Maintain exactly the reference's three-quarter front-left camera direction, horizontal 3:2 canvas, ground plane and overall scale. Entire model fully visible with at least 12% clear margin on all sides; do not crop anything. Keep footprint anchored centrally at the same position for seamless website crossfades.
Style: precise premium realistic architectural maquette, simplified coherent construction geometry, crisp readable edges, medium bright ivory/concrete surfaces, warm bronze highlights, balanced diffuse studio lighting so every important element reads on a dark website even at phone size. No dark crushed shadows, busy construction clutter, fog, tiny illegible parts, technical labels or surrounding scenery.
Background: genuinely transparent with restrained contact shadow. No text, letters, logos, people, watermarks, sky or other houses. Conceptual construction illustration, not an engineering drawing or real project photograph.

## Verification

Verified against the local production build:

- `npm run build`, `npm test` (30 tests) and `npm run lint` pass.
- `check-construction-chapters.js` passes at 1366, 390 and 320 px: all six services show matching unclipped artwork, forward/reverse and native wheel/touch scrolling work, CTAs remain visible, reduced motion works, and only the five responsive illustrations are requested (no old frame sequence). No horizontal overflow or page errors.
- `check-construction-transitions.js` confirms a continuous foundation/structure midpoint blend (0.500535 / 0.499465 opacity). Desktop-to-phone resize produces a 390 px page and artwork bounds of 0–390 px.
- `check-home-fallback.js` passes without JavaScript at all three widths; all six headings and portfolio navigation remain usable.
- `check-construction-failure.js` passes with every story image returning 404; all six services and founder navigation remain usable.
- Desktop foundation and phone opening, structure and installations screenshots were visually inspected for clarity, composition and copy overlap. Screenshots are under `.codex/audits/redesign/current/`.

These are local checks, not a production deployment or a new Lighthouse measurement.
