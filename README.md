# Joerelle Jay P. Bisnar — Portfolio

A lightweight, accessible portfolio for [Joerelle Jay P. Bisnar](https://github.com/Ezumaex), hosted at [ezumaex.github.io](https://ezumaex.github.io/). It presents selected projects, technical experience, education, verified certifications, and a public résumé.

The site uses plain HTML, CSS, JavaScript, and JSON. There is no framework, package installation, or build step.

## Repository map

```text
.
├── index.html                         # Main portfolio page
├── certifications.html                # Searchable certificate library
├── 404.html                            # GitHub Pages not-found page
├── styles.css                          # Shared visual system and responsive styles
├── js/
│   ├── site.js                         # Navigation and project rendering
│   └── certificates.js                 # Search, filters, and certificate dialog
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
python -m http.server 4173
```

Then open `http://localhost:4173/`. No dependency installation is required.

## Add or update a project

Edit `data/projects.json`. Each item follows this shape:

```json
{
  "name": "Project name",
  "status": "Active",
  "context": "IoT system",
  "description": "A concise, evidence-based explanation of the project.",
  "technologies": ["React", "Node.js"],
  "repository": "https://github.com/Ezumaex/repository-name",
  "liveDemo": "",
  "image": "assets/images/project-preview.png",
  "imageAlt": "Concise description of the project screenshot",
  "featured": true
}
```

- Set `featured` to `true` to show the project on the home page.
- Leave `liveDemo` as an empty string when no public demo exists.
- Use an empty `image` string when there is no genuine project screenshot yet.
- Use only technologies and outcomes that are supported by the repository.
- Keep JSON valid: double-quote strings and separate items with commas.

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

Use `YYYY-MM-DD` for `issued` so newest certificates sort first. If there is no public credential page or credential ID, use an empty string rather than inventing one. The `category` value automatically appears in the filter menu.

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
3. Search and filter the certificate library, then open and close a certificate preview.
4. Open every project, credential, social, résumé, and navigation link.
5. Confirm `data/projects.json`, `data/certificates.json`, `data/skills.json`, and `data/contributions.json` parse as valid JSON.
6. Check keyboard navigation, visible focus states, image alt text, and reduced-motion behavior.
7. Confirm the browser console has no errors.

## Deploy with GitHub Pages

This is the user-site repository `Ezumaex/Ezumaex.github.io`. GitHub Pages can publish it directly from the repository root without a build process.

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
