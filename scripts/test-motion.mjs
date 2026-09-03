// Deterministic tests of the actual motion code; no browser or GPU is simulated.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../js/three-scenes.js", import.meta.url), "utf8");
const radarSource = readFileSync(new URL("../js/radar.js", import.meta.url), "utf8");
const motionSource = readFileSync(new URL("../js/motion.js", import.meta.url), "utf8");
const skills = JSON.parse(readFileSync(new URL("../data/skills.json", import.meta.url), "utf8"));

class Target {
  constructor() { this.events = new Map(); }
  addEventListener(type, fn, options = {}) {
    if (options.signal?.aborted) return;
    if (!this.events.has(type)) this.events.set(type, new Set());
    this.events.get(type).add(fn);
    options.signal?.addEventListener("abort", () => this.removeEventListener(type, fn), { once: true });
  }
  removeEventListener(type, fn) { this.events.get(type)?.delete(fn); }
  emit(type, event = {}) { [...(this.events.get(type) || [])].forEach(fn => fn(event)); }
  listenerCount(type) { return this.events.get(type)?.size || 0; }
}
class ClassList {
  constructor() { this.values = new Set(); }
  add(value) { this.values.add(value); }
  remove(value) { this.values.delete(value); }
  contains(value) { return this.values.has(value); }
}
class Renderer {
  constructor() {
    this.info = { render: { calls: 2, triangles: 2 }, memory: { geometries: 2, textures: 1 } };
    this.renders = 0;
    this.sizes = [];
    this.ratios = [];
  }
  setPixelRatio(value) { this.ratio = value; this.ratios.push(value); }
  setClearColor() {}
  setSize(width, height, updateStyle) { this.sizes.push({ width, height, updateStyle }); }
  render() { this.renders++; }
  dispose() { this.disposed = true; }
}
class Observer {
  constructor(fn) { this.fn = fn; this.targets = new Set(); }
  observe(target) { this.targets.add(target); }
  unobserve(target) { this.targets.delete(target); }
  disconnect() { this.disconnected = true; this.targets.clear(); }
}
const T = {
  WebGLRenderer: Renderer,
  Scene: class { clear() { this.cleared = true; } },
  PerspectiveCamera: class {
    constructor() { this.position = {}; this.projectionUpdates = 0; }
    updateProjectionMatrix() { this.projectionUpdates++; }
  }
};

function harness({ enabled = true, compact = false, id = "project-scene" } = {}) {
  const queue = new Map();
  let sequence = 0, time = 0, motionEnabled = enabled;
  const doc = new Target();
  const hint = { textContent: "" };
  doc.hidden = false;
  doc.querySelector = () => hint;
  // Keep lazy factories dormant; tests explicitly register the view under test.
  doc.getElementById = () => null;
  const win = new Target();
  win.portfolioMotion = { get enabled() { return motionEnabled; } };
  const context = vm.createContext({
    window: win, document: doc, location: { hostname: "unit-test", search: "" },
    matchMedia: query => ({ matches: query.includes("prefers-reduced-motion") ? !motionEnabled : compact }),
    URLSearchParams, AbortController,
    requestAnimationFrame: fn => { queue.set(++sequence, fn); return sequence; },
    cancelAnimationFrame: frame => queue.delete(frame), devicePixelRatio: 2,
    ResizeObserver: Observer, IntersectionObserver: Observer,
    performance: { memory: null }, innerHeight: 900
  });
  const api = vm.runInContext(`${source}\n({ DemandScene, createRadarClock, activeViews, near });`, context);
  const host = new Target();
  Object.assign(host, { id, clientWidth: 1000, clientHeight: 400, classList: new ClassList() });
  const canvas = new Target();
  canvas.clientHeight = 400;
  host.querySelector = () => canvas;
  const view = new api.DemandScene(T, host, canvas);
  api.activeViews.set(id, view);
  return {
    ...api, queue, doc, win, host, canvas, view, hint,
    get time() { return time; },
    setEnabled(value, notify = true) {
      motionEnabled = value;
      if (notify) doc.emit("portfolio:motion");
    },
    show(value = true) { view.visibilityObserver.fn([{ isIntersecting: value, target: host }]); },
    hideDocument(value = true) { doc.hidden = value; doc.emit("visibilitychange"); },
    tick(interval = 1000 / 60) {
      const jobs = [...queue.values()];
      queue.clear(); time += interval;
      jobs.forEach(fn => fn(time));
      assert.ok(queue.size <= 1, "A scene may have at most one pending animation frame");
    },
    drain(maxFrames = 500, interval = 1000 / 60) {
      let frames = 0;
      while (queue.size && frames < maxFrames) { this.tick(interval); frames++; }
      assert.equal(queue.size, 0, `Animation must settle within ${maxFrames} frames`);
      return frames;
    }
  };
}
function close(actual, expected, message) {
  assert.ok(Math.abs(actual - expected) < 1e-8, `${message}: expected ${expected}, received ${actual}`);
}
function radar(h, duration = 4800) {
  const clock = h.createRadarClock(duration);
  h.view.update = (_alpha, delta) => clock.advance(delta);
  clock.start();
  h.view.ready();
  return clock;
}
let testCount = 0;
function test(name, run) {
  run(); testCount++;
  console.log(`PASS: ${name}`);
}

test("radar clock starts on request, advances clockwise, clamps deltas, and stops after one sweep", () => {
  const h = harness({ id: "hero-scene" });
  for (const duration of [3600, 4800]) {
    const clock = h.createRadarClock(duration);
    assert.equal(clock.running, false, "A new clock must not start an unsolicited loop");
    assert.equal(clock.elapsed, duration);
    clock.start();
    assert.equal(clock.running, true);
    assert.equal(clock.elapsed, 0);
    close(clock.angle, Math.PI / 2, "The sweep starts at twelve o'clock");
    clock.advance(25);
    close(clock.angle, Math.PI / 2 - 25 / duration * Math.PI * 2, "Visible time changes the sweep angle");
    const angle = clock.angle;
    clock.advance(-100);
    close(clock.angle, angle, "Negative elapsed time cannot rewind the scan");
    clock.advance(60000);
    assert.equal(clock.elapsed, 75, "Long frame gaps must be clamped to 50 ms");
    let updates = 0;
    while (clock.running && updates++ < 200) clock.advance(50);
    assert.equal(clock.running, false);
    assert.equal(clock.elapsed, duration, "The clock must stop exactly at its finite duration");
    close(clock.angle, Math.PI / 2 - Math.PI * 2, "A completed sweep rotates exactly once");
    assert.equal(clock.advance(50), false, "An idle clock must remain stopped");
    clock.start();
    assert.equal(clock.elapsed, 0, "Explicit restart must reset the sweep");
  }
  h.view.dispose();
});

test("project demand rendering settles and shares repeated invalidations", () => {
  const h = harness();
  const { view, queue } = h;
  assert.equal(queue.size, 0, "Offscreen initialization must not render");
  let moves = 0;
  view.update = () => moves++ < 6;
  h.show();
  assert.equal(h.drain(), 7);
  const settledFrames = view.frames;
  h.tick(); h.tick();
  assert.equal(view.frames, settledFrames, "Idle reads must render zero frames");
  view.invalidate(); view.invalidate(); view.invalidate();
  assert.equal(queue.size, 1, "Repeated invalidations must share one frame");
  h.tick();
  assert.equal(queue.size, 0, "A settled demand scene must not schedule another frame");
  view.dispose();
});

test("the HTML fallback stays visible until a successful visible render is ready", () => {
  const h = harness();
  let readyCalls = 0;
  h.view.onReady = () => readyCalls++;
  h.view.ready(); h.view.ready();
  assert.equal(h.queue.size, 0);
  assert.equal(h.host.classList.contains("three-ready"), false);
  h.show();
  assert.equal(h.host.classList.contains("three-ready"), false, "Scheduling is not a rendered frame");
  h.tick();
  assert.equal(h.host.classList.contains("three-ready"), true);
  assert.equal(h.view.renderer.renders, 1);
  assert.equal(readyCalls, 1);
  h.view.ready(); h.tick();
  assert.equal(readyCalls, 1, "Repeated readiness must not repeat the renderer handoff");
  // Selecting an unloaded panel removes the class while wantsReady remains sticky.
  h.host.classList.remove("three-ready");
  h.view.canPresent = () => false;
  h.view.invalidate(); h.tick();
  assert.equal(h.view.wantsReady, true);
  assert.equal(h.host.classList.contains("three-ready"), false, "A previously ready scene must not hide an unloaded panel's fallback");
  assert.equal(readyCalls, 1);
  h.view.canPresent = () => true;
  h.view.invalidate();
  assert.equal(h.host.classList.contains("three-ready"), false, "Newly loaded content is not ready before its first render");
  h.tick();
  assert.equal(h.host.classList.contains("three-ready"), true);
  assert.equal(readyCalls, 2);
  h.view.dispose();
  assert.equal(h.host.classList.contains("three-ready"), false, "Disposal must restore the HTML fallback");
});

test("failed first renders keep the HTML fallback and release the scene", () => {
  const h = harness();
  let readyCalls = 0, disposeCalls = 0;
  h.view.onReady = () => readyCalls++;
  h.view.onDispose = () => disposeCalls++;
  h.view.renderer.render = () => { throw new Error("Deterministic renderer failure"); };
  h.view.ready(); h.show(); h.tick();
  assert.equal(readyCalls, 0, "A failed render cannot announce that its content is ready");
  assert.equal(disposeCalls, 1);
  assert.equal(h.host.classList.contains("three-ready"), false);
  assert.equal(h.view.disposed, true);
  assert.equal(h.view.frames, 0);
  assert.equal(h.queue.size, 0);
});

test("visible radar angles progress and both desktop and compact scans become idle", () => {
  for (const [compact, duration] of [[false, 4800], [true, 3600]]) {
    const h = harness({ compact, id: "hero-scene" });
    const clock = radar(h, duration);
    const startAngle = clock.angle;
    h.tick(1000);
    assert.equal(clock.angle, startAngle, "Offscreen setup cannot advance the sweep");
    assert.equal(h.view.frames, 0);
    h.show();
    h.tick();
    const firstAngle = clock.angle;
    assert.ok(firstAngle < startAngle, "The first visible render advances the sweep angle");
    h.tick();
    assert.ok(clock.angle < firstAngle, "The second visible render continues the sweep");
    h.drain();
    assert.equal(clock.running, false);
    assert.equal(clock.elapsed, duration);
    assert.equal(h.view.state.state, "idle");
    const frames = h.view.frames;
    h.tick(60000); h.tick(60000);
    assert.equal(h.view.frames, frames, "Completed radar scans must render no idle frames");
    clock.start(); h.view.invalidate(); h.view.invalidate();
    assert.equal(h.queue.size, 1, "An explicit repeat scan still uses one pending frame");
    h.drain();
    assert.equal(clock.running, false);
    h.view.dispose();
  }
});

test("offscreen and hidden tabs cancel frames and exclude their duration when resumed", () => {
  const h = harness({ id: "hero-scene" });
  const clock = radar(h);
  h.show(); h.tick(); h.tick(50);
  const offscreenElapsed = clock.elapsed;
  h.show(false);
  assert.equal(h.queue.size, 0, "Offscreen transitions must cancel the pending frame");
  h.view.invalidate(); h.view.invalidate();
  h.tick(60000);
  assert.equal(clock.elapsed, offscreenElapsed);
  assert.equal(h.queue.size, 0, "Offscreen input cannot restart rendering");
  h.show();
  assert.equal(h.queue.size, 1);
  h.tick();
  close(clock.elapsed, offscreenElapsed + 16.7, "Resume must use a fresh first-frame delta");

  const hiddenElapsed = clock.elapsed;
  const hiddenFrames = h.view.frames;
  const cancelledFrame = [...h.queue.values()][0];
  h.hideDocument();
  assert.equal(h.queue.size, 0, "A hidden tab must cancel pending frames");
  h.view.invalidate();
  h.tick(120000);
  cancelledFrame(h.time); // A late callback must still respect the visibility guard.
  assert.equal(clock.elapsed, hiddenElapsed);
  assert.equal(h.view.frames, hiddenFrames);
  assert.equal(h.queue.size, 0, "Hidden input and late callbacks cannot restart rendering");
  h.hideDocument(false);
  assert.equal(h.queue.size, 1);
  h.tick();
  close(clock.elapsed, hiddenElapsed + 16.7, "Tab resume must exclude all hidden duration");
  assert.equal(clock.running, true, "A long hidden period cannot consume the finite scan");
  h.drain();
  h.view.dispose();
});

test("reduced motion prevents rendering and the real motion event releases active scenes", () => {
  const reduced = harness({ enabled: false, id: "hero-scene" });
  const reducedClock = radar(reduced);
  reduced.show(); reduced.view.invalidate(); reduced.tick(60000);
  assert.equal(reduced.queue.size, 0);
  assert.equal(reduced.view.frames, 0);
  assert.equal(reducedClock.elapsed, 0, "Reduced-motion initialization cannot advance a scan");
  reduced.view.dispose();

  const h = harness({ id: "hero-scene" });
  const clock = radar(h);
  h.show(); h.tick();
  const elapsed = clock.elapsed;
  const frames = h.view.frames;
  const pendingFrame = [...h.queue.values()][0];
  h.setEnabled(false, false);
  h.queue.clear();
  pendingFrame(h.time + 16.7);
  assert.equal(h.view.frames, frames, "A queued callback must recheck reduced motion before rendering");
  assert.equal(clock.elapsed, elapsed);
  h.setEnabled(true, false);
  h.view.invalidate();
  assert.equal(h.queue.size, 1);
  h.setEnabled(false);
  assert.equal(h.view.disposed, true, "The real motion event must dispose active views");
  assert.equal(h.queue.size, 0, "The real reduced-motion event must cancel pending frames immediately");
  assert.equal(h.activeViews.size, 0);
  h.view.invalidate(); h.tick(60000);
  assert.equal(h.queue.size, 0);
  assert.equal(h.view.frames, frames);
  h.setEnabled(true);
  h.view.invalidate(); h.tick();
  assert.equal(h.queue.size, 0, "A disposed scene cannot restart when motion is enabled again");
});

test("resize skips unchanged drawing buffers while preserving custom camera updates", () => {
  const h = harness();
  const { view, host, canvas } = h;
  assert.equal(view.renderer.sizes.length, 1);
  assert.deepEqual(view.renderer.sizes[0], { width: 1000, height: 400, updateStyle: false });
  close(view.camera.aspect, 2.5, "Default perspective aspect");
  const observedSizes = [];
  view.onResize = (width, height) => {
    observedSizes.push([width, height]);
    view.camera.aspect = width / height;
    view.camera.position.z = 6;
  };
  const projectionUpdates = view.camera.projectionUpdates;
  const pixelRatioUpdates = view.renderer.ratios.length;
  view.resize(); view.resize();
  assert.equal(view.renderer.sizes.length, 1, "Same-size resize must not reallocate the buffer");
  assert.equal(view.renderer.ratios.length, pixelRatioUpdates, "Same-size resize must not reset the pixel ratio");
  assert.deepEqual(observedSizes, [[1000, 400], [1000, 400]]);
  assert.equal(view.camera.projectionUpdates, projectionUpdates + 2);
  assert.equal(view.camera.position.z, 6, "Custom camera framing must not be overwritten");
  host.clientWidth = 1200;
  view.resizeObserver.fn();
  canvas.clientHeight = 500;
  view.resizeObserver.fn();
  assert.equal(view.renderer.sizes.length, 3);
  assert.deepEqual(view.renderer.sizes[2], { width: 1200, height: 500, updateStyle: false });
  view.ratio = .75;
  view.resize();
  assert.equal(view.renderer.sizes.length, 4, "A changed resolution must update the drawing buffer");
  assert.equal(view.bufferRatio, .75);
  view.resize();
  assert.equal(view.renderer.sizes.length, 4);
  assert.equal(h.queue.size, 0, "Offscreen resize cannot render");
  view.dispose();
});

test("project performance adaptation lowers resolution and the slow-frame safeguard stops work", () => {
  const h = harness();
  h.view.update = () => true;
  h.show();
  for (let i = 0; i < 100; i++) h.tick(40);
  assert.equal(h.view.ratio, .75, "Sustained slow frames must lower resolution");
  assert.equal(h.view.bufferRatio, .75);
  assert.equal(h.view.disposed, false, "Moderately slow frames may continue at reduced resolution");
  assert.equal(h.queue.size, 1);
  h.view.dispose();

  const slow = harness();
  slow.view.update = () => true;
  slow.show();
  for (let i = 0; i < 140; i++) slow.tick(70);
  assert.equal(slow.view.disposed, true, "Persistently slow rendering must fall back to static content");
  assert.equal(slow.queue.size, 0);
});

test("cached pages pause and resume; page departure disposes observers, listeners, and resources", () => {
  const h = harness({ id: "hero-scene" });
  const clock = radar(h);
  h.show(); h.tick();
  const elapsed = clock.elapsed;
  h.win.emit("pagehide", { persisted: true });
  assert.equal(h.queue.size, 0);
  assert.equal(h.view.disposed, false);
  h.tick(60000);
  assert.equal(clock.elapsed, elapsed);
  h.win.emit("pageshow", { persisted: true });
  assert.equal(h.queue.size, 1);
  h.tick();
  close(clock.elapsed, elapsed + 16.7, "Cached-page resume excludes the paused interval");
  let released = 0, disposeCalls = 0;
  const resource = { dispose() { released++; } };
  h.view.track(resource); h.view.track(resource);
  h.view.onDispose = () => disposeCalls++;
  assert.equal(h.doc.listenerCount("visibilitychange"), 1);
  assert.equal(h.canvas.listenerCount("webglcontextlost"), 1);
  h.win.emit("pagehide", { persisted: false });
  assert.equal(released, 1, "Tracked resources must be disposed exactly once");
  assert.equal(disposeCalls, 1);
  assert.equal(h.view.resources.size, 0);
  assert.equal(h.activeViews.size, 0);
  assert.equal(h.queue.size, 0);
  assert.ok(h.view.renderer.disposed && h.view.scene.cleared);
  assert.ok(h.near.disconnected && h.view.resizeObserver.disconnected && h.view.visibilityObserver.disconnected);
  assert.equal(h.view.listeners.signal.aborted, true);
  assert.equal(h.doc.listenerCount("visibilitychange"), 0);
  assert.equal(h.canvas.listenerCount("webglcontextlost"), 0);
  assert.equal(h.host.classList.contains("three-ready"), false);
  h.view.dispose(); h.view.invalidate(); h.view.resize(); h.tick();
  assert.equal(released, 1);
  assert.equal(disposeCalls, 1);
  assert.equal(h.queue.size, 0, "Disposed scenes must not restart");
});

test("WebGL context loss restores project fallback and performs complete cleanup", () => {
  const h = harness();
  h.view.ready(); h.show(); h.tick();
  let prevented = false;
  h.canvas.emit("webglcontextlost", { preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(h.view.disposed, true);
  assert.equal(h.queue.size, 0);
  assert.equal(h.host.classList.contains("three-ready"), false);
  assert.equal(h.hint.textContent, "Use the project buttons below to explore.");
});

test("radar nodes use exact evidence-backed skill names and motion has no unconditional loop API", () => {
  const layoutMatch = radarSource.match(/const layout = (\[[\s\S]*?\n  \]);/);
  assert.ok(layoutMatch, "The radar must declare its semantic node layout");
  const layout = vm.runInNewContext(layoutMatch[1]);
  const names = Array.from(layout, node => node.name);
  assert.deepEqual(names, ["React", "Node.js", "ESP32 & MQTT", "VB.NET & SQL Server", "Networking", "Java"]);
  assert.equal(new Set(names).size, names.length);
  names.forEach(name => {
    const skill = skills.find(item => item.name === name);
    assert.ok(skill, `Radar skill ${name} must exactly match data/skills.json`);
    assert.ok([...(skill.personal || []), ...(skill.experience || []), ...(skill.learning || [])].some(item => item.title && item.detail), `${name} must have real supporting evidence`);
  });
  for (const [name, code] of [["three-scenes.js", source], ["radar.js", radarSource], ["motion.js", motionSource]]) {
    assert.doesNotMatch(code, /\b(?:setAnimationLoop|setInterval)\s*\(/, `${name} must not install an unconditional animation loop`);
    assert.doesNotMatch(code, /iterations\s*:\s*Infinity/, `${name} must not install an infinite Web Animation`);
  }
  assert.equal([...source.matchAll(/\brequestAnimationFrame\s*\(/g)].length, 1, "Three.js motion must share the guarded demand scheduler");
  assert.match(radarSource, /button\.addEventListener\("pointerenter"/, "Fine-pointer hover must preview radar evidence");
  assert.match(radarSource, /button\.addEventListener\("focus"/, "Keyboard focus must preview the same radar evidence");
  assert.match(radarSource, /select\(node, false\)/, "Previewing must not change the separate Skills panel");
  assert.match(radarSource, /duration: 560/, "Hover feedback must be finite");
});

console.log(`PASS: ${testCount} deterministic motion suites. Browser appearance and real GPU performance are not measured here.`);
