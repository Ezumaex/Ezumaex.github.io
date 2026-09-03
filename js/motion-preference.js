/* The operating-system setting always takes precedence over a saved preference. */
(() => {
  const media = matchMedia("(prefers-reduced-motion: reduce)");
  // Local-only QA override: never changes the operating-system or production preference.
  const testMode = location.hostname === "127.0.0.1" ? new URLSearchParams(location.search).get("motionTest") : null;
  document.documentElement.classList.toggle("motion-test-full", testMode === "full");
  const systemReduced = () => testMode === "reduced" || (testMode !== "full" && media.matches);
  let saved = false;
  try { saved = localStorage.getItem("portfolio-reduce-motion") === "true"; } catch { /* Storage is optional. */ }
  const sync = () => {
    document.documentElement.classList.toggle("motion-off", systemReduced() || saved);
    document.dispatchEvent(new CustomEvent("portfolio:motion", { detail: { enabled: !systemReduced() && !saved } }));
  };
  window.portfolioMotion = {
    get enabled() { return !systemReduced() && !saved; },
    get systemReduced() { return systemReduced(); },
    setReduced(value) {
      saved = value;
      try { localStorage.setItem("portfolio-reduce-motion", String(value)); } catch { /* Private browsing still works. */ }
      sync();
    }
  };
  media.addEventListener("change", sync);
  sync();
})();
