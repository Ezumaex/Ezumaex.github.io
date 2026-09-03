/* Shared motion primitives. HTML is always visible before enhancement. */
(() => {
  const root = document.documentElement;
  const enabled = () => window.portfolioMotion?.enabled ?? false;
  const active = new Set();
  const current = new WeakMap();
  const registered = new Set();
  const entered = new WeakSet();
  const toggles = document.querySelectorAll(".motion-toggle");
  const ease = "cubic-bezier(.16,1,.3,1)";

  function enter(target, { distance = 22, duration = 660, delay = 0, scale = 1 } = {}) {
    if (!target || !enabled() || !target.animate || target.closest("[hidden]")) return;
    const bounds = target.getBoundingClientRect();
    if (bounds.bottom <= 0 || bounds.top >= innerHeight) return;
    current.get(target)?.cancel();
    const animation = target.animate([
      { opacity: .12, transform: `translate3d(0,${distance}px,0) scale(${scale})` },
      { opacity: 1, transform: "none" }
    ], { duration, delay, easing: ease });
    active.add(animation); current.set(target, animation);
    target.dataset.motionState = "running";
    const finished = () => {
      active.delete(animation);
      if (current.get(target) === animation) {
        current.delete(target);
        target.dataset.motionState = "settled";
      }
    };
    animation.finished.then(finished, finished);
    return animation;
  }
  function group(target, selector = ":scope > *", options = {}) {
    target?.querySelectorAll(selector).forEach((node, i) => enter(node, { ...options, delay: Math.min(i * 65, 260) }));
  }
  window.portfolioAnimate = { enter, group, get enabled() { return enabled(); } };

  const selectors = ".hero-copy > *, .section-heading, .summary-content > p, .quick-facts > div, .skill-groups > section, .timeline-item, .education-card, .project-showcase, .project-card, .contribution-card, .certificate-explorer, .certificate-card, .resume-viewer, .contact-section > h2, .contact-section > p, .contact-grid > a";
  const observer = "IntersectionObserver" in window ? new IntersectionObserver(entries => {
    entries.forEach(({ target, isIntersecting }) => {
      if (!isIntersecting) return;
      target.classList.add("is-visible");
      if (!enabled() || entered.has(target)) return;
      entered.add(target);
      const siblings = [...target.parentElement.children].filter(item => item.matches(selectors));
      const delay = Math.min(Math.max(0, siblings.indexOf(target)) * 65, 260);
      enter(target, { delay, distance: target.closest(".hero-copy") ? 18 : 24 });
    });
  }, { threshold: .05, rootMargin: "0px 0px -5%" }) : null;

  const progressObserver = "IntersectionObserver" in window ? new IntersectionObserver(entries => {
    entries.forEach(({ target, isIntersecting }) => {
      target.classList.toggle("is-current", isIntersecting);
      if (!isIntersecting) return;
      target.classList.add("is-activated");
      const timeline = target.closest(".timeline");
      if (timeline) {
        const steps = [...timeline.querySelectorAll(".timeline-item")];
        const progress = (steps.indexOf(target) + 1) / steps.length;
        timeline.style.setProperty("--timeline-progress", String(Math.max(Number(timeline.dataset.progress || 0), progress)));
        timeline.dataset.progress = String(Math.max(Number(timeline.dataset.progress || 0), progress));
      }
    });
  }, { threshold: 0, rootMargin: "-16% 0px -30%" }) : null;
  const progressSeen = new WeakSet();
  function observeContent() {
    // Drop detached cards rather than retaining a growing collection after filters.
    registered.forEach(node => { if (!node.isConnected) { observer?.unobserve(node); registered.delete(node); } });
    document.querySelectorAll(selectors).forEach(node => {
      if (registered.has(node)) return;
      registered.add(node);
      observer?.observe(node);
    });
    document.querySelectorAll(".timeline-item, .contribution-step").forEach(node => {
      if (progressSeen.has(node)) return;
      progressSeen.add(node);
      progressObserver?.observe(node);
    });
  }
  function sync() {
    root.classList.toggle("motion-enhanced", enabled());
    toggles.forEach(button => {
      button.hidden = false;
      button.setAttribute("aria-pressed", String(!enabled()));
      button.textContent = window.portfolioMotion?.systemReduced ? "Reduced motion · system" : enabled() ? "Reduce motion" : "Enable motion";
      button.disabled = !!window.portfolioMotion?.systemReduced;
    });
    if (!enabled()) active.forEach(animation => animation.cancel());
    else registered.forEach(node => { if (!entered.has(node)) { observer?.unobserve(node); observer?.observe(node); } });
  }
  toggles.forEach(button => button.addEventListener("click", () => window.portfolioMotion?.setReduced(enabled())));
  document.addEventListener("portfolio:motion", sync);
  document.addEventListener("portfolio:content", observeContent);
  document.addEventListener("portfolio:skill", () => group(document.querySelector("#skill-evidence-panel"), ":scope > *", { distance: 12, duration: 470 }));
  document.addEventListener("portfolio:showcase", () => {
    group(document.querySelector(".showcase-caption"), ":scope > *", { distance: 16, duration: 600 });
    enter(document.querySelector("#showcase-fallback"), { distance: 12, duration: 680, scale: .965 });
  });
  document.addEventListener("portfolio:certificate", () => {
    group(document.querySelector(".certificate-inspector-copy"), ":scope > *", { distance: 10, duration: 460 });
  });
  document.addEventListener("toggle", event => {
    if (!event.target.open) return;
    const body = event.target.querySelector(".project-details, .contribution-detail, .home-certificate-details");
    enter(body, { distance: -8, duration: 380 });
    if (body?.classList.contains("project-details")) group(body.querySelector(".architecture-flow"), ":scope > li", { distance: 7, duration: 460 });
  }, true);
  // The certificate library also announces rendered cards; no broad DOM observer needed.
  sync(); observeContent();
  window.addEventListener("pagehide", event => {
    if (!event.persisted) {
      observer?.disconnect(); progressObserver?.disconnect();
      active.forEach(animation => animation.cancel());
      registered.clear();
    }
  });
})();
