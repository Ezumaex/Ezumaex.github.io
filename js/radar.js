/* Semantic skill controls + a bounded CSS scan when WebGL is unavailable. */
(() => {
  const host = document.querySelector("#hero-scene");
  if (!host) return;
  const nodes = document.querySelector("#radar-nodes");
  const readout = document.querySelector("#radar-readout");
  const status = document.querySelector("#radar-status");
  const scanButton = document.querySelector("#radar-scan");
  const evidenceLink = document.querySelector("#radar-evidence");
  const enabled = () => window.portfolioMotion?.enabled ?? false;
  // Coordinates are composition, never a measurement of proficiency.
  const layout = [
    { name: "React", label: "React", x: .38, y: .62 },
    { name: "Node.js", label: "Node.js", x: .74, y: .02 },
    { name: "ESP32 & MQTT", label: "ESP32 / MQTT", x: .4, y: -.62 },
    { name: "VB.NET & SQL Server", label: "VB.NET / SQL", x: -.4, y: -.62 },
    { name: "Networking", label: "Networking", x: -.74, y: .02 },
    { name: "Java", label: "Java", x: -.38, y: .62 }
  ];
  let mapped = [], selected = null, scanning = false, webgl = false;
  let visible = false, started = false, fallback = null;
  const duration = matchMedia("(max-width: 768px), (pointer: coarse)").matches ? 3600 : 4800;

  function finish() {
    scanning = false;
    host.dataset.scan = enabled() ? "idle" : "reduced";
    status.textContent = enabled() ? "Select a skill" : "Reduced motion";
    scanButton.textContent = "Run scan ↻";
  }
  function cancelFallback() { fallback?.cancel(); fallback = null; }
  function syncPlayback() {
    if (!fallback) return;
    if (visible && !document.hidden && enabled()) fallback.play();
    else fallback.pause();
  }
  function fallbackScan() {
    cancelFallback();
    if (webgl || !scanning || !enabled()) return;
    const sweep = host.querySelector(".radar-sweep");
    if (!sweep.animate) { finish(); return; }
    const animation = sweep.animate([
      { transform: "rotate(-90deg)", opacity: .9 },
      { transform: "rotate(270deg)", opacity: .9 }
    ], { duration, easing: "linear" });
    fallback = animation;
    animation.onfinish = () => { if (fallback === animation) { fallback = null; finish(); } };
    syncPlayback();
  }
  function scan() {
    if (!enabled()) return;
    scanning = true;
    host.dataset.scan = "running";
    status.textContent = "Scanning skill map";
    scanButton.textContent = "Restart scan ↻";
    document.dispatchEvent(new CustomEvent("portfolio:radar-scan"));
    fallbackScan();
  }
  function select(node, broadcast = true) {
    if (!node) return;
    const changed = selected?.name !== node.name;
    selected = node;
    host.dataset.skill = node.name;
    nodes.querySelectorAll("button").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.skill === node.name)));
    const skill = node.skill;
    const personal = skill.personal || [], experience = skill.experience || [], learning = skill.learning || [];
    const evidence = personal[0] || experience[0] || learning[0];
    document.querySelector("#radar-context").textContent = personal.length ? "Project evidence" : experience.length ? "Professional / team evidence" : "Learning evidence";
    document.querySelector("#radar-skill").textContent = skill.name;
    document.querySelector("#radar-detail").textContent = evidence ? `${evidence.title} · ${evidence.detail}` : "Explore the supporting evidence below.";
    evidenceLink.href = personal.length ? "#work" : "#skills";
    evidenceLink.textContent = personal.length ? "Explore related projects ↓" : "Explore skill evidence ↓";
    if (changed) window.portfolioAnimate?.enter(readout, { distance: 8, duration: 340 });
    document.dispatchEvent(new CustomEvent("portfolio:radar-selection", { detail: node }));
    if (broadcast) document.dispatchEvent(new CustomEvent("portfolio:skill-request", { detail: skill }));
  }
  function syncMotion() {
    scanButton.hidden = !enabled();
    if (!enabled()) { cancelFallback(); finish(); }
    else if (visible) { started = true; scan(); }
  }
  window.portfolioRadar = {
    get nodes() { return mapped; }, get selection() { return selected; },
    get scanning() { return scanning; }, duration,
    finish,
    useWebGL(value) {
      webgl = value;
      host.dataset.renderer = value ? "webgl" : "html";
      if (value) cancelFallback(); else fallbackScan();
    }
  };
  scanButton.addEventListener("click", scan);
  evidenceLink.addEventListener("click", () => {
    if (selected) document.dispatchEvent(new CustomEvent("portfolio:skill-request", { detail: selected.skill }));
  });
  document.addEventListener("portfolio:skills", event => {
    mapped = layout.map(node => ({ ...node, skill: event.detail.find(skill => skill.name === node.name) })).filter(node => node.skill);
    nodes.replaceChildren(...mapped.map(node => {
      const button = document.createElement("button");
      button.type = "button"; button.className = "radar-node";
      button.dataset.skill = node.name;
      button.style.setProperty("--node-x", `${50 + node.x * 45}%`);
      button.style.setProperty("--node-y", `${50 - node.y * 45}%`);
      button.setAttribute("aria-label", `Explore ${node.name} evidence`);
      button.setAttribute("aria-pressed", "false");
      const point = document.createElement("i"); point.setAttribute("aria-hidden", "true");
      const label = document.createElement("span"); label.textContent = node.label;
      button.append(point, label);
      button.addEventListener("click", () => { select(node); scan(); });
      return button;
    }));
    select(mapped[0], false);
    document.dispatchEvent(new CustomEvent("portfolio:radar-ready"));
  });
  nodes.addEventListener("keydown", event => {
    const keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"];
    if (!keys.includes(event.key) || !mapped.length) return;
    event.preventDefault();
    const current = mapped.findIndex(node => node.name === event.target.dataset.skill);
    const direction = ["ArrowLeft", "ArrowUp"].includes(event.key) ? -1 : 1;
    const index = event.key === "Home" ? 0 : event.key === "End" ? mapped.length - 1 : (current + direction + mapped.length) % mapped.length;
    nodes.children[index].focus();
    select(mapped[index]);
  });
  document.addEventListener("portfolio:skill", event => {
    const node = mapped.find(item => item.name === event.detail.name);
    if (node && selected?.name !== node.name) select(node, false);
  });
  document.addEventListener("portfolio:motion", syncMotion);
  document.addEventListener("visibilitychange", syncPlayback);
  const observer = "IntersectionObserver" in window ? new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible && !started && enabled()) { started = true; scan(); }
    syncPlayback();
  }) : null;
  if (observer) observer.observe(host); else visible = true;
  syncMotion();
  window.addEventListener("pagehide", event => {
    if (event.persisted) fallback?.pause();
    else { cancelFallback(); observer?.disconnect(); }
  });
  window.addEventListener("pageshow", event => { if (event.persisted) syncPlayback(); });
})();
