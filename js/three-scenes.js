/* Three.js r185: isolated, lazy, render-on-demand enhancements. No content lives here. */
const motionAllowed = () => window.portfolioMotion?.enabled ?? !matchMedia("(prefers-reduced-motion: reduce)").matches;
const compact = () => matchMedia("(max-width: 768px), (pointer: coarse)").matches;
const debug = location.hostname === "127.0.0.1" && new URLSearchParams(location.search).has("motionDebug");
const records = new Map();
let library;
let debugOutput;
if (debug) {
  debugOutput = document.createElement("output");
  debugOutput.id = "motion-diagnostics";
  debugOutput.className = "motion-diagnostics";
  debugOutput.setAttribute("aria-label", "Local motion performance diagnostics");
  document.body.append(debugOutput);
}
function report() {
  if (!debugOutput) return;
  debugOutput.textContent = JSON.stringify(Object.fromEntries(records), null, 2);
}
const three = () => library ||= import("./vendor/three-r185/three.module.min.js");

class DemandScene {
  constructor(THREE, host, canvas) {
    this.T = THREE;
    this.host = host;
    this.canvas = canvas;
    this.disposed = false;
    this.frame = 0;
    this.visible = false;
    this.dirty = true;
    this.frames = 0;
    this.intervals = [];
    this.lastTime = 0;
    this.resources = new Set();
    this.listeners = new AbortController();
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !compact(), powerPreference: "low-power", failIfMajorPerformanceCaveat: true });
    this.ratio = Math.min(devicePixelRatio || 1, compact() ? 1 : 1.5);
    this.renderer.setPixelRatio(this.ratio);
    this.renderer.setClearColor(0, 0);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(36, 1, .1, 50);
    this.camera.position.z = 8;
    this.state = { state: "initializing", frames: 0, dpr: this.ratio };
    records.set(host.id, this.state);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
    this.visibilityObserver = new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting;
      if (this.visible) { this.dirty = true; this.invalidate(); }
      else this.pause("offscreen");
    }, { threshold: 0 });
    this.visibilityObserver.observe(host);
    this.on(document, "visibilitychange", () => {
      if (document.hidden) this.pause("hidden");
      else this.invalidate();
    });
    this.on(canvas, "webglcontextlost", event => {
      event.preventDefault();
      this.dispose("WebGL unavailable");
    });
    this.resize();
  }
  track(resource) { this.resources.add(resource); return resource; }
  on(target, type, callback, options = {}) { target.addEventListener(type, callback, { ...options, signal: this.listeners.signal }); }
  resize() {
    if (this.disposed) return;
    const width = Math.max(1, this.host.clientWidth);
    const height = Math.max(1, this.canvas.clientHeight || this.host.clientHeight);
    this.ratio = Math.min(this.ratio, compact() ? 1 : 1.5);
    this.renderer.setPixelRatio(this.ratio);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.position.z = this.host.id === "project-scene" ? (width < 600 ? 8 : 7.1) : 7.8;
    this.camera.updateProjectionMatrix();
    this.dirty = true;
    this.invalidate();
  }
  invalidate() {
    this.dirty = true;
    if (this.disposed || this.frame || !this.visible || document.hidden || !motionAllowed()) return;
    this.state.state = "rendering";
    this.frame = requestAnimationFrame(time => this.draw(time));
  }
  draw(time) {
    this.frame = 0;
    if (this.disposed || !motionAllowed() || document.hidden || !this.visible) return;
    const interval = this.lastTime ? time - this.lastTime : 16.7;
    this.lastTime = time;
    const alpha = 1 - Math.exp(-Math.min(interval, 50) / 85);
    try {
      const moving = this.update?.(alpha) || false;
      this.renderer.render(this.scene, this.camera);
      this.frames++;
      // Only consecutive animation frames count; first-frame compilation is excluded.
      if (this.frames > 8 && interval < 180) this.intervals.push(interval);
      if (this.intervals.length > 90) this.intervals.shift();
      const mean = this.intervals.reduce((a, b) => a + b, 0) / Math.max(1, this.intervals.length);
      if (this.intervals.length >= 45 && mean > 30 && this.ratio > .75) {
        this.ratio = .75;
        this.renderer.setPixelRatio(this.ratio);
        this.intervals = [];
        this.resize();
      } else if (this.intervals.length >= 60 && mean > 65) {
        this.dispose("static · performance safeguard");
        return;
      }
      this.state = { state: moving ? "rendering" : "idle", frames: this.frames, activeFps: this.intervals.length > 8 ? Math.round(1000 / Math.max(1, mean)) : null, samples: this.intervals.length, dpr: this.ratio, drawCalls: this.renderer.info.render.calls, triangles: this.renderer.info.render.triangles, geometries: this.renderer.info.memory.geometries, textures: this.renderer.info.memory.textures };
      if (debug) {
        this.state.textureMiB = +(Array.from(this.resources).filter(item => item.isTexture).reduce((total, item) => total + (item.image?.width || 0) * (item.image?.height || 0) * 4 * 4 / 3, 0) / 1048576).toFixed(2);
        this.state.jsHeapMiB = performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : "unavailable";
      }
      records.set(this.host.id, this.state);
      if (debug && (!moving || this.frames % 20 === 0)) report();
      this.dirty = moving;
      if (moving) this.invalidate();
      else this.lastTime = 0;
    } catch { this.dispose("static · renderer unavailable"); }
  }
  ready() {
    if (this.disposed) return;
    this.host.classList.add("three-ready");
    this.invalidate();
  }
  pause(reason) {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.lastTime = 0;
    this.state.state = reason;
    report();
  }
  dispose(reason = "static") {
    if (this.disposed) return;
    this.disposed = true;
    this.pause(reason);
    this.host.classList.remove("three-ready");
    this.host.querySelector(".hero-inspect")?.setAttribute("hidden", "");
    if (this.host.id === "project-scene") document.querySelector("#showcase-hint").textContent = "Use the project buttons below to explore.";
    this.resizeObserver.disconnect();
    this.visibilityObserver.disconnect();
    this.listeners.abort();
    this.resources.forEach(resource => resource.dispose());
    this.resources.clear();
    this.scene.clear();
    this.renderer.dispose();
    // Preserve the canvas context so turning motion back on can reuse it safely.
  }
}

function bindPointer(view, object, baseX = .2, baseY = -.35) {
  let targetX = baseX;
  let targetY = baseY;
  let turn = 0;
  let scroll = 0;
  const point = event => {
    if (event.pointerType === "touch" && !event.buttons) return;
    const bounds = view.host.getBoundingClientRect();
    targetX = baseX + Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1)) * .13;
    targetY = baseY + Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1)) * .2;
    view.invalidate();
  };
  view.on(view.host, "pointermove", point, { passive: true });
  view.on(view.host, "pointerleave", () => { targetX = baseX; targetY = baseY; view.invalidate(); });
  view.on(view.host, "pointercancel", () => { targetX = baseX; targetY = baseY; view.invalidate(); });
  view.on(window, "scroll", () => {
    if (!view.visible) return;
    scroll = Math.max(-.1, Math.min(.1, view.host.getBoundingClientRect().top / innerHeight * .12));
    view.invalidate();
  }, { passive: true });
  return {
    rotate() { turn += Math.PI / 2; view.invalidate(); },
    update(alpha) {
      const x = targetX + scroll, y = targetY + turn;
      object.rotation.x += (x - object.rotation.x) * alpha;
      object.rotation.y += (y - object.rotation.y) * alpha;
      return Math.abs(x - object.rotation.x) + Math.abs(y - object.rotation.y) > .0004;
    }
  };
}

function heroScene(T, host) {
  const view = new DemandScene(T, host, host.querySelector("canvas"));
  const group = new T.Group();
  group.position.y = .25;
  view.scene.add(group);
  const lineMaterial = view.track(new T.LineBasicMaterial({ color: 0x8ab9a6, transparent: true, opacity: .72 }));
  const faintMaterial = view.track(new T.LineBasicMaterial({ color: 0x537d6d, transparent: true, opacity: .55 }));
  for (let i = 0; i < 3; i++) {
    const source = new T.BoxGeometry(2.5 - i * .45, 2.5 - i * .45, .12);
    const edges = view.track(new T.EdgesGeometry(source));
    source.dispose();
    const layer = new T.LineSegments(edges, i === 1 ? lineMaterial : faintMaterial);
    layer.position.z = (i - 1) * .72;
    layer.rotation.z = Math.PI / 4;
    group.add(layer);
  }
  const wire = [];
  const nodes = [];
  const count = compact() ? 8 : 16;
  for (let i = 0; i < count; i++) {
    const angle = i * Math.PI * 2 / count;
    const x = Math.cos(angle) * 1.45, y = Math.sin(angle) * 1.45;
    wire.push(x, y, -.72, x * .7, y * .7, .72);
    nodes.push(x, y, -.72, x * .7, y * .7, .72);
  }
  const wireGeometry = view.track(new T.BufferGeometry());
  wireGeometry.setAttribute("position", new T.Float32BufferAttribute(wire, 3));
  group.add(new T.LineSegments(wireGeometry, faintMaterial));
  const nodeGeometry = view.track(new T.BufferGeometry());
  nodeGeometry.setAttribute("position", new T.Float32BufferAttribute(nodes, 3));
  const points = view.track(new T.PointsMaterial({ color: 0xc6dfd4, size: compact() ? .05 : .04, sizeAttenuation: true }));
  group.add(new T.Points(nodeGeometry, points));
  const pointer = bindPointer(view, group, .25, -.45);
  view.update = alpha => pointer.update(alpha);
  const rotate = host.querySelector(".hero-inspect");
  rotate.hidden = false;
  view.on(rotate, "click", () => pointer.rotate());
  view.ready();
  return view;
}

function projectScene(T, host) {
  const view = new DemandScene(T, host, host.querySelector("canvas"));
  const group = new T.Group();
  group.position.y = .08;
  view.scene.add(group);
  const geometry = view.track(new T.PlaneGeometry(1, 1));
  const edgeGeometry = view.track(new T.EdgesGeometry(geometry));
  const border = view.track(new T.LineBasicMaterial({ color: 0x768f81 }));
  const planes = new Map();
  const pending = new Set();
  let desired = new Set();
  let selection = window.portfolioShowcase;
  const loader = new T.TextureLoader();
  const pointer = bindPointer(view, group, -.05, -.12);
  const hasActiveTexture = () => !!planes.get(selection?.active);
  async function loadPanel(project, index) {
    const path = project.previewImage || project.image;
    if (!path || planes.has(index) || pending.has(index)) return;
    pending.add(index);
    try {
      const texture = await loader.loadAsync(path);
      if (view.disposed || !desired.has(index)) { texture.dispose(); return; }
      view.track(texture);
      texture.colorSpace = T.SRGBColorSpace;
      texture.anisotropy = 1;
      const aspect = texture.image.width / texture.image.height;
      const material = view.track(new T.MeshBasicMaterial({ map: texture, color: 0xffffff, side: T.FrontSide }));
      const frame = new T.Group();
      const mesh = new T.Mesh(geometry, material);
      mesh.scale.set(4.5, 4.5 / aspect, 1);
      const outline = new T.LineSegments(edgeGeometry, border);
      outline.scale.copy(mesh.scale);
      outline.position.z = .008;
      frame.add(mesh, outline);
      frame.position.z = -1.5;
      group.add(frame);
      planes.set(index, { frame, material, texture });
      if (hasActiveTexture()) view.ready();
      view.invalidate();
    } catch {
      if (selection?.active === index) host.classList.remove("three-ready");
    } finally { pending.delete(index); }
  }
  function selected() {
    selection = window.portfolioShowcase;
    if (!selection) return;
    if (!hasActiveTexture()) host.classList.remove("three-ready");
    else view.ready();
    // At most the current panel and its next neighbor are kept in GPU memory.
    const position = selection.indices.indexOf(selection.active);
    const neighbor = selection.indices[(position + 1) % selection.indices.length];
    desired = new Set(compact() ? [selection.active] : [selection.active, neighbor]);
    for (const [index, panel] of planes) {
      if (desired.has(index)) continue;
      group.remove(panel.frame);
      panel.texture.dispose(); panel.material.dispose();
      view.resources.delete(panel.texture); view.resources.delete(panel.material);
      planes.delete(index);
    }
    desired.forEach(index => { if (selection.projects[index]) loadPanel(selection.projects[index], index); });
    view.invalidate();
  }
  view.on(document, "portfolio:showcase", selected);
  view.on(window, "resize", selected, { passive: true });
  view.update = alpha => {
    let moving = pointer.update(alpha);
    const mobile = compact();
    for (const [index, { frame, material }] of planes) {
      const active = index === selection?.active;
      frame.visible = active || (!mobile && selection?.indices.includes(index));
      const x = active ? -.15 : 3.3;
      const z = active ? .35 : -1.1;
      const angle = active ? 0 : -.3;
      const scale = active ? 1 : .78;
      const delta = Math.abs(x - frame.position.x) + Math.abs(z - frame.position.z) + Math.abs(angle - frame.rotation.y) + Math.abs(scale - frame.scale.x);
      frame.position.x += (x - frame.position.x) * alpha;
      frame.position.z += (z - frame.position.z) * alpha;
      frame.rotation.y += (angle - frame.rotation.y) * alpha;
      frame.scale.setScalar(frame.scale.x + (scale - frame.scale.x) * alpha);
      material.color.setScalar(active ? 1 : .63);
      moving ||= delta > .0005;
    }
    return moving;
  };
  document.querySelector("#showcase-hint").textContent = "Move to tilt · swipe to switch · or use the buttons below";
  selected();
  return view;
}

const factories = [["hero-scene", heroScene], ["project-scene", projectScene]];
const activeViews = new Map();
const initializing = new Set();
let generation = 0;
let exiting = false;
async function initialize(host, factory) {
  if (exiting || !motionAllowed() || activeViews.has(host.id) || initializing.has(host.id)) return;
  const attempt = generation;
  initializing.add(host.id);
  try {
    const T = await three();
    if (attempt !== generation || !motionAllowed()) return;
    activeViews.set(host.id, factory(T, host));
  } catch {
    host.classList.remove("three-ready");
    host.querySelector(".hero-inspect")?.setAttribute("hidden", "");
    records.set(host.id, { state: "static · 3D unavailable" });
    report();
  } finally {
    initializing.delete(host.id);
    if (!exiting && attempt !== generation && motionAllowed()) {
      const box = host.getBoundingClientRect();
      if (box.height && box.bottom > -160 && box.top < innerHeight + 160) initialize(host, factory);
    }
  }
}
const near = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const factory = factories.find(([id]) => id === entry.target.id)?.[1];
    if (factory) initialize(entry.target, factory);
  });
}, { rootMargin: "160px" });
factories.forEach(([id]) => { const host = document.getElementById(id); if (host) near.observe(host); });
document.addEventListener("portfolio:motion", () => {
  generation++;
  activeViews.forEach(view => view.dispose("static · reduced motion"));
  activeViews.clear();
  if (motionAllowed()) factories.forEach(([id, factory]) => {
    const host = document.getElementById(id);
    if (!host) return;
    const box = host.getBoundingClientRect();
    if (box.height && box.bottom > -160 && box.top < innerHeight + 160) initialize(host, factory);
  });
});
window.addEventListener("pagehide", event => {
  if (event.persisted) { activeViews.forEach(view => view.pause("page cached")); return; }
  exiting = true;
  generation++;
  near.disconnect();
  activeViews.forEach(view => view.dispose("disposed"));
  activeViews.clear();
});
window.addEventListener("pageshow", event => { if (event.persisted) activeViews.forEach(view => view.invalidate()); });
