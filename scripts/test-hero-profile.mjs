import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../js/hero-profile.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const roles = ["Computer Engineering Student", "Web Developer", "Full-Stack Builder", "IoT Prototyper"];
function fixture({ motion = true, observer = true, missing = false } = {}) {
  const documentEvents = new Map();
  const windowEvents = new Map();
  const timers = new Map();
  let now = 0, nextId = 0, watch, disconnected = false;
  const title = { textContent: roles[0] };
  const button = { hidden: true, textContent: "Pause", setAttribute(k, v) { this[k] = v; }, addEventListener(type, fn) { this[type] = fn; } };
  const document = { hidden: false, querySelector: selector => missing ? null : selector === "#rotating-role" ? title : button, addEventListener: (type, fn) => documentEvents.set(type, fn) };
  const window = {
    portfolioMotion: { enabled: motion },
    setTimeout(fn, delay) { const id = ++nextId; timers.set(id, { fn, at: now + delay }); return id; },
    clearTimeout: id => timers.delete(id),
    addEventListener: (type, fn) => windowEvents.set(type, fn)
  };
  const context = { document, window };
  if (observer) {
    context.IntersectionObserver = class {
      constructor(fn) { watch = fn; }
      observe(node) { assert.equal(node, title); }
      disconnect() { disconnected = true; }
    };
    window.IntersectionObserver = context.IntersectionObserver;
  }
  vm.runInNewContext(source, context);
  function advance(ms) {
    const end = now + ms;
    for (let limit = 0; limit < 10000; limit++) {
      const pending = [...timers].filter(([, value]) => value.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!pending) { now = end; return; }
      timers.delete(pending[0]); now = pending[1].at; pending[1].fn();
    }
    throw Error("Unbounded timer loop");
  }
  return {
    title, button, timers, advance, window, document,
    visible(value) { watch?.([{ isIntersecting: value }]); },
    documentEvent: type => documentEvents.get(type)?.(),
    windowEvent: (type, event = {}) => windowEvents.get(type)?.(event),
    get disconnected() { return disconnected; }
  };
}

// Full motion restores typing, visits every original label, and loops.
const full = fixture();
assert.equal(full.button.hidden, false);
assert.equal(full.timers.size, 0);
full.visible(true);
full.advance(3600);
assert.equal(full.title.textContent, roles[0].slice(0, -1));
const seen = new Set([roles[0]]);
for (let elapsed = 0; elapsed < 30000; elapsed += 20) {
  full.advance(20);
  if (roles.includes(full.title.textContent)) seen.add(full.title.textContent);
  assert.ok(full.timers.size <= 1);
}
assert.equal(seen.size, 4);

// Pausing mid-word settles text, freezes time, and resumes with one timer.
full.advance(3700);
full.button.click();
assert.ok(roles.includes(full.title.textContent));
assert.equal(full.button["aria-label"], "Play rotating titles");
const paused = full.title.textContent;
full.advance(30000);
assert.equal(full.title.textContent, paused);
assert.equal(full.timers.size, 0);
full.button.click();
assert.equal(full.timers.size, 1);
assert.equal(full.button["aria-label"], "Pause rotating titles");

// Reduced motion uses whole words only, while retaining the pause control.
const reduced = fixture({ motion: false });
reduced.visible(true);
reduced.advance(3599);
assert.equal(reduced.title.textContent, roles[0]);
reduced.advance(1);
assert.equal(reduced.title.textContent, roles[1]);
reduced.advance(3600);
assert.equal(reduced.title.textContent, roles[2]);
reduced.button.click();
reduced.advance(30000);
assert.equal(reduced.title.textContent, roles[2]);

// Preference changes settle partial text rather than showing truncated roles.
full.advance(3600);
full.window.portfolioMotion.enabled = false;
full.documentEvent("portfolio:motion");
assert.ok(roles.includes(full.title.textContent));
assert.equal(full.timers.size, 1);

// Offscreen, background, pagehide and bfcache lifecycle never duplicate timers.
full.visible(false);
assert.equal(full.timers.size, 0);
full.visible(true);
full.document.hidden = true;
full.documentEvent("visibilitychange");
assert.equal(full.timers.size, 0);
full.document.hidden = false;
full.documentEvent("visibilitychange");
assert.equal(full.timers.size, 1);
full.windowEvent("pagehide", { persisted: true });
assert.equal(full.timers.size, 0);
assert.equal(full.disconnected, false);
full.windowEvent("pageshow");
full.windowEvent("pageshow");
assert.equal(full.timers.size, 1);
full.windowEvent("pagehide", { persisted: false });
assert.equal(full.disconnected, true);
assert.equal(full.timers.size, 0);

const fallback = fixture({ observer: false });
assert.equal(fallback.timers.size, 1);
assert.equal(fixture({ missing: true }).timers.size, 0);
for (const role of roles) assert.ok(html.includes(role), `Accessible summary missing ${role}`);
assert.match(html, /class="hero-role-text" aria-hidden="true"/);
assert.match(html, /class="role-sizer">Computer Engineering Student/);
assert.doesNotMatch(html.match(/class="hero-role-row"[\s\S]*?<\/div>/)[0], /aria-live/);
assert.match(html, /assets\/images\/profile-placeholder.svg/);
console.log("PASS: restored roles, typing, reduced motion, pause/play, lifecycle, fallbacks, accessible text, portrait slot");
