/* DOM interactions are independent of the optional WebGL module. */
(() => {
  const enabled = () => window.portfolioMotion?.enabled ?? !matchMedia("(prefers-reduced-motion: reduce)").matches;
  const root = document.documentElement;
  root.classList.toggle("motion-enhanced", enabled());
  const toggles = document.querySelectorAll(".motion-toggle");
  function sync() {
    root.classList.toggle("motion-enhanced", enabled());
    toggles.forEach(button => {
      button.hidden = false;
      button.setAttribute("aria-pressed", String(!enabled()));
      button.textContent = window.portfolioMotion?.systemReduced ? "Reduced motion · system" : "Reduce motion";
      button.disabled = !!window.portfolioMotion?.systemReduced;
    });
    if (!enabled()) document.getAnimations().forEach(animation => {
      try { animation.finish(); } catch { animation.cancel(); }
    });
  }
  toggles.forEach(button => button.addEventListener("click", () => window.portfolioMotion?.setReduced(enabled())));
  document.addEventListener("portfolio:motion", sync);
  sync();

  // Native disclosures retain keyboard behavior; animate only newly visible content.
  document.addEventListener("toggle", event => {
    if (!enabled() || !event.target.open) return;
    const body = event.target.querySelector(".project-details, .home-certificate-details");
    body?.animate([{ opacity: .25, transform: "translateY(-6px)" }, { opacity: 1, transform: "none" }], { duration: 240, easing: "ease-out" });
  }, true);
  const seen = new WeakSet();
  const selectors = ".project-card, .home-certificate-card, .certificate-card, .timeline-item, .contribution-card";
  const observer = "IntersectionObserver" in window ? new IntersectionObserver(entries => {
    entries.forEach(({ target, isIntersecting }) => {
      if (!isIntersecting) return;
      observer.unobserve(target);
      if (enabled()) target.animate([{ opacity: .35, transform: "translateY(12px)" }, { opacity: 1, transform: "none" }], { duration: 420, delay: Number(target.dataset.stagger || 0), easing: "cubic-bezier(.2,.8,.2,1)" });
    });
  }, { threshold: 0, rootMargin: "0px 0px -24px" }) : null;
  function observeCards() {
    document.querySelectorAll(selectors).forEach((card, index) => {
      if (seen.has(card)) return;
      seen.add(card);
      card.dataset.stagger = String((index % 3) * 55);
      observer?.observe(card);
    });
  }
  const changes = new MutationObserver(observeCards);
  ["project-grid", "home-certificate-grid", "certificate-grid", "contribution-grid"].forEach(id => {
    const grid = document.getElementById(id);
    if (grid) changes.observe(grid, { childList: true });
  });
  observeCards();
  document.addEventListener("portfolio:skill", () => {
    if (enabled()) document.querySelector("#skill-evidence-panel")?.animate([{ opacity: .5, transform: "translateY(5px)" }, { opacity: 1, transform: "none" }], { duration: 220, easing: "ease-out" });
  });
  window.addEventListener("pagehide", event => { if (!event.persisted) { observer?.disconnect(); changes.disconnect(); } });
})();
