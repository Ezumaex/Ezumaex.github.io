// Deterministic lifecycle tests against the actual DemandScene implementation.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
const source = readFileSync(new URL("../js/three-scenes.js", import.meta.url), "utf8");
const queue = new Map();
let sequence = 0, time = 0, enabled = true;
class Target {
  constructor() { this.events = new Map(); }
  addEventListener(type, fn) { this.events.set(type, fn); }
  emit(type, event = {}) { this.events.get(type)?.(event); }
}
const doc = new Target();
doc.hidden = false;
doc.querySelector = () => ({ textContent: "" });
const win = new Target();
win.portfolioMotion = { get enabled() { return enabled; } };
class Renderer {
  constructor() { this.info = { render: { calls: 2, triangles: 2 }, memory: { geometries: 2, textures: 1 } }; this.renders = 0; }
  setPixelRatio(value) { this.ratio = value; }
  setClearColor() {}
  setSize() {}
  render() { this.renders++; }
  dispose() { this.disposed = true; }
}
class Observer { constructor(fn) { this.fn = fn; } observe() {} disconnect() { this.disconnected = true; } }
const context = vm.createContext({
  window: win, document: doc, location: { hostname: "unit-test", search: "" },
  matchMedia: () => ({ matches: false }), URLSearchParams, AbortController,
  requestAnimationFrame: fn => { queue.set(++sequence, fn); return sequence; },
  cancelAnimationFrame: id => queue.delete(id), devicePixelRatio: 2,
  ResizeObserver: Observer, IntersectionObserver: Observer,
  performance: { memory: null }
});
const DemandScene = vm.runInContext(source.slice(0, source.indexOf("\nfunction bindPointer")) + "\nDemandScene;", context);
const host = new Target();
host.id = "project-scene"; host.clientWidth = 1000; host.clientHeight = 400;
host.classList = { add() {}, remove() {} };
host.querySelector = () => null;
const canvas = new Target(); canvas.clientHeight = 400;
const T = {
  WebGLRenderer: Renderer, Scene: class { clear() {} },
  PerspectiveCamera: class { constructor() { this.position = {}; } updateProjectionMatrix() {} }
};
const view = new DemandScene(T, host, canvas);
assert.equal(queue.size, 0, "Offscreen initialization must not render");
view.visibilityObserver.fn([{ isIntersecting: true }]);
let moves = 0;
view.update = () => moves++ < 6;
function tick(interval = 16.67) {
  const jobs = [...queue.values()]; queue.clear(); time += interval;
  jobs.forEach(fn => fn(time));
}
for (let i = 0; i < 10; i++) tick();
assert.equal(queue.size, 0, "Settled scene must stop scheduling frames");
const settledFrames = view.frames;
tick(); tick();
assert.equal(view.frames, settledFrames, "Idle reads must render zero frames");
view.invalidate(); view.invalidate();
assert.equal(queue.size, 1, "Repeated invalidations must share one frame");
doc.hidden = true; doc.emit("visibilitychange");
assert.equal(queue.size, 0, "Hidden tab must cancel pending frames");
view.invalidate();
assert.equal(queue.size, 0, "Hidden tab must not restart rendering");
doc.hidden = false; doc.emit("visibilitychange"); tick();
assert.equal(queue.size, 0);
view.visibilityObserver.fn([{ isIntersecting: false }]);
view.invalidate();
assert.equal(queue.size, 0, "Offscreen inputs must not render");
view.visibilityObserver.fn([{ isIntersecting: true }]); tick();
enabled = false; view.invalidate();
assert.equal(queue.size, 0, "Reduced motion must prevent scheduling");
enabled = true;
view.update = () => true;
view.invalidate();
for (let i = 0; i < 100; i++) tick(40);
assert.equal(view.ratio, .75, "Sustained slow frames must lower resolution");
let released = 0;
view.track({ dispose() { released++; } });
view.dispose();
assert.equal(released, 1);
assert.equal(queue.size, 0);
assert.ok(view.renderer.disposed && view.resizeObserver.disconnected && view.visibilityObserver.disconnected);
view.invalidate(); tick();
assert.equal(queue.size, 0, "Disposed scenes must not restart");
console.log("PASS: demand rendering, idle, hidden tab, offscreen, reduced motion, adaptive DPR, resource disposal.");
