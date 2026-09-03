// Package the existing static site; no development server is needed after deployment.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."));
const output = path.resolve(root, "dist");
const manifestPath = path.join(root, ".dist-build-manifest.json");
const producer = "portfolio-static-build-v1";
const args = process.argv.slice(2);
assert.ok(args.every(arg => ["--dry-run", "--help"].includes(arg)), "Supported options: --dry-run, --help");
if (args.includes("--help")) {
  console.log("Usage: node scripts/build.mjs [--dry-run]\nValidates the site and copies public runtime files to dist/.\nRebuilds only replace unchanged, build-owned files; unknown output is preserved with an error.");
  process.exit(0);
}

// Validation is read-only and must pass before any output is changed.
execFileSync(process.execPath, [path.join(root, "scripts/validate.mjs")], { cwd: root, stdio: "inherit" });

assert.equal(path.dirname(output), root, "Build output must be the repository's exact dist directory");
if (existsSync(output)) {
  assert.ok(lstatSync(output).isDirectory() && !lstatSync(output).isSymbolicLink(), "Refusing a non-directory or linked dist target");
  assert.equal(realpathSync(output), output, "Refusing an output directory outside the resolved repository");
}
if (existsSync(manifestPath)) assert.ok(lstatSync(manifestPath).isFile() && !lstatSync(manifestPath).isSymbolicLink(), "Refusing a linked or non-file build manifest");

const excludedName = /(?:^|[/_.-])(?:tests?|debug|private|secrets?)(?:[/_.-]|$)/i;
const isPublicPath = file => !excludedName.test(file) && !file.split("/").some(part => part.startsWith("."));
const assetExtensions = new Set([".avif", ".gif", ".ico", ".jpeg", ".jpg", ".png", ".svg", ".webp", ".pdf", ".woff", ".woff2", ".ttf", ".otf", ".mp4", ".webm", ".mp3", ".ogg", ".wav"]);
const publicFiles = new Set([".nojekyll", "index.html", "certifications.html", "404.html", "styles.css", "motion.css", "robots.txt", "sitemap.xml"]);
for (const optional of ["CNAME", "favicon.ico"]) if (existsSync(path.join(root, optional))) publicFiles.add(optional);
for (const name of ["projects", "skills", "contributions", "certificates"]) publicFiles.add(`data/${name}.json`);

function walk(directory, prefix = "") {
  if (!existsSync(directory)) return [];
  assert.ok(lstatSync(directory).isDirectory() && !lstatSync(directory).isSymbolicLink(), `Refusing linked directory: ${directory}`);
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, "en"))) {
    const relative = prefix + entry.name;
    assert.ok(!entry.isSymbolicLink(), `Refusing linked file: ${relative}`);
    if (entry.isDirectory()) files.push(...walk(path.join(directory, entry.name), relative + "/"));
    else if (entry.isFile()) files.push(relative);
    else throw new Error(`Unsupported file type: ${relative}`);
  }
  return files;
}

for (const file of walk(path.join(root, "assets"), "assets/")) {
  if (isPublicPath(file) && assetExtensions.has(path.extname(file).toLowerCase())) publicFiles.add(file);
}
for (const file of walk(path.join(root, "js"), "js/")) {
  if (!isPublicPath(file)) continue;
  if (file.endsWith(".js") || /^js\/vendor\/[^/]+\/LICENSE(?:\.txt)?$/i.test(file)) publicFiles.add(file);
}

const digest = file => createHash("sha256").update(readFileSync(file)).digest("hex");
function targetFor(relative) {
  assert.ok(typeof relative === "string" && relative && !relative.includes("\\") && !relative.split("/").some(part => ["", ".", ".."].includes(part)), "Invalid build manifest path");
  const target = path.resolve(output, relative);
  assert.ok(target.startsWith(output + path.sep), "Build file must stay within the exact dist directory");
  return target;
}
const files = [...publicFiles].sort().map(relative => {
  const source = path.join(root, relative);
  assert.ok(existsSync(source) && lstatSync(source).isFile() && !lstatSync(source).isSymbolicLink(), `Required public file is missing or linked: ${relative}`);
  targetFor(relative);
  return { path: relative, sha256: digest(source) };
});

let owned = new Map();
if (existsSync(manifestPath)) {
  const previous = JSON.parse(readFileSync(manifestPath, "utf8"));
  assert.ok(previous.producer === producer && previous.output === "dist" && Array.isArray(previous.files), "Unrecognized build ownership manifest");
  owned = new Map(previous.files.map(file => {
    targetFor(file.path);
    assert.match(file.sha256, /^[a-f0-9]{64}$/);
    return [file.path, file.sha256];
  }));
}
const existing = walk(output);
for (const relative of existing) {
  assert.ok(owned.has(relative), `Preserving unowned dist file; move it before rebuilding: ${relative}`);
  assert.equal(digest(targetFor(relative)), owned.get(relative), `Preserving externally changed dist file: ${relative}`);
}
const names = new Set(files.map(file => file.path));
const obsolete = existing.filter(relative => !names.has(relative));
if (args.includes("--dry-run")) {
  console.log(JSON.stringify({ result: "DRY RUN", output, files: files.length, obsoleteBuildFiles: obsolete.length }, null, 2));
  process.exit(0);
}

mkdirSync(output, { recursive: true });
for (const file of files) {
  const target = targetFor(file.path);
  mkdirSync(path.dirname(target), { recursive: true });
  copyFileSync(path.join(root, file.path), target);
  assert.equal(digest(target), file.sha256, `Source changed during build; output preserved for inspection: ${file.path}`);
}
// Remove only individually verified, obsolete files created by this builder.
for (const relative of obsolete) unlinkSync(targetFor(relative));
writeFileSync(manifestPath, JSON.stringify({ producer, output: "dist", files }, null, 2) + "\n");
console.log(JSON.stringify({ result: "BUILT", output, files: files.length, removedObsoleteBuildFiles: obsolete.length }, null, 2));
