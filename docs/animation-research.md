# Animation research and source audit

Date: 3 September 2026. Baseline commit inspected: `15c51a2c4f2f69a1ffc733b01a124dfd63775d3b`.

## Scope and evidence limits

This note records source inspection and primary-documentation research for improving the existing portfolio's animation. It is not a browser test report, deployment check, or statement that the resulting implementation passes validation. Findings below describe the baseline, before this task's changes.

The inspected stack is plain HTML, CSS, JavaScript, JSON, and locally vendored Three.js 0.185.1. The repository has no Vite configuration or package/build step. No additional animation framework is required for the proposed behavior.

The official example linked below was reachable during research, but was not executed in a browser as part of this audit. Existing results in `docs/animation-validation.md` belong to their stated tested scope; they do not verify changes made after that report.

## Baseline findings: why motion can appear absent

1. **The hero is deliberately interaction-driven, not a radar sweep.** In `js/three-scenes.js`, `heroScene()` assigns `view.update` to `pointer.update(alpha)`. `DemandScene.draw()` schedules another frame only while that update reports movement. Once the target orientation is reached, rendering stops. There is no time-driven sweep in that baseline hero. If continuous visible radar movement is the desired result, it must be implemented; it is not an existing animation that a missing dependency would restore.
2. **Several decorative CSS animations are explicitly disabled.** `motion.css` sets `animation: none` on `.network-orb`, `.status-dot`, and `.hero-role span::after`; the role pseudo-element is also hidden. This directly explains why those effects do not run, independently of Three.js loading.
3. **Reduced motion intentionally selects static content.** `js/motion-preference.js` combines the operating-system preference with the saved `portfolio-reduce-motion` setting. `DemandScene` refuses initialization/rendering when motion is disabled, while `.motion-off` and the reduced-motion media query hide canvases and reveal fallbacks. Diagnose this state before treating a static view as failure; do not override a visitor's accessibility setting in production.
4. **Existing DOM motion is short and event-based.** `js/motion.js` reveals observed cards once, then unobserves them. Disclosures and skill panels animate on interaction. These effects do not imply persistent movement while the page sits idle.
5. **A broken dependency or deployment path was not established.** `index.html` loads the scene entry as a module using a relative URL, and `three-scenes.js` imports `./vendor/three-r185/three.module.min.js`. The local vendor directory contains both Three.js modules. Import/renderer failures select the static fallback, so appearance alone cannot distinguish a successful static state from a runtime failure. Network and console inspection are still needed to establish a production loading fault.

## Implementation guidance

### Responsive Three.js and a visible-only sweep

Keep the existing demand-rendering behavior for settled project previews. Give the hero an explicit animated-state condition: request another frame while its sweep is active, its host intersects the viewport, the document is visible, and motion is allowed. Maintain a single pending frame request; cancel it on pause/disposal. Use elapsed time rather than a fixed rotation increment per frame, and reset the previous timestamp on resume to avoid a large jump. Static fallback content must remain available when WebGL is unavailable or motion is reduced.

This separates a continuously changing scene from an interaction-only scene, consistent with the [Three.js rendering-on-demand guidance](https://threejs.org/manual/en/rendering-on-demand.html). The [official demand-rendering example with damping](https://threejs.org/manual/examples/render-on-demand-w-damping.html) demonstrates guarded frame scheduling; it is a scheduling reference, not a radar implementation.

Let CSS determine the displayed canvas size. Update drawing-buffer dimensions only when needed, using `renderer.setSize(width, height, false)`, then update camera aspect and projection. Retain a bounded rendering resolution for high-DPI/mobile screens; do not increase resolution merely to make motion more noticeable. The [Three.js responsive-design manual](https://threejs.org/manual/en/responsive.html) explains display size versus drawing-buffer size and maximum-pixel limits.

### DOM motion and accessibility

Use [Intersection Observer](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API) to start entrances and manage viewport-dependent work. Keep observer callbacks small. One-shot content entrances can unobserve completed targets; an ongoing hero must continue receiving visibility transitions.

Use the browser's [Element.animate() API](https://developer.mozilla.org/en-US/docs/Web/API/Element/animate) for short opacity/transform transitions. Keep the normal HTML visible by default, feature-detect optional animation APIs, and store animation handles where cancellation is required. Avoid multiple entrance systems animating the same target at once.

Honor [prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion) in both CSS and JavaScript, including preference changes during a session. Recommended reduced state: static radar/fallback, no parallax or tilt, immediately readable reveal content, and functional navigation/project/certificate controls. A failed animation must never hide essential content.

### GitHub Pages paths; Vite comparison only

Browser [ES module imports](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import) resolve from the importing module's URL. Preserve explicit `.js` filenames and module-relative `./` or `../` paths. A leading `/` resolves from the origin root, which can bypass a project site's repository subpath. Bare import names require an import map or a build tool; this portfolio already uses a local relative import.

[GitHub Pages site types](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages) distinguish a user site at `https://<owner>.github.io/` from a project site at `https://<owner>.github.io/<repository>/`. This repository is the `Ezumaex.github.io` user site. Its present relative entry/module URLs do not justify adding a repository-name prefix. Test any future subpath copy separately, including JSON, images, stylesheets, and nested module imports.

For comparison, [Vite's official static-deployment guide](https://vite.dev/guide/static-deploy.html#github-pages) specifies `base: '/'` (the default) for a user-site root/custom-domain root and `base: '/<REPO>/'` for a project site. Those settings apply to Vite-generated builds. They are **not applicable to this zero-build vanilla stack**; adding `vite.config.js` would not repair browser-native paths by itself. Do not introduce a bundler or change Pages publishing configuration for this animation task.

## Checks still required after implementation

- Inspect browser console and network responses for the entry scripts, nested Three.js import, JSON, stylesheets, and textures; source-file presence is not an HTTP/MIME/CORS check.
- Observe the visible hero long enough to confirm sweep progression without pointer input. Verify that offscreen/hidden motion pauses and resumes without duplicate loops or time jumps.
- Confirm project previews stop when settled and continue working through pointer, keyboard, touch, resize, and selection changes.
- Exercise OS reduced motion and the local preference, including toggling while animation is active. Confirm static content and all controls remain usable.
- Check desktop/mobile layouts, no-JavaScript and no-WebGL fallbacks, and failed optional-module loading. Verify readable content throughout.
- Run the repository's relevant static/lifecycle checks and record actual browser results separately. Do not infer frame rate, GPU utilization, battery use, or physical-device performance from this source audit.
