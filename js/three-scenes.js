/* Three.js r185: a bounded radar scan + demand-rendered project panels. */
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
    if (this.width !== width || this.height !== height || this.bufferRatio !== this.ratio) {
      this.renderer.setPixelRatio(this.ratio);
      this.renderer.setSize(width, height, false);
      this.width = width; this.height = height; this.bufferRatio = this.ratio;
    }
    if (this.onResize) this.onResize(width, height);
    else {
      this.camera.aspect = width / height;
      this.camera.position.z = 7.8;
    }
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
      const moving = this.update?.(alpha, Math.min(interval, 50)) || false;
      this.renderer.render(this.scene, this.camera);
      if (this.wantsReady && (this.canPresent?.() ?? true) && !this.host.classList.contains("three-ready")) {
        this.host.classList.add("three-ready");
        this.onReady?.();
      }
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
        Object.assign(this.state, this.metrics?.());
        this.state.textureMiB = +(Array.from(this.resources).filter(item => item.isTexture).reduce((total, item) => total + (item.image?.width || 0) * (item.image?.height || 0) * 4 * 4 / 3, 0) / 1048576).toFixed(2);
        this.state.jsHeapMiB = performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : "unavailable";
      }
      records.set(this.host.id, this.state);
      if (debug && (!moving || this.frames % 20 === 0)) report();
      this.dirty = moving;
      if (moving) this.invalidate();
      else this.lastTime = 0;
    } catch (error) { if (debug) this.state.error = error.message; this.dispose("static · renderer unavailable"); }
  }
  ready() {
    if (this.disposed) return;
    this.wantsReady = true;
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
    this.onDispose?.();
    if (this.host.id === "project-scene") document.querySelector("#showcase-hint").textContent = "Use the project buttons below to explore.";
    this.resizeObserver.disconnect();
    this.visibilityObserver.disconnect();
    this.listeners.abort();
    this.resources.forEach(resource => resource.dispose());
    this.resources.clear();
    this.scene.clear();
    this.renderer.dispose();
    records.set(this.host.id, this.state);
    report();
    // Preserve the canvas context so turning motion back on can reuse it safely.
  }
}

function bindPointer(view, object, baseX = .2, baseY = -.35) {
  let targetX = baseX;
  let targetY = baseY;
  let turn = 0;
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
  return {
    rotate() { turn += Math.PI / 2; view.invalidate(); },
    update(alpha) {
      const x = targetX, y = targetY + turn;
      object.rotation.x += (x - object.rotation.x) * alpha;
      object.rotation.y += (y - object.rotation.y) * alpha;
      return Math.abs(x - object.rotation.x) + Math.abs(y - object.rotation.y) > .0004;
    }
  };
}

// A finite sweep advances only when DemandScene actually renders a visible frame.
function createRadarClock(duration = 4800) {
  let elapsed = duration;
  return {
    start() { elapsed = 0; },
    advance(delta) { elapsed = Math.min(duration, elapsed + Math.max(0, Math.min(delta, 50))); return elapsed < duration; },
    get running() { return elapsed < duration; },
    get angle() { return Math.PI / 2 - (elapsed / duration) * Math.PI * 2; },
    get elapsed() { return elapsed; }
  };
}

function heroScene(T, host) {
  const view = new DemandScene(T, host, host.querySelector("canvas"));
  view.camera = new T.OrthographicCamera(-1.111, 1.111, 1.111, -1.111, .1, 20);
  view.camera.position.z = 5;
  view.onResize = (width, height) => {
    const aspect = width / height;
    view.camera.left = -1.111 * aspect; view.camera.right = 1.111 * aspect;
    view.camera.top = 1.111; view.camera.bottom = -1.111;
  };
  view.resize();
  const group = new T.Group();
  view.scene.add(group);
  const ringVertices = [];
  const segments = compact() ? 64 : 96;
  for (const radius of [.24, .5, .74, .94]) {
    for (let i = 0; i < segments; i++) {
      const a = i / segments * Math.PI * 2, b = (i + 1) / segments * Math.PI * 2;
      ringVertices.push(Math.cos(a) * radius, Math.sin(a) * radius, -.03, Math.cos(b) * radius, Math.sin(b) * radius, -.03);
    }
  }
  for (let i = 0; i < 48; i++) {
    const angle = i / 48 * Math.PI * 2, radius = i % 4 ? .965 : .985;
    ringVertices.push(Math.cos(angle) * .94, Math.sin(angle) * .94, -.03, Math.cos(angle) * radius, Math.sin(angle) * radius, -.03);
  }
  const ringGeometry = view.track(new T.BufferGeometry());
  ringGeometry.setAttribute("position", new T.Float32BufferAttribute(ringVertices, 3));
  group.add(new T.LineSegments(ringGeometry, view.track(new T.LineBasicMaterial({ color: 0x9bb5a1, transparent: true, opacity: .48 }))));
  const axes = view.track(new T.BufferGeometry());
  axes.setAttribute("position", new T.Float32BufferAttribute([-.94, 0, -.04, .94, 0, -.04, 0, -.94, -.04, 0, .94, -.04], 3));
  group.add(new T.LineSegments(axes, view.track(new T.LineBasicMaterial({ color: 0x8ba899, transparent: true, opacity: .24 }))));

  const sweep = new T.Group();
  const positions = [], colors = [];
  const steps = compact() ? 24 : 40;
  for (let i = 0; i < steps; i++) {
    const a = i / steps * .95, b = (i + 1) / steps * .95;
    positions.push(0, 0, .015, Math.cos(a) * .925, Math.sin(a) * .925, .015, Math.cos(b) * .925, Math.sin(b) * .925, .015);
    const fade = (1 - i / steps) * .75;
    for (let vertex = 0; vertex < 3; vertex++) colors.push(.64 * fade, .84 * fade, .7 * fade);
  }
  const sweepGeometry = view.track(new T.BufferGeometry());
  sweepGeometry.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  sweepGeometry.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
  const sweepMaterial = view.track(new T.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: .3, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide }));
  sweep.add(new T.Mesh(sweepGeometry, sweepMaterial));
  const beamGeometry = view.track(new T.BufferGeometry());
  beamGeometry.setAttribute("position", new T.Float32BufferAttribute([0, 0, .022, .925, 0, .022], 3));
  const beamMaterial = view.track(new T.LineBasicMaterial({ color: 0xd1ead5, transparent: true, opacity: .8 }));
  sweep.add(new T.Line(beamGeometry, beamMaterial));
  group.add(sweep);

  const dotGeometry = view.track(new T.CircleGeometry(.018, 12));
  const dotMaterial = view.track(new T.MeshBasicMaterial({ color: 0xffffff }));
  const matrix = new T.Matrix4();
  const color = new T.Color();
  const baseColor = new T.Color(0x6a9278), activeColor = new T.Color(0xe0f0dc);
  let dotMesh = null, nodes = [], selectedName = "";
  function updateNodes() {
    nodes = window.portfolioRadar?.nodes || [];
    selectedName = window.portfolioRadar?.selection?.name || "";
    if (dotMesh) { group.remove(dotMesh); dotMesh.dispose(); view.resources.delete(dotMesh); }
    dotMesh = view.track(new T.InstancedMesh(dotGeometry, dotMaterial, Math.max(1, nodes.length)));
    dotMesh.count = nodes.length;
    nodes.forEach((node, index) => {
      matrix.makeTranslation(node.x, node.y, .035);
      dotMesh.setMatrixAt(index, matrix); dotMesh.setColorAt(index, baseColor);
    });
    if (nodes.length) { dotMesh.instanceMatrix.needsUpdate = true; dotMesh.instanceColor.needsUpdate = true; }
    group.add(dotMesh);
    view.invalidate();
  }
  const clock = createRadarClock(window.portfolioRadar?.duration || 4800);
  if (window.portfolioRadar?.scanning) clock.start();
  const pointer = bindPointer(view, group, 0, 0);
  view.on(document, "portfolio:radar-ready", updateNodes);
  view.on(document, "portfolio:radar-selection", event => { selectedName = event.detail.name; view.invalidate(); });
  view.on(document, "portfolio:radar-scan", () => { clock.start(); view.invalidate(); });
  view.onReady = () => window.portfolioRadar?.useWebGL(true);
  view.onDispose = () => window.portfolioRadar?.useWebGL(false);
  view.metrics = () => ({ scanRunning: clock.running, scanAngle: +((clock.angle * 180 / Math.PI + 360) % 360).toFixed(1), scanElapsed: Math.round(clock.elapsed) });
  view.update = (alpha, delta) => {
    const wasRunning = clock.running;
    const scanning = clock.advance(delta);
    const moving = pointer.update(alpha);
    sweep.rotation.z = clock.angle;
    sweepMaterial.opacity = scanning ? .32 : .07;
    beamMaterial.opacity = scanning ? .8 : .28;
    nodes.forEach((node, index) => {
      const lag = (Math.atan2(node.y, node.x) - clock.angle + Math.PI * 4) % (Math.PI * 2);
      const detected = scanning ? Math.max(0, 1 - lag / .85) : 0;
      color.copy(baseColor).lerp(activeColor, node.name === selectedName ? 1 : detected);
      dotMesh.setColorAt(index, color);
    });
    if (nodes.length) dotMesh.instanceColor.needsUpdate = true;
    if (wasRunning && !scanning) window.portfolioRadar?.finish();
    return scanning || moving;
  };
  updateNodes();
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
  const pointer = bindPointer(view, group, -.025, -.055);
  view.onResize = (width, height) => {
    view.camera.aspect = width / height;
    // Fit the panel in both portrait and landscape without clipping its text.
    const viewHeight = Math.max(4.4, 6.4 / view.camera.aspect);
    view.camera.position.z = viewHeight / (2 * Math.tan(Math.PI / 10)) + .35;
  };
  view.resize();
  const hasActiveTexture = () => !!planes.get(selection?.active);
  view.canPresent = hasActiveTexture;
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
      mesh.scale.set(5.45, 5.45 / aspect, 1);
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
      const x = active ? -.08 : 4;
      const z = active ? .35 : -1.6;
      const angle = active ? 0 : -.38;
      const scale = active ? 1 : .74;
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
  } catch (error) {
    host.classList.remove("three-ready");
    records.set(host.id, { state: "static · 3D unavailable", ...(debug ? { error: error.message } : {}) });
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
