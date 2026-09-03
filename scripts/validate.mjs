import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { gzipSync } from "node:zlib";
import vm from "node:vm";
import path from "node:path";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = name => readFileSync(path.join(root, name), "utf8");
const data = name => JSON.parse(read("data/" + name + ".json"));
const collections = ["projects", "certificates", "skills", "contributions"].map(data);
let localLinks = 0;
function local(url) {
  if (!url || /^(https?:|mailto:|data:|#)/.test(url)) return;
  const file = decodeURIComponent(url.split(/[?#]/)[0]);
  assert.ok(existsSync(path.join(root, file)), "Missing file: " + file);
  localLinks++;
}
for (const file of ["index.html", "certifications.html", "404.html"]) {
  const html = read(file);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  assert.equal(new Set(ids).size, ids.length, "Duplicate HTML IDs in " + file);
  for (const [, url] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    local(url.replaceAll("&amp;", "&"));
    if (url.startsWith("#") && url.length > 1) assert.ok(ids.includes(url.slice(1)), "Broken anchor: " + url);
  }
}
for (const collection of collections) for (const item of collection) {
  for (const key of ["image", "previewImage", "pdf"]) local(item[key]);
}
assert.equal(new Set(data("certificates").map(c => c.id)).size, data("certificates").length);
assert.equal(new Set(data("projects").map(p => p.slug)).size, data("projects").length);
assert.ok(readFileSync(path.join(root, "assets/resume/joerelle-jay-bisnar-resume.pdf")).subarray(0, 5).equals(Buffer.from("%PDF-")));
for (const file of readdirSync(path.join(root, "js")).filter(f => f.endsWith(".js"))) {
  execFileSync(process.execPath, ["--check", path.join(root, "js", file)]);
}
execFileSync(process.execPath, [path.join(root, "scripts/sync-fallbacks.mjs"), "--check"]);

// Verify preference precedence, runtime changes, denied storage, and production QA isolation.
function preference({ reduced = false, saved = null, host = "example.com", query = "", denied = false } = {}) {
  const classes = new Set();
  const media = { matches: reduced, addEventListener(type, fn) { this.change = fn; } };
  const storage = new Map(saved === null ? [] : [["portfolio-reduce-motion", saved]]);
  const context = {
    matchMedia: () => media, location: { hostname: host, search: query }, URLSearchParams,
    localStorage: { getItem: key => { if (denied) throw Error("denied"); return storage.get(key); }, setItem: (key, value) => storage.set(key, value) },
    document: { documentElement: { classList: { toggle(name, value) { value ? classes.add(name) : classes.delete(name); } } }, dispatchEvent() {} },
    CustomEvent: class {}, window: {}
  };
  vm.runInNewContext(read("js/motion-preference.js"), context);
  return { api: context.window.portfolioMotion, media, classes };
}
assert.equal(preference().api.enabled, true);
assert.equal(preference({ reduced: true }).api.enabled, false);
assert.equal(preference({ saved: "true" }).api.enabled, false);
assert.equal(preference({ denied: true }).api.enabled, true);
assert.equal(preference({ reduced: true, query: "?motionTest=full" }).api.enabled, false);
assert.equal(preference({ reduced: true, host: "127.0.0.1", query: "?motionTest=full" }).api.enabled, true);
const runtime = preference();
runtime.api.setReduced(true);
assert.equal(runtime.api.enabled, false);
runtime.api.setReduced(false);
assert.equal(runtime.api.enabled, true);
runtime.media.matches = true;
runtime.media.change();
assert.equal(runtime.classes.has("motion-off"), true);

const core = ["index.html", "styles.css", "motion.css", "js/motion-preference.js", "js/site.js", "js/showcase.js", "js/motion.js", "js/radar.js", "js/certificate-explorer.js", "js/three-scenes.js"];
const vendor = ["js/vendor/three-r185/three.module.min.js", "js/vendor/three-r185/three.core.min.js"];
const sizes = files => files.reduce((total, file) => {
  const buffer = readFileSync(path.join(root, file));
  return { raw: total.raw + buffer.length, gzip: total.gzip + gzipSync(buffer).length };
}, { raw: 0, gzip: 0 });
console.log(JSON.stringify({ result: "PASS", localLinks, projects: data("projects").length, certificates: data("certificates").length, core: sizes(core), lazyThree: sizes(vendor), previewImages: sizes(data("projects").map(p => p.previewImage)) }, null, 2));
