# Animation validation — 3 September 2026

## Delivered behavior

- Two isolated Three.js scenes: interactive hero wireframe and layered project previews.
- Project selection through buttons, keyboard arrows/Home/End, and optional horizontal drag/swipe. Native vertical scrolling and pinch zoom are not intercepted.
- Skill-to-project filtering based on existing evidence URLs; non-project evidence is not fabricated.
- Lightweight card entrances, disclosure transitions, certificate-dialog entrance, navigation and hover feedback.
- Static HTML project, collaboration, and certificate fallbacks; original certificate links outside the dialog.
- OS reduced motion plus a device-local footer preference; no new tracking or personal data.
- Existing GitHub Pages architecture, résumé file, credential records, and repository visibility preserved.

## Browser checks

Tested in the available desktop Chromium-based browser with viewport overrides. These are responsive-layout tests, not physical-device benchmarks.

| Requested width | Horizontal overflow | Canvas contained | Gallery touch targets |
| --- | --- | --- | --- |
| 1920 | None | Yes | At least 44 px |
| 1440 | None | Yes | At least 44 px |
| 1024 | None | Yes | At least 44 px |
| 768 | None | Yes | At least 44 px |
| 430 | None | Yes | At least 44 px |
| 390 | None | Yes | At least 44 px |

Checks passed:

- Previous/next selection; arrow-key navigation and focus retention; optional pointer drag.
- React selects SmartEco-Column; Java reports no matching featured project; clearing the filter restores both projects.
- Native project details open/close with click and Enter.
- Certificate search for Java returns three results in the full library; AI category returns one after clearing search.
- Certificate preview opens the correct original and closes with Escape.
- Motion disabled: static project image remains visible and project selection still works.
- Repeated motion disable/re-enable restores WebGL successfully.
- Missing Three.js and unsupported WebGL: static gallery and buttons continue working.
- Failed JSON: saved certificate links survive typing into search on both pages.
- No-script route: two projects, one collaboration, nine certificate originals, visible mobile navigation, and visible résumé content.
- Résumé PDF responds with HTTP 200 and application/pdf. Static validator checks 73 local resource references and all page anchors.

## Performance observations

- Active interactions measured approximately 70–75 FPS in this environment, not a universal hardware guarantee.
- Settled frame counters stop; offscreen scenes stop rendering. Deterministic lifecycle tests verify cancellation while hidden, no hidden/offscreen scheduling, adaptive DPR, and resource disposal.
- Hero: five draw calls, five small geometries, no textures.
- Project gallery: four draw calls/two textures on desktop; two draw calls/one texture in compact mode.
- Estimated uncompressed texture allocation including mipmaps: approximately 5.39 MiB desktop and 2.46–2.93 MiB compact.
- Observed page JS heap was approximately 51–54 MiB; this includes the page and Three.js and is not isolated GPU memory.
- Two optimized preview images total 44,114 bytes.
- Vendored Three.js modules total 750,938 bytes minified, approximately 189,048 bytes gzip. They are lazy enhancements, not blocking scripts.
- Core HTML/CSS/JS was approximately 109 KB raw / 29 KB gzip at validation. Fonts, JSON, certificate originals, and résumé are separate.

GPU utilization, battery drain, thermal behavior, and real-device touch/frame pacing cannot be measured with this browser surface. The browser also keeps background test tabs logically visible, so hidden-tab behavior was verified through the deterministic lifecycle test rather than claimed as a real tab-visibility measurement.

## Repeatable checks

```text
node scripts/validate.mjs
node scripts/test-motion.mjs
python scripts/serve.py
```

The local fault routes and motion overrides are documented in the README. No approvals were needed for repository visibility or deletion because neither was changed.
