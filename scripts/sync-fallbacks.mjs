// Optional maintenance helper: regenerate static, no-JavaScript content from the same JSON.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = name => JSON.parse(readFileSync(path.join(root, "data", name + ".json"), "utf8"));
const escape = text => String(text || "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const link = (url, text) => '<a href="' + escape(url) + '">' + escape(text) + "</a>";
const projects = read("projects").filter(p => p.featured).map(p =>
  '<article class="project-card"><div class="project-shell"><h3>' + escape(p.name) + '</h3><p>' + escape(p.description) + '</p><p>' + link(p.repository, "Repository") + (p.liveDemo ? " · " + link(p.liveDemo, "Live site") : "") + "</p></div></article>"
).join("\n");
const certificates = '<ul class="fallback-list">' + read("certificates").map(c =>
  "<li>" + link(c.pdf || c.image, c.title) + " — " + escape(c.issuer + " · " + c.displayDate) + (c.credentialUrl ? " · " + link(c.credentialUrl, "Verify") : "") + "</li>"
).join("\n") + "</ul>";
const contributions = read("contributions").filter(c => c.repository).map(c =>
  '<article class="contribution-card"><h3>' + escape(c.name) + "</h3><p>" + escape(c.organization + " · " + c.role) + "</p><p>" + escape(c.description) + "</p>" + link(c.repository, "Repository") + (c.evidenceUrl ? " · " + link(c.evidenceUrl, "Contribution evidence") : "") + "</article>"
).join("\n");
const check = process.argv.includes("--check");
for (const file of ["index.html", "certifications.html"]) {
  const filename = path.join(root, file);
  let html = readFileSync(filename, "utf8").replace(/\r\n/g, "\n");
  const original = html;
  for (const [name, content] of Object.entries({ projects, certificates, contributions })) {
    const start = "<!-- fallback:" + name + ":start -->";
    const end = "<!-- fallback:" + name + ":end -->";
    const a = html.indexOf(start), b = html.indexOf(end);
    if (a >= 0 && b > a) html = html.slice(0, a + start.length) + "\n" + content + "\n          " + html.slice(b);
  }
  if (check && original !== html) throw new Error(file + " has stale static fallbacks. Run node scripts/sync-fallbacks.mjs");
  if (!check && original !== html) writeFileSync(filename, html);
}
console.log(check ? "Static fallbacks are current." : "Static fallbacks synchronized.");
