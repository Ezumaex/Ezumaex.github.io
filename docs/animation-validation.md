# Animation validation — 4 September 2026

This report supersedes the earlier wireframe report. It separates source diagnosis, browser observations, deterministic tests, and build checks. The generated production build has passed browser testing; live verification is recorded after publication.

## Diagnosis

The baseline hero did not contain a time-driven radar sweep. Its update function only approached pointer-controlled orientation targets; the requestAnimationFrame loop stopped when those targets settled. The lack of continuing movement was therefore explained by missing sweep behavior and input-only scheduling, not an established Three.js download failure.

Separately, `motion.css` explicitly disabled the older decorative orb, status-dot, and role effects. The static CSS/HTML fallback was intentional. The new implementation adds a bounded scan to the WebGL radar and a native animated CSS fallback when Three.js is unavailable.

Operating-system reduced motion and the saved local preference are a different condition: they intentionally disable nonessential motion and select readable HTML/static content. A reduced-motion view is not classified as a renderer error. The source findings and primary documentation are recorded in `docs/animation-research.md`.

## Section-by-section audit

| Area | Implemented behavior | Evidence from this pass |
| --- | --- | --- |
| Hero radar | Semantic skill controls, selected-evidence readout, finite visible-only sweep, restart control, and optional Three.js enhancement | Browser: sweep advanced, settled, and stopped rendering offscreen; mobile Node.js selection worked |
| Project showcase | Selected preview with HTML caption/technology tags, demand-rendered panels, and an ordinary-image fallback | Browser: selection and caption/tag animation worked; mobile gallery swap and missing-Three.js fallback switching worked |
| Skill evidence | Existing JSON evidence connects skills with projects, professional work, or learning without proficiency scores | Browser: Java remained learning-only with no fabricated featured-project match; reduced-mode Networking readout was correct |
| Certificate explorer | Large original-image preview, original/verification links, searchable choices, and selected credential details | Browser: preview contained; Java returned three results, an unmatched query returned none, and clearing restored nine |
| Experience and contributions | Scroll-activated markers and native disclosure controls retain their underlying content | Source audit: progressive DOM enhancement; no separate browser completion claim for every disclosure in this pass |
| Summary and education | Staggered content/card entrances and expanding section rules | Production browser: 6 observed motion targets in Summary and 2 in Education |
| Résumé and contact | Document-frame entrance, stable PDF, staggered contact links and arrow feedback | Production browser: 2 résumé and 7 contact motion targets; PDF served successfully |
| Navigation | Observer-driven current-section state and transform-based reading progress | Production browser: correct current link for all nine content sections |
| Motion lifecycle | Reduced-motion/static state, visibility pauses, bounded scanning, resize handling, and resource cleanup | Browser observations plus deterministic lifecycle suites; see scope below |

## Local browser observations

Checks used the available Chromium-based desktop browser and responsive viewport overrides. They are not physical-device or cross-browser certification.

- The visible WebGL radar reported a sweep angle of 65.7 degrees at 323 ms, then settled at 90 degrees after the full 4,800 ms scan. Its frame counter stopped when offscreen.
- Recorded radar diagnostics showed 356 frames, approximately 75 active FPS, six draw calls, five geometries, and zero textures. These are observations from this environment, not guaranteed performance on other hardware.
- Project selection changed the preview and animated its HTML caption and technology tags. Mobile Node.js selection and gallery switching worked.
- The certificate preview remained within a 432 px frame, with a 384 px image in the checked layout. Search produced three Java results, zero results for an unmatched query, and nine after clearing.
- The exercised reduced-motion mode hid 3D canvases while preserving the correct Networking HTML evidence. This verifies that reduced-mode path, not a physical operating-system settings change.
- With Three.js unavailable, the CSS fallback's changing transform matrices demonstrated scan movement; project fallback-image switching remained functional.
- Normal routes produced no observed browser errors. Intentional failure routes are a separate test condition.

### Responsive layout

Each measured content width was 15 px narrower than the requested viewport because of the scrollbar. No horizontal overflow was observed at any of these widths.

| Requested viewport width | Measured content width | Horizontal overflow |
| --- | --- | --- |
| 1440 px | 1425 px | None |
| 1024 px | 1009 px | None |
| 800 px | 785 px | None |
| 768 px | 753 px | None |
| 480 px | 465 px | None |
| 375 px | 360 px | None |
| 320 px | 305 px | None |

## Deterministic and build checks

- Twelve deterministic suites passed, covering hidden/offscreen scheduling, reduced motion, back-forward-cache lifecycle, cleanup, resize, preview readiness, and error handling. These are isolated lifecycle checks, not measurements of real tab hiding or browser history restoration.
- Build checks covered 39 static files, successful HTTP checks at both the site root and a project-style prefix, repeat builds, and ownership-safety guards.

## Production-build browser checks

The exact generated `dist/` output was served at `http://127.0.0.1:4174/portfolio/`, exercising a project-style deployment prefix without changing source paths.

- Three.js initialized and the radar scanned after entering the viewport. Offscreen initialization correctly drew zero frames.
- Project selection and ArrowLeft navigation updated the selected project and retained keyboard focus. The native implementation disclosure opened with Enter.
- The collaborative contribution disclosure opened and displayed the original verified export contribution text. No organization repository was edited.
- Certificate search returned three Java credentials; End selected the last matching credential and the correct original image. The full-library dialog opened and closed with Escape.
- All nine major content sections were visible and had active motion targets; navigation mapped Summary/Skills to Overview, Education to Experience, and the remaining sections to their matching links. The experience marker activated on entry.
- Intentional missing-data tests retained all nine original-certificate links while typing. No-JavaScript output retained two projects, one collaboration, all nine certificates, visible navigation, and the résumé.
- Intentional unsupported-WebGL output preserved the radar and Networking evidence in HTML. This fault fixture can produce an expected Three.js context-creation diagnostic; it is not a normal-route production error.
- The résumé returned HTTP 200 with `application/pdf`; certificate originals, preview textures, JSON, and relative Three.js modules loaded successfully under `/portfolio/`.

The live tab previously recorded a `MutationObserver.observe` TypeError. The new DOM animation module uses explicit content-render events and IntersectionObserver instead; no MutationObserver remains in the first-party scripts. A refreshed live-page check is required before attributing or closing the reported error.

## Pending verification and limits

- **Pending:** live deployment verification on GitHub Pages.
- Firefox and physical-device testing were unavailable. No Firefox, real-touch-device, GPU utilization, battery, thermal, or hardware frame-pacing claims are made.
- Results from the previous report are not carried forward as proof of this implementation. Additional browser checks should be recorded with their actual scope before marking the pending items complete.
