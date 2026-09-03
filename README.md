# Joerelle Jay P. Bisnar — Portfolio

A lightweight, accessible portfolio for [Joerelle Jay P. Bisnar](https://github.com/Ezumaex), hosted at [ezumaex.github.io](https://ezumaex.github.io/). It presents selected projects, technical experience, education, verified certifications, and a public résumé in an editorial résumé-and-developer-dashboard layout.

The site uses plain HTML, CSS, JavaScript, and JSON, with locally vendored Three.js for progressive 3D enhancement. No framework, package installation, or runtime server is required. An optional Node.js command validates and packages the public files into `dist/` for production testing; GitHub Pages still publishes the static files directly from `main` at the repository root. The résumé, project links, and certificate originals remain readable without WebGL or JavaScript.

## Repository map

```text
.
├── index.html                         # Main portfolio page
├── certifications.html                # Searchable certificate library
├── 404.html                            # GitHub Pages not-found page
├── styles.css                          # Shared visual system and responsive styles
├── js/
│   ├── site.js                         # Navigation, interactions, and home-page data rendering
│   ├── hero-profile.js                 # Pausable rotating titles, with reduced-motion text changes
│   ├── certificates.js                 # Full-library search, filters, and certificate dialog
│   ├── certificate-explorer.js         # Home-page certificate list and large selected preview
│   ├── motion-preference.js            # OS preference and optional local motion setting
│   ├── motion.js                       # Native DOM transitions and motion control
│   ├── showcase.js                     # Accessible project selector, independent of WebGL
│   ├── radar.js                        # Evidence-backed skill nodes and bounded HTML fallback scan
│   ├── three-scenes.js                 # Lazy bounded radar and demand-rendered project scenes
│   └── vendor/three-r185/              # Pinned Three.js 0.185.1 modules and MIT license
├── motion.css                         # Progressive motion and responsive 3D layout
├── scripts/                           # Validation, static packaging, preview, and fallback maintenance
├── data/
│   ├── projects.json                   # Project content
│   ├── certificates.json               # Certificate content
│   ├── skills.json                     # Skill-to-evidence content
│   └── contributions.json              # Verified collaborative work
└── assets/
    ├── certificates/                   # Certificate images
    ├── images/                          # Social image and favicon
    └── resume/
        └── joerelle-jay-bisnar-resume.pdf
```

## Preview locally

The pages load JSON with `fetch`, so opening `index.html` directly from the filesystem may not work. Start a small local server from the repository root instead:

```bash
python scripts/serve.py
```

Then open [http://127.0.0.1:4173/](http://127.0.0.1:4173/). No dependency installation is required. The preview server binds only to localhost and disables caching; it is development tooling, not part of the deployed site.

## Replace the portrait placeholder

1. Add your own square headshot to `assets/images/`, for example `profile-photo.webp` (at least 400 × 400 pixels).
2. In `index.html`, find `class="profile-photo"` and change the image `src` to `assets/images/profile-photo.webp` and its `alt` to `Portrait of Joerelle Jay P. Bisnar`.
3. Remove the `Photo coming soon` caption. The circular frame and face-friendly crop stay in place; adjust `object-position` in `.profile-photo img` in `motion.css` if needed.

The current neutral avatar is intentionally a placeholder, not a generated or stock portrait. No personal image is fabricated. The four rotating titles are maintained in `js/hero-profile.js`; keep the accessible summary and longest-title sizing text in `index.html` aligned if you edit them. Titles type and erase with full motion, switch complete words with reduced motion, and can always be paused. They stop updating while offscreen or in a hidden tab. Without JavaScript the first title remains readable.

## Add or update a project

Edit `data/projects.json`. Each item follows this shape:

```json
{
  "name": "Project name",
  "subtitle": "Short project positioning line",
  "status": "Active",
  "context": "IoT system",
  "description": "A concise, evidence-based explanation of the project.",
  "technologies": ["React", "Node.js"],
  "repository": "https://github.com/Ezumaex/repository-name",
  "liveDemo": "",
  "image": "assets/images/project-preview.png",
  "previewImage": "assets/images/project-preview.webp",
  "imageAlt": "Concise description of the project screenshot",
  "featured": true,
  "architecture": "Client → service → database",
  "highlights": ["Specific implementation detail supported by the repository"],
  "note": "An honest limitation, status note, or maintenance detail"
}
```

- Set `featured` to `true` to show the project on the home page.
- Leave `liveDemo` as an empty string when no public demo exists.
- Use an empty `image` string when there is no genuine project screenshot yet.
- Optional `previewImage` is the small image used for 3D. Prefer WebP, at most 960 pixels wide. Without it, the gallery uses `image`. Keep the normal image and its description truthful; the portfolio's existing cover artwork is not presented as an application screenshot.
- Use only technologies and outcomes that are supported by the repository.
- Keep `highlights`, `architecture`, and `note` evidence-based; these fields power the expandable project details.
- Keep JSON valid: double-quote strings and separate items with commas.

After the updated JSON and assets are published, featured records automatically populate the project list, large preview, technology labels, and implementation panels on the next page load. There is no separate gallery list to maintain. Run `node scripts/sync-fallbacks.mjs` after content changes to refresh the saved no-JavaScript HTML before validation or packaging.

## Add a certificate

1. Export or download the certificate as a clear PNG or JPG. Optionally keep its public PDF as well.
2. Give it a short lowercase filename, such as `cloud-fundamentals.png`.
3. Put the image in `assets/certificates/`.
   If there is a PDF, put it in the same directory and enter its path in the `pdf` field.
4. Add a matching record to `data/certificates.json`:

```json
{
  "id": "cloud-fundamentals",
  "title": "Cloud Fundamentals",
  "issuer": "Issuer name",
  "issued": "2026-09-01",
  "displayDate": "September 2026",
  "category": "Cloud",
  "image": "assets/certificates/cloud-fundamentals.png",
  "pdf": "",
  "credentialId": "credential-id-if-provided",
  "credentialUrl": "https://example.com/verify",
  "description": "A short factual description of what the course or assessment covered.",
  "skills": ["Cloud computing"]
}
```

Use `YYYY-MM-DD` for `issued` so newest certificates sort first. If there is no public credential page or credential ID, use an empty string rather than inventing one. The same record automatically appears in the searchable home-page explorer, its large selected preview, and the full certificate library on the next page load after publishing; `category` powers the full-library filter. Search results, counts, preview metadata, and original-file links are generated from this JSON, not maintained as separate cards. Run `node scripts/sync-fallbacks.mjs` after content changes to keep the saved no-JavaScript links current too.

## Add verified collaborative work

Organization and collaborator-owned repositories are evidence sources only. Never change their code, documentation, branches, settings, issues, or pull requests for portfolio cleanup.

Add an entry to `data/contributions.json` only after your role is supported by commits, pull requests, assigned issues, a team record, or another reliable source. Use this shape:

```json
{
  "name": "Project name",
  "organization": "Repository owner",
  "projectType": "Team project · contributor",
  "role": "Verified neutral role",
  "period": "2026",
  "description": "Short project context without implying sole ownership.",
  "contributions": ["Specific contribution supported by evidence"],
  "technologies": ["Technology actually used"],
  "repository": "https://github.com/owner/repository",
  "liveDemo": "",
  "evidenceUrl": "https://github.com/owner/repository/pull/1"
}
```

If the contribution cannot be verified, leave it out. Improve its presentation here rather than modifying the organization repository.

## Update skill evidence

Edit `data/skills.json` to connect a skill to factual evidence. Records can include:

- `personal` for personally owned repositories
- `experience` for verified collaborative or professional work
- `learning` for certificates and training

Each evidence item has a `title`, a concise `detail`, and an optional `url`. Do not use an organization repository as evidence until your contribution to it is verified.

## Replace the résumé

Export the new public résumé as PDF and replace:

```text
assets/resume/joerelle-jay-bisnar-resume.pdf
```

Keep that exact filename so existing view and download links continue to work. Before publishing, confirm that the public copy does not expose a private phone number, home address, signatures, or other unnecessary personal information.

## Update profile content

- Edit `index.html` for the biography, experience, education, skills, contact links, or page metadata.
- Edit `data/projects.json` for portfolio projects.
- Edit `data/certificates.json` and `assets/certificates/` for credentials.
- Replace `assets/images/og.png` to update the social-sharing preview. Keep the image near a 1.91:1 aspect ratio (for example, 1200 × 630).
- Update `sitemap.xml` when adding another public HTML page.

Never commit passwords, API keys, tokens, private `.env` files, database credentials, or private contact details.

## Validate changes

Before publishing:

1. Run the local server and open both `/` and `/certifications.html`.
2. Check the layout at desktop and mobile widths.
3. Search and select certificates in the home-page explorer, then search, filter, open, and close a preview in the full library.
4. Expand each project implementation panel.
5. Open every project, credential, social, résumé, and navigation link.
6. Confirm `data/projects.json`, `data/certificates.json`, `data/skills.json`, and `data/contributions.json` parse as valid JSON.
7. Check keyboard navigation, visible focus states, image alt text, and reduced-motion behavior.
8. Confirm the browser console has no errors.

## Deploy with GitHub Pages

### Motion and 3D maintenance

- The hero is a monochrome radar with concentric rings, a moving sweep, detected points, and pointer-reactive depth. Its first visible scan is bounded: 4.8 seconds on desktop or 3.6 seconds in compact/coarse-pointer mode, then it rests. Click or tap a skill node or use **Run scan** to repeat it. Hidden-tab and offscreen time do not consume the visible scan; there is no permanent idle loop.
- Radar nodes map to real records in `data/skills.json`: React, Node.js, ESP32 & MQTT, VB.NET & SQL Server, Networking, and Java. Their positions are visual composition, not proficiency levels. Hover or keyboard focus previews each skill in the radar readout; clicking connects it to related projects or the Skills section and restarts the finite scan. Keyboard arrows/Home/End, touch, and reduced-motion access remain available. In reduced-motion mode hover still changes the selected evidence without movement. If WebGL cannot load, a bounded HTML sweep preserves the visual identity and the same controls.
- The project showcase uses the same featured projects in `data/projects.json`. Its project list controls a large layered preview with animated captions, numbers, technology labels, and related-card highlights. Selection, arrow buttons, keyboard arrows/Home/End, and optional horizontal swipes work without Three.js; the implementation link opens the matching details. Normal vertical scrolling and pinch zoom remain native.
- Skill filtering matches the verified repository URLs in `data/skills.json`. Java currently has learning evidence, not a featured project; the gallery says so.
- The home-page certificate explorer pairs a searchable list with a large preview and animated credential details. Arrow keys/Home/End change selection; original and verification links remain ordinary links. The full library retains search, category filtering, and its accessible preview dialog. Certificates use native DOM transitions, not WebGL.
- Section entrances cover the summary, skills, education, résumé, and contact links. Experience markers and the timeline activate as they enter view. Collaborative work uses expandable, verified contribution areas with scroll feedback—not invented milestone dates, proficiency scores, or completion percentages. Organization repositories remain read-only evidence sources.
- The footer's **Reduce motion** preference is stored on the visitor's device. An operating-system reduced-motion preference always takes precedence. Reduced motion stops the scans and visual transitions while preserving all content and controls.
- Three.js is imported only when a scene approaches the viewport. The radar renders during its finite scan or pointer settling; project panels render during interaction or settling. Both stop offscreen or while the tab is hidden. Mobile uses one preview texture and a lower pixel ratio; sustained slow rendering lowers resolution further or falls back to HTML content.
- No shadows, postprocessing, animation framework, trackers, or new external runtime requests were added. The pinned modules are served from this repository.
- After updating JSON content, run `node scripts/sync-fallbacks.mjs` to refresh the saved HTML lists for visitors without JavaScript. Normal JSON-powered content updates on the next page load after publication; validation checks that the no-script copy matches the same records.

### Local checks

```text
node scripts/sync-fallbacks.mjs
node scripts/validate.mjs
node scripts/test-motion.mjs
node scripts/test-hero-profile.mjs
python scripts/serve.py
```

To validate and test the packaged production files, use Node.js for the optional build and Python for the local preview:

```text
node scripts/build.mjs --dry-run
node scripts/build.mjs
python scripts/serve.py --directory dist --port 4174
```

Open [http://127.0.0.1:4174/](http://127.0.0.1:4174/). The build runs the static validator before copying only public runtime HTML, CSS, JavaScript, JSON, assets, the vendor license, and `.nojekyll`. The ignored `dist/` output contains no development scripts, documentation, Git metadata, or ownership manifest. Rebuilds refuse to overwrite unknown or externally modified output files rather than deleting them; `.dist-build-manifest.json` is a local, ignored ownership record.

To check repository-style GitHub Pages paths without changing the site's relative URLs, stop that preview and run:

```text
python scripts/serve.py --directory dist --port 4174 --base-path /portfolio/
```

Open [http://127.0.0.1:4174/portfolio/](http://127.0.0.1:4174/portfolio/). Fault-injection routes also work beneath this prefix, for example `/portfolio/__qa__/no-three/`. Rebuild after further source changes before testing the final production snapshot.

The optional preview server disables caching and provides fault-injection routes:

- `/__qa__/no-js/`: no scripts; saved project, collaboration, and certificate links remain available.
- `/__qa__/no-three/?motionTest=full`: simulate an unavailable Three.js download.
- `/__qa__/no-webgl/?motionTest=full`: simulate unsupported WebGL.
- `/__qa__/data-failure/`: simulate failed JSON requests, including certificate search after failure.

Only on `127.0.0.1`, `?motionDebug=1&motionTest=full` shows scene counters and forces full-motion QA without changing the OS setting. `?motionTest=reduced` exercises reduced motion. These overrides are ignored on the public domain. Diagnostics report active frame timing, frame count, draw calls, GPU-resource counts, estimated texture memory, and JS heap when supported—not measured GPU utilization.

See [the animation validation report](docs/animation-validation.md) for the tested scope and limitations.

### Publishing

This is the user-site repository `Ezumaex/Ezumaex.github.io`. GitHub Pages publishes it directly from the repository root; the optional local `dist/` packaging step is for production verification and does not change the configured publishing source. No Node.js, Python, Vite, backend, or database runs on GitHub Pages.

1. Push changes to the `main` branch.
2. In the repository, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select the `main` branch and `/(root)` folder, then save.
5. Wait for GitHub Pages to finish publishing and verify [https://ezumaex.github.io/](https://ezumaex.github.io/).

The `.nojekyll` file tells GitHub Pages to serve this static site without Jekyll processing. HTTPS is provided by GitHub Pages for the `github.io` address.

## Maintenance checklist

- Keep project claims aligned with the actual code and documentation.
- Remove or replace broken credential and demo links.
- Optimize large certificate images before committing them.
- Update the résumé and its dates whenever experience changes.
- Review the site on a phone after meaningful layout changes.
- Rotate any exposed secret immediately; deleting it from the latest commit does not revoke it or remove it from Git history.
